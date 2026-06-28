import { useEffect, useRef, useState } from "react";
import { getToken } from "../api/client";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000/ws";

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
