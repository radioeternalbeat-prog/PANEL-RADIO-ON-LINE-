// ============================================================
// WebSocket de streaming de audio.
// Recibe chunks de audio del frontend (MediaRecorder) y los
// reenvía al servidor Icecast via el servicio icecastEncoder.
//
// URL: /ws-stream?estacionId=xxx&token=yyy
// Protocolo: binario (ArrayBuffer con datos de audio)
// ============================================================

import { WebSocketServer } from "ws";
import { verificarToken } from "./auth.js";
import { enviarChunk, estadoConexion } from "./services/icecastEncoder.js";

export function iniciarStreamingWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Manejar el upgrade HTTP → WebSocket solo para /ws-stream
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, "http://localhost");

    // Solo manejar /ws-stream (dejar /ws para el realtime existente)
    if (url.pathname !== "/ws-stream") return;
    const token = url.searchParams.get("token");
    const estacionId = url.searchParams.get("estacionId");

    // Verificar autenticación
    const payload = token ? verificarToken(token) : null;
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    if (!estacionId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.estacionId = estacionId;
      ws.usuario = payload.usuario;
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    console.log(`[StreamingWS] Conectado: ${ws.usuario} → estación ${ws.estacionId}`);

    let chunksRecibidos = 0;

    ws.on("message", (data) => {
      // Verificar que la conexión al Icecast está activa
      const estado = estadoConexion(ws.estacionId);
      if (!estado.conectado) {
        // Si la conexión se cayó, avisar al cliente
        ws.send(JSON.stringify({ tipo: "error", mensaje: "Conexión al servidor perdida." }));
        ws.close(4000, "Icecast disconnected");
        return;
      }

      // Reenviar el chunk de audio al servidor Icecast
      const buffer = Buffer.from(data);
      const ok = enviarChunk(ws.estacionId, buffer);

      if (!ok) {
        ws.send(JSON.stringify({ tipo: "error", mensaje: "Error enviando audio al servidor." }));
        ws.close(4001, "Write error");
        return;
      }

      chunksRecibidos++;

      // Cada 20 chunks (~5s), enviar stats al frontend
      if (chunksRecibidos % 20 === 0) {
        const statsActual = estadoConexion(ws.estacionId);
        ws.send(JSON.stringify({
          tipo: "stats",
          bytesEnviados: statsActual.bytesEnviados,
          duracion: statsActual.duracion,
        }));
      }
    });

    ws.on("close", () => {
      console.log(`[StreamingWS] Desconectado: ${ws.usuario}`);
    });

    ws.on("error", (err) => {
      console.error(`[StreamingWS] Error: ${err.message}`);
    });
  });

  return wss;
}
