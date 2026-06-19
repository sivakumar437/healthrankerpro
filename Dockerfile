FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=4173
ENV HEALTHRANK_DB=/data/app.db

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY index.html styles.css script.js server.py models.py README.md ./

RUN mkdir -p /data

EXPOSE 4173

CMD ["python", "server.py"]
