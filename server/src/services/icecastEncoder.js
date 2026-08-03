// ============================================================
// Servicio de encoder/proxy para Icecast.
// Recibe chunks de audio del frontend (vía WebSocket) y los
// reenvía al servidor Icecast usando el protocolo SOURCE (HTTP PUT).
//
// Flujo:
//   Frontend (Web Audio → MediaRecorder → WebSocket) → Backend → Icecast
//
// Esto es equivalente a BUTT o Mixxx transmitiendo a Icecast,
// pero integrado en el panel web.
// ============================================================

import http from "node:http";
import https from "node:https";

// Estado global de conexiones activas (por estación)
const conexiones = new Map(); // estacionId -> { req, estado, config, iniciadoEn }

/**
 * Conecta al servidor Icecast y abre el stream SOURCE.
 * @param {string} estacionId - ID de la estación
 * @param {object} config - { host, port, mountpoint, username, password, contentType, bitrate, nombre }
 * @returns {Promise<object>} - { ok, mensaje }
 */
export function conectarIcecast(estacionId, config) {
  return new Promise((resolve) => {
    if (conexiones.has(estacionId)) {
      return resolve({ ok: false, mensaje: "Ya hay una conexión activa para esta estación." });
    }

    const { host, port, mountpoint, username, password, contentType, bitrate, nombre } = config;
    const usarHttps = port === 443 || host.startsWith("https");
    const hostLimpio = host.replace(/^https?:\/\//, "");

    const auth = Buffer.from(`${username || "source"}:${password}`).toString("base64");

    // Content-Type: usar audio/mpeg por defecto (FFmpeg transcodifica a MP3)
    // Si el servidor no soporta MP3, el usuario puede cambiarlo
    const tipo = contentType || "audio/mpeg";

    const opciones = {
      hostname: hostLimpio,
      port: port || (usarHttps ? 443 : 8000),
      path: mountpoint.startsWith("/") ? mountpoint : `/${mountpoint}`,
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": tipo,
        "Ice-Name": nombre || "Panel Radio Online",
        "Ice-Description": "Transmisión desde Panel Radio Online",
        "Ice-Genre": "Variada",
        "Ice-Bitrate": String(bitrate || 128),
        "Ice-Public": "1",
        "User-Agent": "PanelRadioOnline/2.0",
        "Expect": "",
      },
    };

    const modulo = usarHttps ? https : http;

    const req = modulo.request(opciones, (res) => {
      if (res.statusCode === 200) {
        conexiones.set(estacionId, {
          req,
          estado: "conectado",
          config: { ...config, contentType: tipo },
          iniciadoEn: Date.now(),
          bytesEnviados: 0,
        });
        resolve({ ok: true, mensaje: "Conectado al servidor Icecast." });
      } else {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            ok: false,
            mensaje: `Icecast respondió ${res.statusCode}: ${body || res.statusMessage}`,
          });
        });
      }
    });

    req.on("error", (err) => {
      conexiones.delete(estacionId);
      resolve({
        ok: false,
        mensaje: `Error de conexión: ${err.message}`,
      });
    });

    req.on("close", () => {
      conexiones.delete(estacionId);
    });

    // No finalizar la request — se mantiene abierta para enviar chunks
    // El flujo de audio se envía con enviarChunk()
  });
}

/**
 * Envía un chunk de audio al servidor Icecast.
 * @param {string} estacionId
 * @param {Buffer} chunk - Datos de audio (MP3/OGG)
 * @returns {boolean} - true si se envió correctamente
 */
export function enviarChunk(estacionId, chunk) {
  const conn = conexiones.get(estacionId);
  if (!conn || !conn.req || conn.req.destroyed) {
    return false;
  }

  try {
    conn.req.write(chunk);
    conn.bytesEnviados += chunk.length;
    return true;
  } catch (err) {
    console.error(`[Icecast] Error enviando chunk: ${err.message}`);
    desconectarIcecast(estacionId);
    return false;
  }
}

/**
 * Desconecta del servidor Icecast.
 * @param {string} estacionId
 */
export function desconectarIcecast(estacionId) {
  const conn = conexiones.get(estacionId);
  if (conn) {
    try {
      conn.req.end();
    } catch { /* ya cerrada */ }
    conexiones.delete(estacionId);
  }
  return { ok: true, mensaje: "Desconectado del servidor." };
}

/**
 * Obtiene el estado de la conexión de una estación.
 * @param {string} estacionId
 * @returns {object}
 */
export function estadoConexion(estacionId) {
  const conn = conexiones.get(estacionId);
  if (!conn) {
    return { conectado: false, estado: "desconectado", bytesEnviados: 0, duracion: 0 };
  }
  return {
    conectado: true,
    estado: conn.estado,
    bytesEnviados: conn.bytesEnviados,
    duracion: Math.round((Date.now() - conn.iniciadoEn) / 1000),
    config: {
      host: conn.config.host,
      port: conn.config.port,
      mountpoint: conn.config.mountpoint,
    },
  };
}

/**
 * Test de conexión: intenta conectar y desconectar inmediatamente.
 * Verifica que las credenciales y el servidor sean correctos.
 */
export async function testConexion(config) {
  const { host, port, mountpoint, username, password } = config;
  const usarHttps = port === 443 || host?.startsWith("https");
  const hostLimpio = (host || "").replace(/^https?:\/\//, "");
  const auth = Buffer.from(`${username || "source"}:${password}`).toString("base64");

  const modulo = usarHttps ? https : http;

  return new Promise((resolve) => {
    const opciones = {
      hostname: hostLimpio,
      port: port || (usarHttps ? 443 : 8000),
      path: mountpoint?.startsWith("/") ? mountpoint : `/${mountpoint}`,
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "audio/mpeg",
        "User-Agent": "PanelRadioOnline/2.0 (test)",
        "Expect": "",
      },
      timeout: 10000,
    };

    const req = modulo.request(opciones, (res) => {
      req.destroy(); // cerrar inmediatamente
      if (res.statusCode === 200) {
        resolve({ ok: true, mensaje: "Conexión exitosa. El servidor acepta tu transmisión." });
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        resolve({ ok: false, mensaje: "Credenciales incorrectas (usuario o contraseña source)." });
      } else if (res.statusCode === 403) {
        resolve({ ok: false, mensaje: "Punto de montaje no permitido o ya está en uso." });
      } else {
        resolve({ ok: false, mensaje: `Servidor respondió: ${res.statusCode} ${res.statusMessage}` });
      }
    });

    req.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        resolve({ ok: false, mensaje: "No se pudo conectar. Verifica host y puerto." });
      } else if (err.code === "ENOTFOUND") {
        resolve({ ok: false, mensaje: "Host no encontrado. Verifica la dirección del servidor." });
      } else if (err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
        resolve({ ok: false, mensaje: "Tiempo de espera agotado. El servidor no responde." });
      } else {
        resolve({ ok: false, mensaje: `Error: ${err.message}` });
      }
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, mensaje: "Tiempo de espera agotado (10s)." });
    });

    // Enviar un byte vacío para iniciar la conexión
    req.write(Buffer.alloc(0));
    // Dar 10s para que responda
    setTimeout(() => {
      req.destroy();
      resolve({ ok: false, mensaje: "Sin respuesta del servidor (timeout)." });
    }, 10000);
  });
}

/**
 * Lista todas las conexiones activas.
 */
export function listarConexiones() {
  const lista = [];
  for (const [id, conn] of conexiones) {
    lista.push({
      estacionId: id,
      estado: conn.estado,
      bytesEnviados: conn.bytesEnviados,
      duracion: Math.round((Date.now() - conn.iniciadoEn) / 1000),
      host: conn.config.host,
      mountpoint: conn.config.mountpoint,
    });
  }
  return lista;
}
