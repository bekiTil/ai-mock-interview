# Backend Dockerfile — Railway will build this automatically.
# Place this file at the ROOT of your backend folder (the one with pyproject.toml / requirements.txt / app/).

FROM python:3.11-slim

# Don't write .pyc, don't buffer stdout (so Railway logs show up in real time)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps (curl is handy for debugging; gcc only if you end up with a native dep)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of the backend source
COPY . .

# Railway injects PORT at runtime. Default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# IMPORTANT: `app.main:app` assumes your FastAPI instance is `app = FastAPI()` inside app/main.py
# If your entrypoint lives elsewhere (e.g. backend/main.py), change the module path below.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]