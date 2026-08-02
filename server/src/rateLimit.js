// Rate limiter en memoria (sin dependencias externas).
// Limita requests por IP usando una ventana deslizante simple.

const almacenes = new Map();

/**
 * Crea un middleware de rate limiting.
 * @param {object} opciones
 * @param {number} opciones.ventanaMs - Ventana de tiempo en milisegundos (default: 60000 = 1 min)
 * @param {number} opciones.max - Máximo de requests por ventana (default: 10)
 * @param {string} opciones.mensaje - Mensaje de error al exceder el límite
 */
export function crearRateLimit({ ventanaMs = 60_000, max = 10, mensaje = "Demasiadas solicitudes. Intenta de nuevo más tarde." } = {}) {
  const almacen = new Map();
  const id = `rl-${Date.now()}-${Math.random()}`;
  almacenes.set(id, almacen);

  // Limpieza periódica de entradas expiradas (cada 5 minutos).
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [ip, datos] of almacen) {
      if (ahora - datos.inicio > ventanaMs * 2) {
        almacen.delete(ip);
      }
    }
  }, 5 * 60_000);
  limpieza.unref?.(); // No bloquear el shutdown de Node

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const ahora = Date.now();
    let datos = almacen.get(ip);

    if (!datos || ahora - datos.inicio > ventanaMs) {
      // Nueva ventana
      datos = { inicio: ahora, count: 1 };
      almacen.set(ip, datos);
      return next();
    }

    datos.count++;

    if (datos.count > max) {
      const reintentarEn = Math.ceil((datos.inicio + ventanaMs - ahora) / 1000);
      res.set("Retry-After", String(reintentarEn));
      return res.status(429).json({ mensaje, reintentarEn });
    }

    next();
  };
}
