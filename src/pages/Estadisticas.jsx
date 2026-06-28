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

const COLORES = ["#1f60f1", "#3380fc", "#59a5ff", "#8ec6ff", "#bcdcff", "#cbd5e1"];

function MiniStat({ icon: Icon, etiqueta, valor, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{etiqueta}</p>
        <p className="text-xl font-bold text-slate-800">{valor}</p>
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

  // Oyentes en vivo desde el WebSocket sobreescriben el total mostrado.
  const totalOyentes = realtime?.totalOyentes ?? resumen?.totalOyentes ?? 0;

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estadísticas</h1>
          <p className="text-sm text-slate-500">Análisis de audiencia y consumo de recursos.</p>
        </div>
        <button className="btn-ghost">
          <Download size={16} /> Exportar reporte
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Users} etiqueta="Oyentes ahora" valor={totalOyentes} color="bg-brand-100 text-brand-700" />
        <MiniStat icon={Clock} etiqueta="Promedio (24h)" valor={resumen?.promedio ?? 0} color="bg-emerald-100 text-emerald-700" />
        <MiniStat icon={Radio} etiqueta="Pico del día" valor={resumen?.picoDia ?? 0} color="bg-amber-100 text-amber-700" />
        <MiniStat icon={Globe2} etiqueta="Ancho banda (sem)" valor={`${resumen?.totalGb ?? 0} GB`} color="bg-violet-100 text-violet-700" />
      </div>

      {/* Oyentes por hora */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Oyentes en las últimas 24 horas</h2>
          <span className="badge bg-emerald-100 text-emerald-700">En vivo</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={porHora} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOyentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f60f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1f60f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={2} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Area type="monotone" dataKey="oyentes" stroke="#1f60f1" strokeWidth={2} fill="url(#colorOyentes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oyentes por país */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Oyentes por país</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porPais} dataKey="oyentes" nameKey="pais" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {porPais.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 sm:w-1/2">
              {porPais.map((p, i) => (
                <div key={p.pais} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-3 w-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                    {p.pais}
                  </span>
                  <span className="font-semibold text-slate-800">{p.oyentes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ancho de banda */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Ancho de banda por día (GB)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anchoBanda} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="gb" fill="#3380fc" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla por estación */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-800">Detalle por estación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Estación</th>
                <th className="px-5 py-3">Oyentes</th>
                <th className="px-5 py-3">Pico</th>
                <th className="px-5 py-3">Bitrate</th>
                <th className="px-5 py-3">Formato</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estaciones.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{e.nombre}</td>
                  <td className="px-5 py-3 text-slate-600">{e.oyentesActuales}</td>
                  <td className="px-5 py-3 text-slate-600">{e.picoOyentes}</td>
                  <td className="px-5 py-3 text-slate-600">{e.bitrate} kbps</td>
                  <td className="px-5 py-3 text-slate-600">{e.formato}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${e.estado === "online" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
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
