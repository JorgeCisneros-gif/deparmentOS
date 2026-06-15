FROM python:3.11-slim

ARG OCR_ENGINE=groq

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-groq.txt requirements-easyocr.txt ./

RUN if [ "$OCR_ENGINE" = "easyocr" ]; then \
        pip install --no-cache-dir -r requirements-easyocr.txt; \
    else \
        pip install --no-cache-dir -r requirements-groq.txt; \
    fi

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]