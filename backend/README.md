---
title: Info Stream AI
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# 🧠 Info Stream AI - High-Performance Backend Engine

This is the official containerized production backend for **Info Stream AI**, designed specifically for deployment on Hugging Face Spaces.

## 🚀 Technical Architecture
- **Language & Runtime**: Python 3.10-slim (Lightweight)
- **AI Acceleration**: Pre-cached PyTorch, Whisper Speech-to-Text, and BART Large summarization models.
- **Production Server**: Gunicorn (multi-threaded, asynchronous gthread worker structure)
- **System Dependencies**: ffmpeg (transcription/dubbing), tesseract-ocr (on-screen text extraction), OpenCV/GLX.
