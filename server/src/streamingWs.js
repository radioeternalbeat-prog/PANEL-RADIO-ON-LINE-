// ============================================================
// WebSocket de streaming de audio.
// Recibe chunks de audio del frontend (MediaRecorder → WebM/Opus)
// y los transcódifica a MP3 vía FFmpeg antes de enviarlos a Icecast.
//
// URL: /ws-stream?estacionId=xxx&token=yyy
// Protocolo: binario (ArrayBuffer con datos de audio WebM/Opus)
//
// Flujo:
//   Frontend → WebSocket (WebM/Opus) → FFmpeg (→ MP3) → Icecast
// ============================================================

import { WebSocketServer } from "ws";
import { enviarChunk, estadoConexion } from "./services/icecastEncoder.js";
import { crearTranscoder, ffmpegDisponible } from "./services/transcoder.js";

// Cache: verificar FFmpeg una sola vez al arrancar
let _ffmpegOk = null;
async function tieneFFmpeg() {
  if (_ffmpegOk === null) {
    _ffmpegOk = await ffmpegDisponible();
    console.log(`[Streaming] FFmpeg ${_ffmpegOk ? "disponible ✓" : "NO disponible — se enviará WebM/Opus sin transcoding"}`);
  }
  return _ffmpegOk;
}
// Verificar al importar el módulo
tieneFFmpeg();

// Transcoders activos por estación
const transcoders = new Map();

export function iniciarStreamingWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  // El upgrade HTTP → WebSocket se maneja centralmente en index.js
  // para evitar conflictos con otros WebSocket servers.

  wss.on("connection", async (ws) => {
    const estacionId = ws.estacionId;
    console.log(`[StreamingWS] Conectado: ${ws.usuario} → estación ${estacionId}`);

    let chunksRecibidos = 0;
    let transcoder = null;
    const usarFFmpeg = await tieneFFmpeg();

    // Si FFmpeg está disponible, crear transcoder WebM → MP3
    if (usarFFmpeg) {
      try {
        // Obtener bitrate de la conexión activa
        const estado = estadoConexion(estacionId);
        const bitrate = estado?.config?.bitrate || 128;

        transcoder = crearTranscoder({
          formatoSalida: "mp3",
          bitrate,
          sampleRate: 44100,
          channels: 2,
        });

        // Cuando FFmpeg produce chunks MP3, enviarlos a Icecast
        transcoder.salida.on("data", (chunkMP3) => {
          const ok = enviarChunk(estacionId, chunkMP3);
          if (!ok) {
            ws.send(JSON.stringify({ tipo: "error", mensaje: "Conexión al servidor perdida." }));
            ws.close(4000, "Icecast disconnected");
          }
        });

        transcoder.salida.on("error", (err) => {
          console.error(`[StreamingWS] Error en salida del transcoder: ${err.message}`);
        });

        transcoder.proceso.on("close", (code) => {
          if (code !== 0 && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ tipo: "error", mensaje: "Transcoder detenido inesperadamente." }));
          }
        });

        transcoders.set(estacionId, transcoder);
        console.log(`[StreamingWS] Transcoder MP3 iniciado para estación ${estacionId} (${bitrate} kbps)`);
      } catch (err) {
        console.error(`[StreamingWS] Error creando transcoder: ${err.message}`);
        transcoder = null;
      }
    }

    ws.on("message", (data) => {
      // Verificar que la conexión al Icecast está activa
      const estado = estadoConexion(estacionId);
      if (!estado.conectado) {
        ws.send(JSON.stringify({ tipo: "error", mensaje: "Conexión al servidor perdida." }));
        ws.close(4000, "Icecast disconnected");
        return;
      }

      const buffer = Buffer.from(data);

      if (transcoder && transcoder.activo()) {
        // Enviar WebM/Opus al transcoder (FFmpeg convierte a MP3)
        try {
          transcoder.entrada.write(buffer);
        } catch (err) {
          console.error(`[StreamingWS] Error escribiendo al transcoder: ${err.message}`);
        }
      } else {
        // Sin FFmpeg: enviar WebM/Opus directamente (para servidores que lo soporten)
        const ok = enviarChunk(estacionId, buffer);
        if (!ok) {
          ws.send(JSON.stringify({ tipo: "error", mensaje: "Error enviando audio al servidor." }));
          ws.close(4001, "Write error");
          return;
        }
      }

      chunksRecibidos++;

      // Cada 20 chunks (~5s), enviar stats al frontend
      if (chunksRecibidos % 20 === 0) {
        const statsActual = estadoConexion(estacionId);
        ws.send(JSON.stringify({
          tipo: "stats",
          bytesEnviados: statsActual.bytesEnviados,
          duracion: statsActual.duracion,
          transcoding: !!transcoder,
        }));
      }
    });

    ws.on("close", () => {
      console.log(`[StreamingWS] Desconectado: ${ws.usuario} (${chunksRecibidos} chunks procesados)`);
      // Cerrar el transcoder si existe
      if (transcoder) {
        transcoder.destruir();
        transcoders.delete(estacionId);
      }
    });

    ws.on("error", (err) => {
      console.error(`[StreamingWS] Error: ${err.message}`);
      if (transcoder) {
        transcoder.destruir();
        transcoders.delete(estacionId);
      }
    });

    // Confirmar al frontend que está listo
    ws.send(JSON.stringify({
      tipo: "listo",
      transcoding: usarFFmpeg,
      formato: usarFFmpeg ? "audio/mpeg (MP3 vía FFmpeg)" : "audio/webm (sin transcoding)",
    }));
  });

  return wss;
}
