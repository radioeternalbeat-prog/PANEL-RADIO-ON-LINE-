import { useEffect, useRef, useState } from "react";
import {
  Copy,
  DatabaseBackup,
  Download,
  KeyRound,
  Loader2,
  Save,
  Server,
  Sliders,
  Upload,
  Users,
} from "lucide-react";
import { api } from "../api/client";
import { bitratesSoportados, formatosSoportados } from "../data/mockData";
import PanelMidiMapping from "../components/configuracion/PanelMidiMapping";

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function Configuracion() {
  const [cfg, setCfg] = useState({
    nombre: "",
    host: "",
    puerto: "",
    montaje: "",
    formato: "MP3",
    bitrate: 128,
    oyentesMaximos: 100,
    autodj: false,
    publica: true,
    genero: "",
    descripcion: "",
    sourceUser: "",
    sourcePassword: "",
  });
  const [estacionId, setEstacionId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorCfg, setErrorCfg] = useState(null);

  // Cambio de contraseña del panel.
  const [pwd, setPwd] = useState({ actual: "", nueva: "", confirmar: "" });
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdCargando, setPwdCargando] = useState(false);

  // Respaldo (copia de seguridad).
  const [bkMsg, setBkMsg] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const inputBackup = useRef(null);

  async function exportarBackup() {
    setBkMsg(null);
    setExportando(true);
    try {
      const datos = await api.exportarBackup();
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eternal-beat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBkMsg({
        tipo: "ok",
        texto: `Copia descargada (${datos.totalRegistros} registros). Guárdala en un lugar seguro.`,
      });
    } catch (err) {
      setBkMsg({ tipo: "error", texto: err.message || "No se pudo exportar." });
    } finally {
      setExportando(false);
    }
  }

  function onArchivoBackup(ev) {
    const archivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = async () => {
      let datos;
      try {
        datos = JSON.parse(lector.result);
      } catch {
        setBkMsg({ tipo: "error", texto: "El archivo no es una copia válida (JSON inválido)." });
        return;
      }
      if (
        !confirm(
          "Esto REEMPLAZARÁ todos los datos actuales (estaciones, playlists, programación, etc.) por los de la copia. ¿Continuar?"
        )
      )
        return;
      setImportando(true);
      setBkMsg(null);
      try {
        const r = await api.importarBackup(datos);
        setBkMsg({ tipo: "ok", texto: r.mensaje });
      } catch (err) {
        setBkMsg({ tipo: "error", texto: err.message || "No se pudo restaurar." });
      } finally {
        setImportando(false);
      }
    };
    lector.readAsText(archivo);
  }

  async function cambiarClave() {
    setPwdMsg(null);
    if (pwd.nueva !== pwd.confirmar) {
      setPwdMsg({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }
    setPwdCargando(true);
    try {
      const r = await api.cambiarClave(pwd.actual, pwd.nueva);
      setPwdMsg({ tipo: "ok", texto: r.mensaje });
      setPwd({ actual: "", nueva: "", confirmar: "" });
    } catch (err) {
      setPwdMsg({ tipo: "error", texto: err.message });
    } finally {
      setPwdCargando(false);
    }
  }

  // Cargar datos reales de la estación desde la API al montar.
  useEffect(() => {
    async function cargarEstacion() {
      setCargando(true);
      try {
        const estaciones = await api.estaciones();
        if (estaciones && estaciones.length > 0) {
          const e = estaciones[0];
          setEstacionId(e.id);
          setCfg({
            nombre: e.nombre || "",
            host: e.host || "",
            puerto: e.puerto || "",
            montaje: e.montaje || "",
            formato: e.formato || "MP3",
            bitrate: e.bitrate || 128,
            oyentesMaximos: e.oyentesMaximos || e.oyentes_maximos || 100,
            autodj: Boolean(e.autodj),
            publica: true,
            genero: e.genero || "Variada",
            descripcion: e.descripcion || "",
            sourceUser: e.sourceUser || "",
            sourcePassword: "",
          });
        }
      } catch (err) {
        setErrorCfg("No se pudo cargar la configuración: " + (err.message || "Error desconocido"));
      } finally {
        setCargando(false);
      }
    }
    cargarEstacion();
  }, []);

  function set(campo, valor) {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar(ev) {
    ev.preventDefault();
    setGuardando(true);
    setErrorCfg(null);
    try {
      await api.actualizarEstacion(estacionId, {
        nombre: cfg.nombre,
        host: cfg.host,
        puerto: Number(cfg.puerto),
        montaje: cfg.montaje,
        formato: cfg.formato,
        bitrate: Number(cfg.bitrate),
        oyentes_maximos: Number(cfg.oyentesMaximos),
        autodj: cfg.autodj ? 1 : 0,
        genero: cfg.genero,
        descripcion: cfg.descripcion,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err) {
      setErrorCfg(err.message || "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  }

  const urlStream = `http://${cfg.host}:${cfg.puerto}${cfg.montaje}`;

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-500" />
        <span className="ml-3 text-muted">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Configuración</h1>
        <p className="text-sm text-muted">Ajustes del servidor de streaming y la estación.</p>
      </div>

      {errorCfg && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{errorCfg}</p>
      )}

      <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Datos del servidor</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nombre de la estación">
                <input className="input" value={cfg.nombre} onChange={(ev) => set("nombre", ev.target.value)} />
              </Campo>
              <Campo label="Género">
                <input className="input" value={cfg.genero} onChange={(ev) => set("genero", ev.target.value)} />
              </Campo>
              <Campo label="Host">
                <input className="input" value={cfg.host} onChange={(ev) => set("host", ev.target.value)} />
              </Campo>
              <Campo label="Puerto">
                <input type="number" className="input" value={cfg.puerto} onChange={(ev) => set("puerto", ev.target.value)} />
              </Campo>
              <Campo label="Punto de montaje">
                <input className="input" value={cfg.montaje} onChange={(ev) => set("montaje", ev.target.value)} />
              </Campo>
              <Campo label="Oyentes máximos">
                <input type="number" className="input" value={cfg.oyentesMaximos} onChange={(ev) => set("oyentesMaximos", ev.target.value)} />
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Descripción">
                  <textarea className="input min-h-[80px] resize-y" value={cfg.descripcion} onChange={(ev) => set("descripcion", ev.target.value)} />
                </Campo>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sliders size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Calidad de audio</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Formato">
                <select className="input" value={cfg.formato} onChange={(ev) => set("formato", ev.target.value)}>
                  {formatosSoportados.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Bitrate (kbps)">
                <select className="input" value={cfg.bitrate} onChange={(ev) => set("bitrate", Number(ev.target.value))}>
                  {bitratesSoportados.map((b) => (
                    <option key={b} value={b}>{b} kbps</option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-lg bg-surface2 px-4 py-3">
                <span className="text-sm font-medium text-fg">Activar AutoDJ</span>
                <input type="checkbox" className="h-5 w-9 cursor-pointer accent-brand-500" checked={cfg.autodj} onChange={(ev) => set("autodj", ev.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-lg bg-surface2 px-4 py-3">
                <span className="text-sm font-medium text-fg">Listar en directorios públicos</span>
                <input type="checkbox" className="h-5 w-9 cursor-pointer accent-brand-500" checked={cfg.publica} onChange={(ev) => set("publica", ev.target.checked)} />
              </label>
            </div>
          </div>

          {/* Mapeo MIDI: cada usuario conecta su propio controlador y asigna
              libremente los controles del mezclador, audifonos, reproductor
              y soundboard. El perfil se guarda en la cuenta del usuario.
              Todos sus botones son type="button" para no disparar el submit
              de este formulario. */}
          <PanelMidiMapping />
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-fg">URL del stream</h2>
            <div className="flex items-center gap-2 rounded-lg bg-[#121214] p-3">
              <code className="flex-1 truncate text-xs text-brand-300">{urlStream}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(urlStream)} className="text-slate-400 hover:text-white">
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Comparte esta URL para que los oyentes sintonicen tu radio.</p>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Credenciales del stream</h2>
            </div>
            <div className="space-y-3">
              <Campo label="Usuario fuente (DJ)">
                <input className="input" value={cfg.sourceUser || ""} onChange={(ev) => set("sourceUser", ev.target.value)} placeholder="source" />
              </Campo>
              <Campo label="Contraseña fuente">
                <input type="password" className="input" value={cfg.sourcePassword || ""} onChange={(ev) => set("sourcePassword", ev.target.value)} placeholder="••••••••" />
              </Campo>
            </div>
          </div>

          {/* Cambiar contraseña del panel (real) */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Contraseña del panel</h2>
            </div>
            <div className="space-y-3">
              <Campo label="Contraseña actual">
                <input
                  type="password"
                  className="input"
                  value={pwd.actual}
                  onChange={(e) => setPwd((p) => ({ ...p, actual: e.target.value }))}
                />
              </Campo>
              <Campo label="Nueva contraseña">
                <input
                  type="password"
                  className="input"
                  value={pwd.nueva}
                  onChange={(e) => setPwd((p) => ({ ...p, nueva: e.target.value }))}
                />
              </Campo>
              <Campo label="Confirmar nueva">
                <input
                  type="password"
                  className="input"
                  value={pwd.confirmar}
                  onChange={(e) => setPwd((p) => ({ ...p, confirmar: e.target.value }))}
                />
              </Campo>
              {pwdMsg && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    pwdMsg.tipo === "ok"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {pwdMsg.texto}
                </p>
              )}
              <button
                type="button"
                onClick={cambiarClave}
                className="btn-primary w-full"
                disabled={pwdCargando}
              >
                {pwdCargando ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Actualizar contraseña
              </button>
            </div>
          </div>

          {/* Respaldo / copia de seguridad */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <DatabaseBackup size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Copia de seguridad</h2>
            </div>
            <p className="mb-3 text-xs text-muted">
              Descarga un respaldo completo de tus datos (estaciones, playlists, programación,
              biblioteca, mensajes y ajustes) o restaura desde un archivo.
            </p>
            <input
              ref={inputBackup}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onArchivoBackup}
            />
            <div className="space-y-2">
              <button
                type="button"
                onClick={exportarBackup}
                className="btn-primary w-full"
                disabled={exportando}
              >
                {exportando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Exportar copia
              </button>
              <button
                type="button"
                onClick={() => inputBackup.current?.click()}
                className="btn-ghost w-full"
                disabled={importando}
              >
                {importando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Importar / restaurar
              </button>
            </div>
            {bkMsg && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  bkMsg.tipo === "ok"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {bkMsg.texto}
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full py-2.5" disabled={guardando}>
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          {guardado && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Configuración guardada correctamente
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
