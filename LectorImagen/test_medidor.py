import httpx
import base64
import re
import json

NGROK_URL  = "https://58ef-38-253-147-48.ngrok-free.app"
MODEL      = "minicpm-v"
IMAGE_PATH = r"C:\Users\Jorge\OneDrive\Documentos\FotosMedicion\20-05-2026\302.jpeg"

PROMPT = """This is a SUNPOOL water meter photo.
Look at the rectangular display with 8 cells in a row.
The LEFT 5 cells show BLACK digits on white background = the main reading.
The RIGHT 3 cells show digits on AMBER/ORANGE background = ignore these.
Read the 5 BLACK digits from left to right, in order.
Respond with ONLY the 5 digits, no words, no spaces, no punctuation.
Example response: 00979"""

with open(IMAGE_PATH, "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

print(f"Modelo    : {MODEL}")
print(f"Imagen    : {IMAGE_PATH}")
print(f"Servidor  : {NGROK_URL}")
print("-" * 40)
print("Procesando...")

full_response = ""

try:
    with httpx.Client(timeout=300.0) as client:
        with client.stream(
            "POST",
            f"{NGROK_URL}/api/chat",
            headers={
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            json={
                "model": MODEL,
                "stream": True,
                "messages": [{
                    "role": "user",
                    "content": PROMPT,
                    "images": [image_data],
                }]
            }
        ) as response:
            for line in response.iter_lines():
                if line:
                    data = json.loads(line)
                    chunk = data.get("message", {}).get("content", "")
                    full_response += chunk
                    print(chunk, end="", flush=True)
                    if data.get("done"):
                        break

    print()
    digits = re.sub(r"[^0-9]", "", full_response)[:5]
    print(f"\nRespuesta raw  : {full_response.strip()}")
    print(f"Dígitos leídos : {digits}")
    print(f"Lectura final  : {digits}.999")

except httpx.ReadError as e:
    print(f"\nConexión cortada — el modelo tardó demasiado: {e}")
    print("Intenta con una imagen más pequeña o espera a que el modelo cargue en RAM")
except Exception as e:
    print(f"\nError inesperado: {e}")