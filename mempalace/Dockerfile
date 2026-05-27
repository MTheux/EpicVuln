FROM python:3.11-slim

WORKDIR /app

# Install build deps for chromadb/sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download all-MiniLM-L6-v2 to bake into image (zero-egress at runtime)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY app.py .

EXPOSE 9002
ENV MEMPALACE_DATA=/data/chroma

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9002"]
