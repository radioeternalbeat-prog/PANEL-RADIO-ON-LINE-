import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plug,
  Radio,
  RefreshCw,
  Send,
  Signal,
  Unplug,
  Upload,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { api } from "../../api/client";
import { useMezclador } from "../../context/MezcladorContext";

const PRESETS = [
  { label: "Low (64 kbps)", bitrate: 64, contentType: "audio/mpeg" },
  { label: "Standard (128 kbps)", bitrate: 128, contentType: "audio/mpeg" },
  { label: "HD (192 kbps)", bitrate: 192, contentType: "audio/mpeg" },
  { label: "Ultra (256 kbps)", bitrate: 256, contentType: "audio/mpeg" },
  { label: "Max (320 kbps)", bitrate: 320, contentType: "audio/mpeg" },
];

const SERVER_PRESETS = [
  { label: "Centova Cast", value: "centova", port: 8000, protocolo: "source", username: "source", mountpoint: "/stream", ayuda: "Usa el puerto SOURCE que te dio Centova (no el del panel admin). Ej: 8030, 8040..." },
  { label: "Icecast 2.4+", value: "icecast", port: 8000, protocolo: "put", username: "source", mountpoint: "/stream", ayuda: "Puerto del servidor Icecast (por defecto 8000)." },
  { label: "AzuraCast", value: "azuracast", port: 8000, protocolo: "put", username: "source", mountpoint: "/radio.mp3", ayuda: "Puerto y mountpoint de tu estación en AzuraCast." },
  { label: "SHOUTcast", value: "shoutcast", port: 8000, protocolo: "icy", username: "", mountpoint: "/", ayuda: "Usa el puerto SOURCE de SHOUTcast (base +1). Ej: si el servidor es 8000, el source es 8001." },
];

const PROTOCOLOS = [
  { label: "Auto-detectar", value: "auto" },
  { label: "SOURCE (Centova/Icecast legacy)", value: "source" },
  { label: "PUT (Icecast 2.4+)", value: "put" },
  { label: "ICY (SHOUTcast v1)", value: "icy" },
];

export default function PanelConexion() {
  const { obtenerNodos } = useMezclador();
  const [expandido, setExpandido] = useState(true);
  const [config, setConfig] = useState({
    host: "",
    port: 8000,
    mountpoint: "/stream",
    username: "source",
    password: "",
    bitrate: 128,
    contentType: "audio/mpeg",
    nombre: "",
    protocolo: "auto",
  });

  const [tipoServidor, setTipoServidor] = useState("centova");

  const [estado, setEstado] = useState("desconectado"); // desconectado | conectando | conectado | error
  const [mensaje, setMensaje] = useState("");
  const [testResult, setTestResult] = useState(null); // { ok, mensaje }
  const [testeando, setTesteando] = useState(false);
  const [stats, setStats] = useState({ bytesEnviados: 0, duracion: 0 });
  const [estacionId, setEstacionId] = useState(null);

  // WebSocket para enviar audio chunks
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const statsInterval = useRef(null);

  // Cargar la primera estación como destino
  useEffect(() => {
    api.estaciones().then((est) => {
      if (est.length > 0) {
        const e = est[0];
        setEstacionId(e.id);
        setConfig((c) => ({
          ...c,
          host: e.host || c.host,
          port: e.puerto || c.port,
          mountpoint: e.montaje || c.mountpoint,
          nombre: e.nombre || c.nombre,
          bitrate: e.bitrate || c.bitrate,
        }));
      }
    }).catch(() => {});
  }, []);

  // Polling de estado mientras está conectado
  useEffect(() => {
    if (estado === "conectado" && estacionId) {
      statsInterval.current = setInterval(async () => {
        try {
          const s = await api.streamingEstado(estacionId);
          setStats({ bytesEnviados: s.bytesEnviados || 0, duracion: s.duracion || 0 });
        } catch { /* noop */ }
      }, 3000);
    }
    return () => clearInterval(statsInterval.current);
  }, [estado, estacionId]);

  function set(campo, valor) {
    setConfig((c) => ({ ...c, [campo]: valor }));
    setTestResult(null);
  }

  async function testear() {
    setTesteando(true);
    setTestResult(null);
    try {
      const r = await api.streamingTest(config);
      setTestResult(r);
    } catch (err) {
      setTestResult({ ok: false, mensaje: err.message });
    } finally {
      setTesteando(false);
    }
  }

  async function conectar() {
    if (!estacionId) {
      setMensaje("No hay estación configurada. Crea una estación en el Dashboard primero.");
      setEstado("error");
      return;
    }

    setEstado("conectando");
    setMensaje("");

    try {
      // 1. Pedir al backend que abra la conexión a Icecast
      const r = await api.streamingConectar({ estacionId, ...config });
      if (!r.ok) {
        setEstado("error");
        setMensaje(r.mensaje || "El backend no pudo conectar al servidor de streaming.");
        return;
      }

      // 2. Conectar WebSocket para enviar audio chunks
      // Determinar el host del backend: si VITE_API_URL está definido, usar ese host.
      // Si no, usar window.location.host (frontend servido por el mismo backend).
      let wsHost = window.location.host;
      let wsProto = window.location.protocol === "https:" ? "wss" : "ws";
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        try {
          const parsed = new URL(apiUrl);
          wsHost = parsed.host;
          wsProto = parsed.protocol === "https:" ? "wss" : "ws";
        } catch { /* usar window.location */ }
      }
      const token = localStorage.getItem("pro_token") || "";
      if (!token) {
        setEstado("error");
        setMensaje("No hay token de autenticación. Cierra sesión y vuelve a iniciar.");
        return;
      }
      const wsUrl = `${wsProto}://${wsHost}/ws-stream?estacionId=${estacionId}&token=${encodeURIComponent(token)}`;
      console.log("[PanelConexion] Abriendo WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[PanelConexion] WebSocket abierto correctamente");
        wsRef.current = ws;
        iniciarCaptura();
        setEstado("conectado");
        setMensaje("Transmitiendo al aire.");
      };

      let wsErrorHandled = false;

      ws.onmessage = (ev) => {
        // El backend puede enviar mensajes JSON (estado, errores)
        if (typeof ev.data === "string") {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.tipo === "error") {
              setEstado("error");
              setMensaje(msg.mensaje || "Error del servidor de streaming.");
              ws.close();
            } else if (msg.tipo === "stats") {
              setStats({ bytesEnviados: msg.bytesEnviados || 0, duracion: msg.duracion || 0 });
            } else if (msg.tipo === "listo") {
              console.log("[PanelConexion] Backend listo:", msg.formato);
            }
          } catch { /* no es JSON, ignorar */ }
        }
      };

      ws.onerror = (ev) => {
        console.error("[PanelConexion] WebSocket error:", ev);
        if (!wsErrorHandled) {
          wsErrorHandled = true;
          setEstado("error");
          setMensaje(
            `Error al conectar WebSocket de audio.\n` +
            `URL: ${wsUrl}\n` +
            `Posibles causas:\n` +
            `• El backend no está corriendo o no es accesible\n` +
            `• Un proxy/firewall bloquea WebSockets\n` +
            `• El token de sesión expiró (recargar página)`
          );
        }
      };

      ws.onclose = (ev) => {
        console.log("[PanelConexion] WebSocket cerrado:", ev.code, ev.reason);
        detenerCaptura();
        wsRef.current = null;
        if (wsErrorHandled) return;
        setEstado((prev) => {
          if (prev === "conectado") {
            setMensaje(`Conexión cerrada${ev.code !== 1000 ? ` (código ${ev.code}${ev.reason ? ": " + ev.reason : ""})` : ""}.`);
            return "desconectado";
          }
          if (prev === "conectando") {
            setMensaje(`No se pudo establecer la conexión WebSocket (código ${ev.code}).`);
            return "error";
          }
          return prev;
        });
      };
    } catch (err) {
      setEstado("error");
      setMensaje(err.message || "No se pudo conectar.");
    }
  }

  async function desconectar() {
    detenerCaptura();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    try {
      await api.streamingDesconectar(estacionId);
    } catch { /* noop */ }
    setEstado("desconectado");
    setMensaje("Desconectado.");
    setStats({ bytesEnviados: 0, duracion: 0 });
  }

  function iniciarCaptura() {
    try {
      // Obtener los nodos del mezclador (masterGain → destination)
      const nodos = obtenerNodos();
      if (!nodos) {
        setMensaje("Inicia el mezclador primero (reproduce algo en un deck).");
        return;
      }

      const ctx = nodos.ctx;
      // Crear un MediaStreamDestination desde el masterGain
      const dest = ctx.createMediaStreamDestination();
      nodos.masterGain.connect(dest);
      streamRef.current = dest;

      // MediaRecorder para codificar el audio
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(dest.stream, {
        mimeType,
        audioBitsPerSecond: (config.bitrate || 128) * 1000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then((buf) => {
            wsRef.current.send(buf);
          });
        }
      };

      // Enviar chunks cada 250ms para baja latencia
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error("[Captura Audio]", err);
      setMensaje("Error al capturar audio del mezclador: " + err.message);
    }
  }

  function detenerCaptura() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current = null;
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDuracion(segs) {
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    const s = segs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const conectado = estado === "conectado";

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-surface2/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            conectado ? "bg-emerald-500/20 text-emerald-400" : "bg-brand-500/15 text-brand-500"
          }`}>
            {conectado ? <Wifi size={20} /> : <Radio size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg">Conexión al Servidor</h3>
            <p className="text-xs text-muted">
              {conectado
                ? `Al aire · ${formatDuracion(stats.duracion)} · ${formatBytes(stats.bytesEnviados)}`
                : estado === "conectando"
                  ? "Conectando..."
                  : SERVER_PRESETS.find((p) => p.value === tipoServidor)?.label || "Icecast / Centova Cast"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de estado */}
          <span className={`flex h-3 w-3 rounded-full ${
            conectado ? "bg-emerald-500 animate-pulse" :
            estado === "conectando" ? "bg-amber-500 animate-pulse" :
            estado === "error" ? "bg-red-500" :
            "bg-slate-500"
          }`} />
          {expandido ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
        </div>
      </button>

      {expandido && (
        <div className="border-t border-line p-4 space-y-4">
          {/* Estado visual */}
          {conectado && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
              <Signal size={18} className="text-emerald-400 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-400">Transmitiendo en vivo</p>
                <p className="text-xs text-muted">
                  {config.host}:{config.port}{config.mountpoint} · {config.bitrate} kbps
                </p>
              </div>
              <div className="text-right text-xs text-muted">
                <p>{formatDuracion(stats.duracion)}</p>
                <p>{formatBytes(stats.bytesEnviados)}</p>
              </div>
            </div>
          )}

          {estado === "error" && mensaje && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 whitespace-pre-line">{mensaje}</p>
            </div>
          )}

          {/* Formulario de conexión */}
          {!conectado && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Tipo de servidor */}
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Tipo de servidor</label>
                <select
                  className="input mt-1"
                  value={tipoServidor}
                  onChange={(e) => {
                    const preset = SERVER_PRESETS.find((p) => p.value === e.target.value);
                    setTipoServidor(e.target.value);
                    if (preset) {
                      setConfig((c) => ({
                        ...c,
                        port: preset.port,
                        protocolo: preset.protocolo,
                        username: preset.username || c.username,
                        mountpoint: preset.mountpoint,
                      }));
                    }
                  }}
                >
                  {SERVER_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              {/* Protocolo */}
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Protocolo</label>
                <select
                  className="input mt-1"
                  value={config.protocolo}
                  onChange={(e) => set("protocolo", e.target.value)}
                >
                  {PROTOCOLOS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              {/* Ayuda contextual del tipo de servidor */}
              {SERVER_PRESETS.find((p) => p.value === tipoServidor)?.ayuda && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    💡 {SERVER_PRESETS.find((p) => p.value === tipoServidor).ayuda}
                  </p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Host del servidor</label>
                <input
                  className="input mt-1"
                  value={config.host}
                  onChange={(e) => set("host", e.target.value)}
                  placeholder="topradio.us"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Puerto</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={config.port}
                  onChange={(e) => set("port", Number(e.target.value))}
                  placeholder="8000"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Punto de montaje</label>
                <input
                  className="input mt-1"
                  value={config.mountpoint}
                  onChange={(e) => set("mountpoint", e.target.value)}
                  placeholder="/stream"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Usuario source</label>
                <input
                  className="input mt-1"
                  value={config.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="source"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Contraseña source</label>
                <input
                  type="password"
                  className="input mt-1"
                  value={config.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted">Calidad</label>
                <select
                  className="input mt-1"
                  value={config.bitrate}
                  onChange={(e) => {
                    const preset = PRESETS.find((p) => p.bitrate === Number(e.target.value));
                    if (preset) {
                      set("bitrate", preset.bitrate);
                      set("contentType", preset.contentType);
                    }
                  }}
                >
                  {PRESETS.map((p) => (
                    <option key={p.bitrate} value={p.bitrate}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Resultado del test */}
          {testResult && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              testResult.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              {testResult.ok ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <span className="whitespace-pre-line">{testResult.mensaje}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {!conectado ? (
              <>
                <button
                  onClick={testear}
                  disabled={testeando || !config.host || !config.password}
                  className="btn-ghost flex-1"
                >
                  {testeando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Probar conexión
                </button>
                <button
                  onClick={conectar}
                  disabled={estado === "conectando" || !config.host || !config.password}
                  className="btn-primary flex-1"
                >
                  {estado === "conectando" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plug size={14} />
                  )}
                  {estado === "conectando" ? "Conectando..." : "Conectar y transmitir"}
                </button>
              </>
            ) : (
              <button onClick={desconectar} className="btn-danger flex-1">
                <Unplug size={14} /> Desconectar
              </button>
            )}
          </div>

          {/* Nota informativa */}
          {!conectado && (
            <p className="text-[10px] text-muted text-center">
              Soporta Centova Cast, Icecast 2.4+, AzuraCast y SHOUTcast. El protocolo se auto-detecta o puedes forzarlo manualmente.
              Asegurate de tener al menos un deck reproduciendo antes de conectar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
