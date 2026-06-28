import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Download, Globe2, Loader2, Radio, Users } from "lucide-react";
import { api } from "../api/client";
import { useRealtime } from "../hooks/useRealtime";
import { useTheme } from "../context/ThemeContext";

const COLORES = ["#ff8000", "#ffb020", "#ff9c2e", "#bf5e00", "#ffcb8f", "#71717a"];

function MiniStat({ icon: Icon, etiqueta, valor, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-muted">{etiqueta}</p>
        <p className="font-display text-xl font-bold text-fg">{valor}</p>
      </div>
    </div>
  );
}

export default function Estadisticas() {
  const [resumen, setResumen] = useState(null);
  const [porHora, setPorHora] = useState([]);
  const [porPais, setPorPais] = useState([]);
  const [anchoBanda, setAnchoBanda] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { datos: realtime } = useRealtime();
  const { esOscuro } = useTheme();

  const ejeColor = esOscuro ? "#a0a0a8" : "#71717a";
  const gridColor = esOscuro ? "#34343b" : "#ececee";
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${esOscuro ? "#34343b" : "#e2e2e5"}`,
    background: esOscuro ? "#1b1b1f" : "#ffffff",
    color: esOscuro ? "#f5f5f4" : "#18181b",
    fontSize: 13,
  };

  useEffect(() => {
    Promise.all([
      api.resumen(),
      api.oyentesPorHora(),
      api.oyentesPorPais(),
      api.anchoBanda(),
      api.estaciones(),
    ])
      .then(([r, h, p, b, e]) => {
        setResumen(r);
        setPorHora(h);
        setPorPais(p);
        setAnchoBanda(b);
        setEstaciones(e);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const totalOyentes = realtime?.totalOyentes ?? resumen?.totalOyentes ?? 0;

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Estadísticas</h1>
          <p className="text-sm text-muted">Análisis de audiencia y consumo de recursos.</p>
        </div>
        <button className="btn-ghost">
          <Download size={16} /> Exportar reporte
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Users} etiqueta="Oyentes ahora" valor={totalOyentes} color="bg-brand-500/15 text-brand-500" />
        <MiniStat icon={Clock} etiqueta="Promedio (24h)" valor={resumen?.promedio ?? 0} color="bg-emerald-500/15 text-emerald-500" />
        <MiniStat icon={Radio} etiqueta="Pico del día" valor={resumen?.picoDia ?? 0} color="bg-amber-500/15 text-amber-500" />
        <MiniStat icon={Globe2} etiqueta="Ancho banda (sem)" valor={`${resumen?.totalGb ?? 0} GB`} color="bg-accent-500/15 text-accent-500" />
      </div>

      {/* Oyentes por hora */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-fg">Oyentes en las últimas 24 horas</h2>
          <span className="badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">En vivo</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={porHora} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOyentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff8000" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff8000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: ejeColor }} interval={2} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ejeColor }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="oyentes" stroke="#ff8000" strokeWidth={2} fill="url(#colorOyentes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oyentes por país */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-fg">Oyentes por país</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porPais} dataKey="oyentes" nameKey="pais" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {porPais.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 sm:w-1/2">
              {porPais.map((p, i) => (
                <div key={p.pais} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-3 w-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                    {p.pais}
                  </span>
                  <span className="font-semibold text-fg">{p.oyentes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ancho de banda */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-fg">Ancho de banda por día (GB)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anchoBanda} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: ejeColor }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: ejeColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} />
                <Bar dataKey="gb" fill="#ffb020" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla por estación */}
      <div className="card overflow-hidden">
        <div className="border-b border-line p-5">
          <h2 className="font-semibold text-fg">Detalle por estación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Estación</th>
                <th className="px-5 py-3">Oyentes</th>
                <th className="px-5 py-3">Pico</th>
                <th className="px-5 py-3">Bitrate</th>
                <th className="px-5 py-3">Formato</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {estaciones.map((e) => (
                <tr key={e.id} className="hover:bg-surface2">
                  <td className="px-5 py-3 font-medium text-fg">{e.nombre}</td>
                  <td className="px-5 py-3 text-muted">{e.oyentesActuales}</td>
                  <td className="px-5 py-3 text-muted">{e.picoOyentes}</td>
                  <td className="px-5 py-3 text-muted">{e.bitrate} kbps</td>
                  <td className="px-5 py-3 text-muted">{e.formato}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${e.estado === "online" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface2 text-muted"}`}>
                      {e.estado === "online" ? "En línea" : "Detenida"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
