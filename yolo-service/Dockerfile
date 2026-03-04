FROM python:3.11-slim

WORKDIR /app

#  system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

#  models directory
RUN mkdir -p models

EXPOSE 8001

CMD ["python", "server.py"]
