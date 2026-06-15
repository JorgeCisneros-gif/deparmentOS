import base64
import logging
import os
import re
from typing import List, Optional, Tuple

import cv2
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv()

# ==============================
# CONFIGURACIÓN
# ==============================
OCR_ENGINE = os.getenv("OCR_ENGINE", "easyocr").strip().lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

VALID_ENGINES = {"easyocr", "groq"}
if OCR_ENGINE not in VALID_ENGINES:
    raise RuntimeError(f"OCR_ENGINE='{OCR_ENGINE}' inválido. Valores aceptados: {VALID_ENGINES}")

if OCR_ENGINE == "groq" and not GROQ_API_KEY:
    raise RuntimeError("OCR_ENGINE=groq requiere GROQ_API_KEY en el .env")

# ==============================
# LOGGING
# ==============================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("meter_ocr")
log.info("Motor seleccionado: %s", OCR_ENGINE.upper())

# ==============================
# CARGA CONDICIONAL DE EASYOCR
# ==============================
READER = None
if OCR_ENGINE == "easyocr":
    import easyocr
    log.info("Cargando modelo EasyOCR…")
    READER = easyocr.Reader(["en"], gpu=False, verbose=False)
    log.info("Modelo EasyOCR listo")

# ==============================
# APP FASTAPI
# ==============================
app = FastAPI(
    title="OCR Meter Reader API",
    description="Lectura de medidores — EasyOCR local o Groq Vision",
    version="9.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class OCRResponse(BaseModel):
    success: bool
    text: str
    digits_only: str
    confidence: Optional[float] = None
    message: str


# ==============================
# TEMPLATES (fallback EasyOCR)
# ==============================
def _build_templates() -> dict:
    t = {}
    for d in range(10):
        img = np.zeros((60, 40), dtype=np.uint8)
        cv2.putText(img, str(d), (2, 52), cv2.FONT_HERSHEY_DUPLEX, 1.6, 255, 2)
        t[str(d)] = img
    return t

TEMPLATES = _build_templates()


# ==============================
# PREPARACIÓN DEL ROI (compartido)
# ==============================
def _find_vertical_dividers(img_bgr: np.ndarray) -> Optional[List[int]]:
    h = img_bgr.shape[0]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    col_dark = (gray < 80).sum(axis=0)
    dark_cols = np.where(col_dark > h * 0.40)[0]

    if len(dark_cols) < 3:
        return None

    groups: List[int] = []
    g = [int(dark_cols[0])]
    for x in dark_cols[1:]:
        if x - g[-1] <= 3:
            g.append(int(x))
        else:
            groups.append(int(round(sum(g) / len(g))))
            g = [int(x)]
    groups.append(int(round(sum(g) / len(g))))

    return groups if len(groups) >= 3 else None


def detect_display(img_bgr: np.ndarray) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    log.info("Imagen recibida: %dx%d", w, h)

    groups = _find_vertical_dividers(img_bgr)

    if groups and len(groups) >= 4:
        n_cells = min(5, len(groups) - 1)
        x_start = groups[0]
        x_end = groups[n_cells] + 1 if n_cells < len(groups) else w

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        row_dark = (gray < 80).sum(axis=1)
        border_rows = np.where(row_dark > w * 0.20)[0]
        y_start = int(border_rows[0]) if len(border_rows) >= 1 else 0
        y_end = int(border_rows[-1]) + 1 if len(border_rows) >= 2 else h

        display = img_bgr[y_start:y_end, x_start:x_end]
        dh, dw = display.shape[:2]

        scale_s = max(1.0, 200.0 / dh)
        if scale_s > 1.0:
            display = cv2.resize(display, None, fx=scale_s, fy=scale_s,
                                 interpolation=cv2.INTER_CUBIC)

        log.info("ROI bordado: %d divisores → %d celdas, orig %dx%d → %dx%d",
                 len(groups), n_cells, dw, dh, display.shape[1], display.shape[0])
        cv2.imwrite("debug_roi.png", display)
        return display

    scale_s = max(1.0, 200.0 / h)
    if scale_s > 1.0:
        img_bgr = cv2.resize(img_bgr, None, fx=scale_s, fy=scale_s,
                             interpolation=cv2.INTER_CUBIC)
        h, w = img_bgr.shape[:2]
        log.info("Tira escalada a %dx%d", w, h)

    int_w = int(w * 5 / 8)
    display = img_bgr[:, :int_w]
    log.info("ROI fallback 5/8: %dx%d", display.shape[1], display.shape[0])
    cv2.imwrite("debug_roi.png", display)
    return display


# ==============================
# ENGINE: GROQ VISION
# ==============================
def _encode_image_b64(img_bgr: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


GROQ_PROMPT = (
    "Analiza la imagen del medidor de agua. "
    "REGLAS ESTRICTAS:\n"
    "- El display tiene casillas con dígitos. Las primeras 5 casillas tienen dígitos en color NEGRO.\n"
    "- Las casillas restantes (color rojo, naranja o amarillo) son decimales: IGNÓRALAS completamente.\n"
    "- Lee ÚNICAMENTE los 5 primeros dígitos negros, de izquierda a derecha.\n"
    "- NO incluyas decimales, NO redondees, NO agregues dígitos extra.\n"
    "- La respuesta debe tener EXACTAMENTE 5 caracteres numéricos en 'text' y 'digits_only'.\n\n"
    "Responde SOLO con este JSON (sin texto extra, sin backticks):\n"
    '{"success": true, "text": "XXXXX", "digits_only": "XXXXX", "confidence": 0.95, "message": "Lectura exitosa"}'
)


def read_with_groq(image_bytes: bytes) -> Tuple[str, float, str]:
    import json
    import urllib.error
    import urllib.request

    log.info("Enviando imagen a Groq Vision (%d bytes)…", len(image_bytes))

    b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": GROQ_MODEL,
        "max_tokens": 200,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                    {"type": "text", "text": GROQ_PROMPT},
                ],
            }
        ],
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Groq HTTP {e.code}: {err_body}") from e

    raw_text = body["choices"][0]["message"]["content"].strip()
    log.info("Groq raw response: %s", raw_text)

    try:
        result = json.loads(raw_text)
        digits = re.sub(r"[^0-9]", "", str(result.get("digits_only", "")))[:5]
        conf = float(result.get("confidence", 0.9))
        msg = result.get("message", "Lectura Groq")
    except (json.JSONDecodeError, KeyError, ValueError):
        digits = re.sub(r"[^0-9]", "", raw_text)[:5]
        conf = 0.75
        msg = "Lectura Groq (parse fallback)"

    if not digits:
        raise RuntimeError(f"Groq no retornó dígitos válidos. Respuesta: {raw_text}")

    digits = digits.zfill(5) if len(digits) < 5 else digits
    log.info("Groq resultado: '%s' conf=%.2f", digits, conf)
    return digits, conf, "groq_vision"


# ==============================
# ENGINE: EASYOCR
# ==============================
def _run_easyocr(
    img_bgr: np.ndarray,
    text_threshold: float = 0.30,
    low_text: float = 0.20,
    mag_ratio: float = 1.8,
    link_threshold: float = 0.25,
    min_conf: float = 0.20,
) -> Tuple[str, float]:
    results = READER.readtext(
        img_bgr,
        allowlist="0123456789",
        detail=1,
        paragraph=False,
        min_size=6,
        contrast_ths=0.10,
        adjust_contrast=0.5,
        text_threshold=text_threshold,
        low_text=low_text,
        link_threshold=link_threshold,
        canvas_size=2560,
        mag_ratio=mag_ratio,
    )

    items = []
    for bbox, text, conf in results:
        digits = re.sub(r"[^0-9]", "", text)
        if not digits or conf < min_conf:
            continue
        xs = [pt[0] for pt in bbox]
        items.append({
            "digits": digits,
            "conf": float(conf),
            "x": float(np.mean(xs)),
        })

    if not items:
        return "", 0.0

    items.sort(key=lambda i: i["x"])
    digits = "".join(i["digits"] for i in items)
    conf = float(np.mean([i["conf"] for i in items]))
    return digits, conf


def _read_strip_cells(strip_bgr: np.ndarray, n_cells: int = 5) -> Tuple[str, float]:
    _, w = strip_bgr.shape[:2]
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))

    groups = _find_vertical_dividers(strip_bgr)
    cells: List[tuple] = []

    if groups and len(groups) >= n_cells:
        divs = groups[:n_cells + 1]
        cells = [(divs[i] + 1, divs[i + 1]) for i in range(len(divs) - 1)
                 if divs[i + 1] - divs[i] > 5]
        cells = cells[:n_cells]
        log.info("Celdas por divisores: %s anchos=%s",
                 cells, [x2 - x1 for x1, x2 in cells])

    if len(cells) < 2:
        cell_w = w // n_cells
        cells = [(max(0, i * cell_w + 5), min(w, (i + 1) * cell_w))
                 for i in range(n_cells)]
        log.info("Celdas por ancho fijo (fallback): anchos=%s",
                 [x2 - x1 for x1, x2 in cells])

    digits_out: list = []
    confs_out: list = []

    for i, (x1, x2) in enumerate(cells):
        cell = strip_bgr[:, x1:x2]
        gray_c = clahe.apply(cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY))
        gray_bgr = cv2.cvtColor(gray_c, cv2.COLOR_GRAY2BGR)
        d, c = _run_easyocr(gray_bgr, mag_ratio=2.5,
                             text_threshold=0.20, low_text=0.15, min_conf=0.10)

        if not d or c < 0.10:
            d, c = _run_easyocr(cell, mag_ratio=2.5,
                                 text_threshold=0.20, low_text=0.15, min_conf=0.10)

        first = d[0] if d else "?"
        digits_out.append(first)
        confs_out.append(c if c > 0 else 0.0)
        log.info("  Celda %d (x=%d..%d): '%s' conf=%.2f", i + 1, x1, x2, first, c)

    valid_confs = [c for c in confs_out if c > 0]
    result = "".join(ch for ch in digits_out if ch != "?")
    avg_conf = float(np.mean(valid_confs)) if valid_confs else 0.0
    return result, avg_conf


def read_with_easyocr_pipeline(roi_bgr: np.ndarray) -> Tuple[str, float]:
    h, _ = roi_bgr.shape[:2]
    scale = max(1.0, 150.0 / h)
    if scale > 1.0:
        roi_bgr = cv2.resize(roi_bgr, None, fx=scale, fy=scale,
                              interpolation=cv2.INTER_CUBIC)

    cv2.imwrite("debug_easyocr_input.png", roi_bgr)
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))

    digits_a, conf_a = _run_easyocr(roi_bgr)
    log.info("EasyOCR pasada A: '%s' conf=%.2f", digits_a, conf_a)
    if len(digits_a) >= 5 and conf_a >= 0.60:
        return digits_a, conf_a

    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    gray_enh = clahe.apply(gray)
    gray_bgr = cv2.cvtColor(gray_enh, cv2.COLOR_GRAY2BGR)
    cv2.imwrite("debug_easyocr_clahe.png", gray_bgr)
    digits_b, conf_b = _run_easyocr(gray_bgr)
    log.info("EasyOCR pasada B (gray+CLAHE): '%s' conf=%.2f", digits_b, conf_b)

    _, thresh = cv2.threshold(gray_enh, 0, 255,
                               cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh_bgr = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    cv2.imwrite("debug_easyocr_thresh.png", thresh_bgr)
    digits_c, conf_c = _run_easyocr(thresh_bgr)
    log.info("EasyOCR pasada C (gray+CLAHE+Otsu): '%s' conf=%.2f", digits_c, conf_c)

    digits_d, conf_d = _run_easyocr(gray_bgr, mag_ratio=3.5,
                                     text_threshold=0.20, low_text=0.15,
                                     min_conf=0.15)
    log.info("EasyOCR pasada D (mag=3.5): '%s' conf=%.2f", digits_d, conf_d)

    log.info("EasyOCR pasada E (celdas individuales):")
    digits_e, conf_e = _read_strip_cells(roi_bgr, n_cells=5)
    log.info("EasyOCR pasada E resultado: '%s' conf=%.2f", digits_e, conf_e)

    candidates = [
        (digits_a, conf_a),
        (digits_b, conf_b),
        (digits_c, conf_c),
        (digits_d, conf_d),
        (digits_e, conf_e),
    ]

    five_digit = [(d, c) for d, c in candidates if len(d) == 5 and c >= 0.20]
    if five_digit:
        return max(five_digit, key=lambda x: x[1])

    good = [(d, c) for d, c in candidates if c >= 0.25]
    pool = good if good else candidates
    return max(pool, key=lambda x: len(x[0]) * x[1])


# ==============================
# FALLBACK TEMPLATE MATCHING
# ==============================
def _match_digit(d: np.ndarray) -> Tuple[str, float]:
    best, best_d = -1.0, "0"
    for lbl, tmpl in TEMPLATES.items():
        s = float(np.max(cv2.matchTemplate(d, tmpl, cv2.TM_CCOEFF_NORMED)))
        if s > best:
            best, best_d = s, lbl
    return best_d, best


def template_fallback(roi_bgr: np.ndarray) -> Tuple[str, float]:
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _, thresh = cv2.threshold(cv2.GaussianBlur(gray, (3, 3), 0), 0, 255,
                               cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    h, w = gray.shape

    dilated = cv2.dilate(thresh,
                         cv2.getStructuringElement(cv2.MORPH_RECT, (2, 6)))
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL,
                                    cv2.CHAIN_APPROX_SIMPLE)
    boxes = sorted(
        [(x, y, cw, ch) for cnt in contours
         for x, y, cw, ch in [cv2.boundingRect(cnt)]
         if 0.15 < cw / float(ch) < 1.6 and ch > h * 0.35 and cw > 6],
        key=lambda b: b[0],
    )

    if len(boxes) < 4:
        dw = w // 8
        imgs = []
        for i in range(8):
            d = thresh[:, i * dw:(i + 1) * dw]
            d = cv2.copyMakeBorder(d, 5, 5, 5, 5, cv2.BORDER_CONSTANT, value=0)
            imgs.append(cv2.resize(d, (40, 60)))
    else:
        imgs = []
        for x, y, cw, ch in boxes:
            p = 4
            d = thresh[max(0, y - p):min(h, y + ch + p),
                       max(0, x - p):min(w, x + cw + p)]
            imgs.append(cv2.resize(d, (40, 60)))

    results = [_match_digit(d) for d in imgs]
    text = "".join(r[0] for r in results)
    conf = float(np.mean([r[1] for r in results]))
    log.info("Template matching: '%s' conf=%.3f", text, conf)
    return text, conf


# ==============================
# PIPELINE PRINCIPAL
# ==============================
def read_meter(image_bytes: bytes) -> Tuple[str, float, str]:
    log.info("=== Nueva lectura: %d bytes — engine=%s ===", len(image_bytes), OCR_ENGINE)

    if OCR_ENGINE == "groq":
        digits, conf, method = read_with_groq(image_bytes)
        d = re.sub(r"[^0-9]", "", digits)[:5]
        reading = d.zfill(5)
        log.info("RESULTADO Groq: '%s' conf=%.2f", reading, conf)
        return reading, round(conf, 3), method

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Imagen inválida o corrupta — no se pudo decodificar")

    roi = detect_display(img)
    digits, conf = read_with_easyocr_pipeline(roi)

    if len(digits) >= 3 and conf >= 0.30:
        d = re.sub(r"[^0-9]", "", digits)[:5]
        log.info("RESULTADO EasyOCR: '%s' conf=%.2f", d, conf)
        return d, round(conf, 3), "easyocr_neuronal"

    log.warning("EasyOCR insuficiente ('%s' conf=%.2f) → plantillas", digits, conf)
    digits_t, conf_t = template_fallback(roi)
    d = re.sub(r"[^0-9]", "", digits_t)[:5]
    log.info("RESULTADO plantillas: '%s' conf=%.3f", d, conf_t)
    return d, round(conf_t, 3), "coincidencia_plantillas"


# ==============================
# ENDPOINTS
# ==============================
@app.post("/ocr", response_model=OCRResponse)
async def extract_text(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="El archivo no es una imagen")
    try:
        image_bytes = await file.read()
        reading, confidence, method = read_meter(image_bytes)
        return OCRResponse(
            success=True,
            text=reading,
            digits_only=reading,
            confidence=confidence,
            message=f"Lectura correcta ({method})",
        )
    except Exception as e:
        log.exception("Error en /ocr")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {e}")


def _debug_file(path: str) -> FileResponse:
    if not os.path.isfile(path):
        raise HTTPException(404, detail="Procese una imagen primero (engine=easyocr)")
    return FileResponse(path, media_type="image/png")


@app.get("/debug/roi")
def get_roi():
    return _debug_file("debug_roi.png")


@app.get("/debug/easyocr")
def get_easyocr_input():
    return _debug_file("debug_easyocr_input.png")


@app.get("/debug/clahe")
def get_clahe():
    return _debug_file("debug_easyocr_clahe.png")


@app.get("/debug/thresh")
def get_thresh():
    return _debug_file("debug_easyocr_thresh.png")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "9.0.0",
        "engine": OCR_ENGINE,
        "groq_model": GROQ_MODEL if OCR_ENGINE == "groq" else None,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)