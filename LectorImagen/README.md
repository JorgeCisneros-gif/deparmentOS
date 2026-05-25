# OCR Digit Recognition API

Microservicio Python con FastAPI para extraer dígitos en negro y rojo de imágenes.

## Stack
- **FastAPI** — API REST
- **Tesseract OCR** — Motor de reconocimiento
- **OpenCV** — Preprocesamiento de imagen

---

## Instalación local

### 1. Instalar Tesseract en el sistema

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Descargar el instalador desde: https://github.com/UB-Mannheim/tesseract/wiki

### 2. Instalar dependencias Python
```bash
pip install -r requirements.txt
```

### 3. Levantar el servidor
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Con Docker

```bash
# Build
docker build -t ocr-digit-api .

# Run
docker run -p 8000:8000 ocr-digit-api
```

---

## Endpoints

### `POST /ocr`
Recibe una imagen y extrae los dígitos.

**Request:**
```
Content-Type: multipart/form-data
Body: file=<imagen.jpg>
```

**Response:**
```json
{
  "success": true,
  "text": "1234 5678",
  "digits_only": "12345678",
  "confidence": 87.4,
  "message": "Texto extraído correctamente"
}
```

### `GET /health`
Verifica que el servicio está activo.

---

## Uso desde tu proyecto Edify (JavaScript/Node.js)

```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:8000/ocr', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.digits_only); // "12345678"
```

---

## Ajustar detección de colores

En `main.py`, función `preprocess_for_digits()`, puedes ajustar los rangos de color rojo:

```python
# Rango actual (conservador)
np.array([0, 0, 100]),    # lower (B, G, R)
np.array([80, 80, 255])   # upper

# Si el rojo es más oscuro o anaranjado, prueba:
np.array([0, 0, 80]),
np.array([100, 100, 255])
```

---

## Documentación interactiva

Con el servidor corriendo, abre:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
