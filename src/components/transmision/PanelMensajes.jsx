import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageCircle, Radio, Send, Trash2 } from "lucide-react";
import { api } from "../../api/client";

function tiempoRelativo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Date(ts).toLocaleDateString("es");
}

export default function PanelMensajes() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [autor, setAutor] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const intervalo = useRef(null);

  async function cargar() {
    try {
      setMensajes(await api.mensajes());
    } catch {
      /* noop */
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    intervalo.current = setInterval(cargar, 8000); // sondea nuevos mensajes
    return () => clearInterval(intervalo.current);
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api.agregarMensaje({ autor: autor.trim() || "Oyente", texto: texto.trim() });
      setTexto("");
      await cargar();
    } catch {
      /* noop */
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarEstado(m, estado) {
    setMensajes((prev) => prev.map((x) => (x.id === m.id ? { ...x, estado } : x)));
    try {
      await api.estadoMensaje(m.id, estado);
    } catch {
      cargar();
    }
  }

  async function eliminar(id) {
    setMensajes((prev) => prev.filter((m) => m.id !== id));
    try {
      await api.eliminarMensaje(id);
    } catch {
      cargar();
    }
  }

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <MessageCircle size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Mensajes</h3>
        </div>
        <span className="badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          {mensajes.filter((m) => m.estado === "pendiente").length} nuevos
        </span>
      </div>

      {/* Lista de mensajes */}
      <div className="mb-3 flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
        {cargando ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={22} />
          </div>
        ) : mensajes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Aún no hay mensajes.</p>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-3 transition ${
                m.estado === "al_aire"
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-line bg-surface2"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg">{m.autor}</span>
                  {m.origen === "whatsapp" && (
                    <span className="badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      WhatsApp
                    </span>
                  )}
                  {m.estado === "al_aire" && (
                    <span className="badge bg-brand-500/15 text-brand-500">
                      <Radio size={10} /> Al aire
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted">{tiempoRelativo(m.creado)}</span>
              </div>
              <p className="mt-1 text-sm text-fg">{m.texto}</p>
              <div className="mt-2 flex gap-1">
                {m.estado !== "al_aire" ? (
                  <button
                    onClick={() => cambiarEstado(m, "al_aire")}
                    className="rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-semibold text-brand-500 hover:bg-brand-500/25"
                  >
                    <Radio size={11} className="mr-1 inline" /> Poner al aire
                  </button>
                ) : (
                  <button
                    onClick={() => cambiarEstado(m, "leido")}
                    className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-muted hover:text-fg"
                  >
                    <Check size={11} className="mr-1 inline" /> Marcar leído
                  </button>
                )}
                <button
                  onClick={() => eliminar(m.id)}
                  className="ml-auto rounded-md px-2 py-1 text-[11px] text-muted hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Agregar mensaje manual */}
      <form onSubmit={enviar} className="space-y-2 border-t border-line pt-3">
        <input
          className="input py-1.5 text-sm"
          placeholder="Nombre del oyente (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="input py-1.5 text-sm"
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="btn-primary px-3 py-1.5" disabled={enviando}>
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
