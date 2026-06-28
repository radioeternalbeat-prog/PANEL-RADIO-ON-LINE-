import { useEffect, useRef, useState } from "react";
import { getToken } from "../api/client";

// URL del WebSocket.
// - En desarrollo, usa VITE_WS_URL (p. ej. ws://localhost:4000/ws).
// - En producción, deriva del mismo origen (ws:// o wss:// según el protocolo).
function resolverWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }
  return "ws://localhost:4000/ws";
}

const WS_URL = resolverWsUrl();

// Hook que se conecta al WebSocket de estadísticas en vivo y devuelve
// el último snapshot recibido y el estado de la conexión.
export function useRealtime() {
  const [datos, setDatos] = useState(null);
  const [conectado, setConectado] = useState(false);
  const wsRef = useRef(null);
  const reconexion = useRef(null);

  useEffect(() => {
    let cerrado = false;

    function conectar() {
      const token = getToken();
      const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConectado(true);
      ws.onmessage = (evento) => {
        try {
          setDatos(JSON.parse(evento.data));
        } catch {
          /* ignora mensajes no JSON */
        }
      };
      ws.onclose = () => {
        setConectado(false);
        if (!cerrado) {
          // Reintentar conexión a los 3s.
          reconexion.current = setTimeout(conectar, 3000);
        }
      };
      ws.onerror = () => ws.close();
    }

    conectar();

    return () => {
      cerrado = true;
      clearTimeout(reconexion.current);
      wsRef.current?.close();
    };
  }, []);

  return { datos, conectado };
}
