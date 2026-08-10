// ============================================================
// Servicio de encoder/proxy para servidores de streaming.
// Soporta 3 protocolos:
//   - SOURCE (Centova Cast / Icecast legacy) — raw TCP socket
//   - PUT    (Icecast 2.4+) — HTTP PUT chunked
//   - ICY    (SHOUTcast v1) — raw TCP socket con handshake ICY
//
// Auto-detección: intenta SOURCE → PUT → ICY en orden.
//
// Flujo:
//   Frontend (Web Audio → MediaRecorder → WebSocket) → Backend → Servidor
// ============================================================

import net from "node:net";
import http from "node:http";
import https from "node:https";

// Estado global de conexiones activas (por estación)
const conexiones = new Map(); // estacionId -> { socket|req, estado, config, iniciadoEn, bytesEnviados, protocolo }

// ---- Protocolos individuales ----

/**
 * Conecta usando el protocolo SOURCE (Icecast legacy / Centova Cast).
 * Envía un request HTTP-like por TCP raw:
 *   SOURCE <mountpoint> HTTP/1.0\r\n
 *   Authorization: Basic ...\r\n
 *   ...headers...\r\n\r\n
 */
function conectarSOURCE(config) {
  return new Promise((resolve) => {
    const { host, port, mountpoint, username, password, contentType, bitrate, nombre } = config;
    const hostLimpio = host.replace(/^https?:\/\//, "");
    const auth = Buffer.from(`${username || "source"}:${password}`).toString("base64");
    const mount = mountpoint.startsWith("/") ? mountpoint : `/${mountpoint}`;
    const tipo = contentType || "audio/mpeg";

    const socket = net.createConnection({ host: hostLimpio, port: port || 8000 }, () => {
      // Enviar handshake SOURCE
      const headers = [
        `SOURCE ${mount} HTTP/1.0`,
        `Authorization: Basic ${auth}`,
        `User-Agent: PanelRadioOnline/3.0`,
        `Content-Type: ${tipo}`,
        `Ice-Name: ${nombre || "Panel Radio Online"}`,
        `Ice-Description: Transmision desde Panel Radio Online`,
        `Ice-Genre: Variada`,
        `Ice-Bitrate: ${bitrate || 128}`,
        `Ice-Public: 1`,
        ``,
        ``,
      ].join("\r\n");

      socket.write(headers);
    });

    let responded = false;
    let responseData = "";

    socket.on("data", (data) => {
      if (responded) return;
      responseData += data.toString();

      // Esperar la respuesta completa del header
      if (responseData.includes("\r\n\r\n") || responseData.includes("\n\n")) {
        responded = true;
        const firstLine = responseData.split("\r\n")[0] || responseData.split("\n")[0];

        if (firstLine.includes("200") || firstLine.toLowerCase().includes("ok")) {
          resolve({ ok: true, socket, protocolo: "source" });
        } else if (firstLine.includes("401") || firstLine.includes("403")) {
          socket.destroy();
          resolve({ ok: false, mensaje: `SOURCE: Credenciales rechazadas (${firstLine.trim()})` });
        } else {
          socket.destroy();
          resolve({ ok: false, mensaje: `SOURCE: Respuesta inesperada: ${firstLine.trim()}` });
        }
      }
    });

    socket.on("error", (err) => {
      if (!responded) {
        responded = true;
        resolve({ ok: false, mensaje: `SOURCE: ${err.message}` });
      }
    });

    socket.setTimeout(10000, () => {
      if (!responded) {
        responded = true;
        socket.destroy();
        resolve({ ok: false, mensaje: "SOURCE: Timeout (10s)" });
      }
    });
  });
}

/**
 * Conecta usando HTTP PUT (Icecast 2.4+).
 * Mantiene la request abierta para streaming chunked.
 */
function conectarPUT(config) {
  return new Promise((resolve) => {
    const { host, port, mountpoint, username, password, contentType, bitrate, nombre } = config;
    const hostLimpio = host.replace(/^https?:\/\//, "");
    const usarHttps = port === 443 || host.startsWith("https");
    const auth = Buffer.from(`${username || "source"}:${password}`).toString("base64");
    const mount = mountpoint.startsWith("/") ? mountpoint : `/${mountpoint}`;
    const tipo = contentType || "audio/mpeg";

    const opciones = {
      hostname: hostLimpio,
      port: port || (usarHttps ? 443 : 8000),
      path: mount,
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": tipo,
        "Ice-Name": nombre || "Panel Radio Online",
        "Ice-Description": "Transmision desde Panel Radio Online",
        "Ice-Genre": "Variada",
        "Ice-Bitrate": String(bitrate || 128),
        "Ice-Public": "1",
        "User-Agent": "PanelRadioOnline/3.0",
        Expect: "",
        "Transfer-Encoding": "chunked",
      },
    };

    const modulo = usarHttps ? https : http;
    let responded = false;

    const req = modulo.request(opciones, (res) => {
      if (responded) return;
      responded = true;

      if (res.statusCode === 200) {
        resolve({ ok: true, req, protocolo: "put" });
      } else {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({ ok: false, mensaje: `PUT: Servidor respondio ${res.statusCode}: ${body || res.statusMessage}` });
        });
      }
    });

    req.on("error", (err) => {
      if (!responded) {
        responded = true;
        resolve({ ok: false, mensaje: `PUT: ${err.message}` });
      }
    });

    setTimeout(() => {
      if (!responded) {
        responded = true;
        req.destroy();
        resolve({ ok: false, mensaje: "PUT: Timeout (10s)" });
      }
    }, 10000);
  });
}

/**
 * Conecta usando protocolo ICY (SHOUTcast v1).
 * Handshake:
 *   → password\r\n
 *   ← OK2\r\n
 *   → icy-name:...\r\n icy-genre:...\r\n ... \r\n\r\n
 *   ← OK\r\n (o icy-caps)
 */
function conectarICY(config) {
  return new Promise((resolve) => {
    const { host, port, password, contentType, bitrate, nombre } = config;
    const hostLimpio = host.replace(/^https?:\/\//, "");
    const tipo = contentType || "audio/mpeg";

    const socket = net.createConnection({ host: hostLimpio, port: port || 8000 }, () => {
      // Paso 1: enviar la password
      socket.write(`${password}\r\n`);
    });

    let fase = "auth"; // auth → headers → streaming
    let responded = false;
    let buffer = "";

    socket.on("data", (data) => {
      if (responded) return;
      buffer += data.toString();

      if (fase === "auth") {
        if (buffer.includes("OK2") || buffer.includes("OK")) {
          fase = "headers";
          buffer = "";
          // Paso 2: enviar headers ICY
          const headers = [
            `icy-name:${nombre || "Panel Radio Online"}`,
            `icy-genre:Variada`,
            `icy-br:${bitrate || 128}`,
            `icy-pub:1`,
            `icy-url:https://panelradioonline.com`,
            `content-type:${tipo}`,
            ``,
            ``,
          ].join("\r\n");
          socket.write(headers);

          // SHOUTcast puede responder OK o directamente aceptar
          // Damos un breve timeout para la respuesta
          setTimeout(() => {
            if (!responded) {
              responded = true;
              resolve({ ok: true, socket, protocolo: "icy" });
            }
          }, 1500);
        } else if (buffer.includes("invalid") || buffer.includes("deny") || buffer.length > 100) {
          responded = true;
          socket.destroy();
          resolve({ ok: false, mensaje: "ICY: Password rechazada por el servidor." });
        }
      } else if (fase === "headers") {
        // Si recibimos OK o icy-caps, estamos listos
        if (buffer.includes("OK") || buffer.includes("icy-caps")) {
          if (!responded) {
            responded = true;
            resolve({ ok: true, socket, protocolo: "icy" });
          }
        }
      }
    });

    socket.on("error", (err) => {
      if (!responded) {
        responded = true;
        resolve({ ok: false, mensaje: `ICY: ${err.message}` });
      }
    });

    socket.setTimeout(10000, () => {
      if (!responded) {
        responded = true;
        socket.destroy();
        resolve({ ok: false, mensaje: "ICY: Timeout (10s)" });
      }
    });
  });
}

// ---- Auto-deteccion ----

/**
 * Intenta conectar usando los protocolos en orden hasta encontrar uno que funcione.
 * Orden por defecto: source → put → icy
 * Si se especifica protocolo forzado, usa solo ese.
 */
async function autoConectar(config) {
  const protocoloForzado = config.protocolo; // "auto" | "source" | "put" | "icy" | undefined

  const intentos =
    protocoloForzado && protocoloForzado !== "auto"
      ? [protocoloForzado]
      : ["source", "put", "icy"];

  const errores = [];

  for (const proto of intentos) {
    let resultado;
    switch (proto) {
      case "source":
        resultado = await conectarSOURCE(config);
        break;
      case "put":
        resultado = await conectarPUT(config);
        break;
      case "icy":
        resultado = await conectarICY(config);
        break;
      default:
        continue;
    }

    if (resultado.ok) {
      return resultado;
    }
    errores.push(resultado.mensaje);
  }

  return {
    ok: false,
    mensaje: `Ningun protocolo funciono:\n${errores.join("\n")}`,
  };
}

// ---- API publica ----

/**
 * Conecta al servidor de streaming y abre el stream.
 * @param {string} estacionId - ID de la estacion
 * @param {object} config - { host, port, mountpoint, username, password, contentType, bitrate, nombre, protocolo }
 * @returns {Promise<object>} - { ok, mensaje, protocolo }
 */
export async function conectarIcecast(estacionId, config) {
  if (conexiones.has(estacionId)) {
    return { ok: false, mensaje: "Ya hay una conexion activa para esta estacion." };
  }

  const resultado = await autoConectar(config);

  if (!resultado.ok) {
    return { ok: false, mensaje: resultado.mensaje };
  }

  const conn = {
    estado: "conectado",
    config: { ...config },
    iniciadoEn: Date.now(),
    bytesEnviados: 0,
    protocolo: resultado.protocolo,
  };

  // Guardar referencia al socket o request segun protocolo
  if (resultado.protocolo === "put") {
    conn.req = resultado.req;
  } else {
    conn.socket = resultado.socket;
    // Manejar cierre inesperado del socket
    resultado.socket.on("close", () => {
      conexiones.delete(estacionId);
    });
    resultado.socket.on("error", () => {
      conexiones.delete(estacionId);
    });
  }

  conexiones.set(estacionId, conn);
  return { ok: true, mensaje: `Conectado via ${resultado.protocolo.toUpperCase()}.`, protocolo: resultado.protocolo };
}

/**
 * Envia un chunk de audio al servidor.
 * @param {string} estacionId
 * @param {Buffer} chunk - Datos de audio (MP3/OGG/AAC)
 * @returns {boolean}
 */
export function enviarChunk(estacionId, chunk) {
  const conn = conexiones.get(estacionId);
  if (!conn) return false;

  try {
    if (conn.protocolo === "put") {
      if (!conn.req || conn.req.destroyed) return false;
      conn.req.write(chunk);
    } else {
      if (!conn.socket || conn.socket.destroyed) return false;
      conn.socket.write(chunk);
    }
    conn.bytesEnviados += chunk.length;
    return true;
  } catch (err) {
    console.error(`[Streaming][${conn.protocolo}] Error enviando chunk: ${err.message}`);
    desconectarIcecast(estacionId);
    return false;
  }
}

/**
 * Desconecta del servidor.
 * @param {string} estacionId
 */
export function desconectarIcecast(estacionId) {
  const conn = conexiones.get(estacionId);
  if (conn) {
    try {
      if (conn.protocolo === "put" && conn.req) {
        conn.req.end();
      } else if (conn.socket) {
        conn.socket.end();
        conn.socket.destroy();
      }
    } catch { /* ya cerrada */ }
    conexiones.delete(estacionId);
  }
  return { ok: true, mensaje: "Desconectado del servidor." };
}

/**
 * Obtiene el estado de la conexion de una estacion.
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
    protocolo: conn.protocolo,
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
 * Test de conexion: intenta conectar y desconectar inmediatamente.
 * Verifica que las credenciales y el servidor sean correctos.
 * Ahora soporta los 3 protocolos.
 */
export async function testConexion(config) {
  const resultado = await autoConectar(config);

  if (resultado.ok) {
    // Cerrar inmediatamente — solo era un test
    try {
      if (resultado.protocolo === "put" && resultado.req) {
        resultado.req.destroy();
      } else if (resultado.socket) {
        resultado.socket.end();
        resultado.socket.destroy();
      }
    } catch { /* ok */ }

    return {
      ok: true,
      mensaje: `Conexion exitosa via ${resultado.protocolo.toUpperCase()}. El servidor acepta tu transmision.`,
      protocolo: resultado.protocolo,
    };
  }

  // Mensajes de error amigables
  const msg = resultado.mensaje || "";
  if (msg.includes("ECONNREFUSED")) {
    return { ok: false, mensaje: "No se pudo conectar. Verifica host y puerto." };
  }
  if (msg.includes("ENOTFOUND")) {
    return { ok: false, mensaje: "Host no encontrado. Verifica la direccion del servidor." };
  }
  if (msg.includes("Timeout") || msg.includes("ETIMEDOUT")) {
    return { ok: false, mensaje: "Tiempo de espera agotado. El servidor no responde." };
  }

  return { ok: false, mensaje: resultado.mensaje };
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
      protocolo: conn.protocolo,
      bytesEnviados: conn.bytesEnviados,
      duracion: Math.round((Date.now() - conn.iniciadoEn) / 1000),
      host: conn.config.host,
      mountpoint: conn.config.mountpoint,
    });
  }
  return lista;
}
