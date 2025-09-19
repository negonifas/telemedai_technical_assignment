# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Установим системные зависимости для сборки и psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --upgrade pip setuptools wheel

# Скопируем зависимости и установим
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь backend-код
COPY . .

# Экспорт переменных по умолчанию (можно переопределить через docker-compose или env)
ENV FLASK_APP=run.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5001

EXPOSE 5001

# Для продакшна лучше использовать gunicorn, но для простоты используем flask run
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "run:app", "--workers", "2", "--threads", "4"]
