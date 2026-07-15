// Utilidades para la programación horaria del AutoDJ.
// Orden de la semana usado para rangos tipo "L-V" (Lunes a Viernes).
export const DIAS = [
  { codigo: "L", nombre: "Lun" },
  { codigo: "M", nombre: "Mar" },
  { codigo: "X", nombre: "Mié" },
  { codigo: "J", nombre: "Jue" },
  { codigo: "V", nombre: "Vie" },
  { codigo: "S", nombre: "Sáb" },
  { codigo: "D", nombre: "Dom" },
];

const ORDEN = DIAS.map((d) => d.codigo);
// getDay(): 0=Dom, 1=Lun ... 6=Sáb  ->  código de día.
const JS_A_CODIGO = ["D", "L", "M", "X", "J", "V", "S"];

// Expande una cadena de días a un Set de códigos. Acepta:
//  - lista: "L,M,X,J,V"
//  - rango: "L-V"  (Lunes a Viernes según ORDEN)
//  - mezcla separada por comas.
export function expandirDias(dias = "") {
  const out = new Set();
  if (!dias) return out;
  for (const token of dias.split(",").map((t) => t.trim()).filter(Boolean)) {
    if (token.includes("-")) {
      const [a, b] = token.split("-").map((s) => s.trim().toUpperCase());
      const ia = ORDEN.indexOf(a);
      const ib = ORDEN.indexOf(b);
      if (ia >= 0 && ib >= 0) {
        for (let i = ia; i !== (ib + 1) % ORDEN.length; i = (i + 1) % ORDEN.length) {
          out.add(ORDEN[i]);
        }
      }
    } else {
      out.add(token.toUpperCase());
    }
  }
  return out;
}

// Etiqueta legible y compacta para una cadena de días.
export function etiquetaDias(dias = "") {
  const set = expandirDias(dias);
  if (set.size === 0) return "Sin días";
  if (set.size === 7) return "Todos los días";
  return ORDEN.filter((c) => set.has(c))
    .map((c) => DIAS.find((d) => d.codigo === c).nombre)
    .join(", ");
}

// Convierte "HH:MM" a minutos desde medianoche.
function aMinutos(hora = "00:00") {
  const [h, m] = String(hora).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ¿El bloque está al aire en la fecha dada? Maneja franjas que cruzan medianoche.
export function bloqueAlAire(programa, fecha = new Date()) {
  if (!programa) return false;
  const dias = expandirDias(programa.dias);
  const codigoHoy = JS_A_CODIGO[fecha.getDay()];
  const codigoAyer = JS_A_CODIGO[(fecha.getDay() + 6) % 7];
  const ahora = fecha.getHours() * 60 + fecha.getMinutes();
  const ini = aMinutos(programa.inicio);
  let fin = aMinutos(programa.fin);
  // "00:00" como fin se interpreta como medianoche del día siguiente.
  if (fin === 0) fin = 24 * 60;

  if (ini <= fin) {
    // Franja dentro del mismo día.
    return dias.has(codigoHoy) && ahora >= ini && ahora < fin;
  }
  // Franja que cruza medianoche (ej. 22:00 -> 02:00).
  if (ahora >= ini) return dias.has(codigoHoy); // tramo nocturno del día actual
  if (ahora < fin) return dias.has(codigoAyer); // madrugada que pertenece al día anterior
  return false;
}

// Devuelve el primer bloque al aire ahora (o null).
export function bloqueActivo(programas = [], fecha = new Date()) {
  return programas.find((p) => bloqueAlAire(p, fecha)) || null;
}
