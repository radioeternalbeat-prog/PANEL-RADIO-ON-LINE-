# Imagen del PANEL (frontend compilado + API + WebSocket + Transcoder)
FROM node:22-slim

# Instalar FFmpeg para transcoding de audio (WebM/Opus → MP3)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias del frontend e instalación
COPY package.json package-lock.json* ./
RUN npm install

# Código y build del frontend
COPY . .
RUN npm run build

# Dependencias del backend
WORKDIR /app/server
RUN npm install

ENV PORT=4000
ENV NODE_ENV=production
ENV DB_PATH=/data/panel.db
ENV UPLOADS_DIR=/data/uploads
EXPOSE 4000

# El servidor (cwd /app/server) sirve la API + el frontend de /app/dist
CMD ["npm", "start"]
