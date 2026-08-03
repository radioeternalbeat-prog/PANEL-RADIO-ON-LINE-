// ============================================================
// Transcoder de audio: WebM/Opus → MP3 (vía FFmpeg)
//
// El navegador solo puede codificar en WebM/Opus (MediaRecorder).
// Muchos servidores Icecast/SHOUTcast solo aceptan MP3 o AAC.
// Este módulo transcódifica en tiempo real usando FFmpeg como
// proceso hijo (spawn), pipe de entrada/salida.
//
// Flujo:
//   Frontend (WebM/Opus chunks) → Transcoder (FFmpeg) → MP3 → Icecast
//
// Si FFmpeg no está disponible, se envía el audio raw (WebM/Opus)
// para servidores que sí lo soportan.
// ============================================================

import { spawn } from "node:child_process";
import { Transform } from "node:stream";

/**
 * Verifica si FFmpeg está disponible en el sistema.
 * @returns {Promise<boolean>}
 */
export async function ffmpegDisponible() {
  return new Promise((resolve) => {
    try {
      const proc = spawn("ffmpeg", ["-version"], { stdio: "pipe" });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
      // Timeout de 3s
      setTimeout(() => { proc.kill(); resolve(false); }, 3000);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Crea un transcoder en tiempo real: recibe chunks WebM/Opus,
 * emite chunks MP3 (o AAC/OGG según el formato configurado).
 *
 * @param {object} opciones
 * @param {string} opciones.formatoSalida - "mp3" | "aac" | "ogg" (default: "mp3")
 * @param {number} opciones.bitrate - Bitrate de salida en kbps (default: 128)
 * @param {number} opciones.sampleRate - Sample rate (default: 44100)
 * @param {number} opciones.channels - Canales (default: 2 = stereo)
 * @returns {object} - { entrada, salida, proceso, destruir }
 *   - entrada: writable stream (enviar chunks WebM/Opus aquí)
 *   - salida: readable stream (leer chunks MP3/AAC de aquí)
 *   - proceso: el proceso FFmpeg
 *   - destruir: función para cerrar todo
 */
export function crearTranscoder({
  formatoSalida = "mp3",
  bitrate = 128,
  sampleRate = 44100,
  channels = 2,
} = {}) {
  // Mapeo de formato a codec FFmpeg
  const codecs = {
    mp3: ["libmp3lame", "audio/mpeg"],
    aac: ["aac", "audio/aac"],
    ogg: ["libvorbis", "audio/ogg"],
  };

  const [codec, contentType] = codecs[formatoSalida] || codecs.mp3;

  // Argumentos de FFmpeg:
  // -i pipe:0        → leer de stdin (WebM/Opus del navegador)
  // -f <formato>     → formato de salida
  // -codec:a <codec> → codec de audio
  // -b:a <bitrate>k  → bitrate
  // -ar <rate>       → sample rate
  // -ac <channels>   → canales
  // -flush_packets 1 → enviar paquetes inmediatamente (baja latencia)
  // pipe:1           → escribir a stdout
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-f", "webm",        // formato de entrada
    "-i", "pipe:0",      // leer de stdin
    "-f", formatoSalida, // formato de salida
    "-codec:a", codec,
    "-b:a", `${bitrate}k`,
    "-ar", String(sampleRate),
    "-ac", String(channels),
    "-flush_packets", "1",
    "-fflags", "+nobuffer",
    "-flags", "+low_delay",
    "pipe:1",            // escribir a stdout
  ];

  const proceso = spawn("ffmpeg", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Log de errores de FFmpeg (para debug)
  let ffmpegError = "";
  proceso.stderr.on("data", (data) => {
    ffmpegError += data.toString();
    // Solo loguear errores reales, no warnings
    const linea = data.toString().trim();
    if (linea && !linea.startsWith("size=")) {
      console.error(`[FFmpeg] ${linea}`);
    }
  });

  proceso.on("error", (err) => {
    console.error(`[Transcoder] FFmpeg error: ${err.message}`);
  });

  proceso.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Transcoder] FFmpeg cerrado con código ${code}`);
      if (ffmpegError) console.error(`[Transcoder] Último error: ${ffmpegError.slice(-200)}`);
    }
  });

  return {
    entrada: proceso.stdin,    // Escribir chunks WebM aquí
    salida: proceso.stdout,    // Leer chunks MP3 de aquí
    proceso,
    contentType,
    activo: () => !proceso.killed && proceso.exitCode === null,
    destruir: () => {
      try { proceso.stdin.end(); } catch { /* noop */ }
      try { proceso.kill("SIGTERM"); } catch { /* noop */ }
      // Forzar kill si no termina en 2s
      setTimeout(() => {
        try { proceso.kill("SIGKILL"); } catch { /* noop */ }
      }, 2000);
    },
  };
}

/**
 * Crea un transcoder que funciona como Transform stream.
 * Entrada: chunks de WebM/Opus (Buffer)
 * Salida: chunks de MP3 (Buffer)
 *
 * Uso simple:
 *   const stream = crearTranscoderStream({ bitrate: 128 });
 *   stream.write(chunkWebM);
 *   stream.on("data", (chunkMP3) => enviarAIcecast(chunkMP3));
 */
export function crearTranscoderStream(opciones = {}) {
  const { entrada, salida, destruir, contentType, activo } = crearTranscoder(opciones);

  const transform = new Transform({
    transform(chunk, encoding, callback) {
      if (!activo()) {
        callback(new Error("Transcoder no activo"));
        return;
      }
      // Escribir al stdin de FFmpeg
      const ok = entrada.write(chunk);
      if (!ok) {
        entrada.once("drain", callback);
      } else {
        callback();
      }
    },
    flush(callback) {
      entrada.end();
      callback();
    },
    destroy(err, callback) {
      destruir();
      callback(err);
    },
  });

  // Pipe la salida de FFmpeg al transform stream
  salida.on("data", (chunk) => {
    transform.push(chunk);
  });

  salida.on("end", () => {
    transform.push(null);
  });

  transform.contentType = contentType;
  transform.destruirTranscoder = destruir;

  return transform;
}
