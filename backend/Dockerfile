# Use stable, lightweight Python 3.10 slim image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=7860 \
    TRANSFORMERS_OFFLINE=1 \
    HF_DATASETS_OFFLINE=1 \
    NLTK_DATA=/app/nltk_data \
    TRANSFORMERS_CACHE=/app/ai_models/cache

WORKDIR /app

# Install system dependencies (ffmpeg for Whisper/dubbing, tesseract for screen OCR, glx for opencv)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU version first to reduce Docker image size (saving ~4GB of GPU weights)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Copy python dependencies list
COPY requirements.txt .

# Install all Python packages and Gunicorn production server
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Download spaCy English model
RUN python3 -m spacy download en_core_web_sm

# Copy the rest of the application files
COPY . .

# Run pre-caching script during the build phase to bake ALL models inside the image!
# This includes Whisper base, BART large, translation, embeddings, and NLTK data.
RUN python3 download_models.py

# Create cache directories and set permissions for Hugging Face non-root user
RUN mkdir -p /app/nltk_data /app/ai_models/cache && \
    chmod -R 777 /app

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

# Run with Gunicorn, using 2 workers/2 threads (perfect for 16GB RAM) and 10-minute timeout
CMD ["gunicorn", "--workers", "2", "--threads", "2", "--bind", "0.0.0.0:7860", "--timeout", "600", "app:app"]
