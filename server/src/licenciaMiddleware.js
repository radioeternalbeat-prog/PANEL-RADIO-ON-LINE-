// ============================================================
// Middleware de verificación de licencia activa.
// Bloquea el acceso a la API si el tenant no tiene licencia
// activa ni está dentro del período de prueba (7 días).
// ============================================================

import { tenantsRepo } from "./db/licencias.js";

/**
 * Middleware que verifica que el usuario autenticado (tenant) tenga
 * una licencia activa o esté dentro de su trial de 7 días.
 * 
 * Debe colocarse DESPUÉS de requiereAuth (necesita req.usuario).
 * El superadmin NUNCA es bloqueado.
 */
export function requiereLicencia(req, res, next) {
  // Si no hay usuario autenticado, dejar que requiereAuth lo maneje
  if (!req.usuario) {
    return res.status(401).json({ mensaje: "No autorizado." });
  }

  // Superadmin siempre tiene acceso
  if (req.usuario.rol === "superadmin") {
    return next();
  }

  // Buscar el tenant por su ID de usuario
  const tenant = tenantsRepo.obtener(req.usuario.tenantId || req.usuario.id);
  if (!tenant) {
    return res.status(403).json({
      mensaje: "Cuenta no encontrada.",
      codigo: "TENANT_NOT_FOUND",
    });
  }

  // Cuenta suspendida
  if (tenant.estado === "suspendido") {
    return res.status(403).json({
      mensaje: "Tu cuenta ha sido suspendida. Contacta al administrador.",
      codigo: "ACCOUNT_SUSPENDED",
    });
  }

  // Verificar licencia activa
  if (tenant.licenciaActiva && !tenant.licenciaExpirada) {
    req.tenant = tenant;
    return next();
  }

  // Verificar período de prueba
  if (tenant.enTrial) {
    req.tenant = tenant;
    req.enTrial = true;
    return next();
  }

  // Trial expirado y sin licencia → bloquear
  return res.status(402).json({
    mensaje: "Tu período de prueba ha finalizado. Adquiere una licencia para continuar usando el panel.",
    codigo: "LICENSE_REQUIRED",
    trialExpirado: true,
    diasRestantes: 0,
  });
}

/**
 * Middleware que solo permite acceso al superadmin.
 * Para rutas de gestión de clientes, planes y licencias.
 */
export function requiereSuperadmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ mensaje: "No autorizado." });
  }

  if (req.usuario.rol !== "superadmin") {
    return res.status(403).json({
      mensaje: "Acceso restringido. Solo el administrador de la plataforma puede acceder.",
      codigo: "SUPERADMIN_REQUIRED",
    });
  }

  next();
}

/**
 * Middleware que inyecta info de licencia en la respuesta para que
 * el frontend muestre avisos (ej: "Te quedan 3 días de trial").
 * NO bloquea, solo adjunta headers informativos.
 */
export function infoLicencia(req, res, next) {
  if (!req.usuario || req.usuario.rol === "superadmin") {
    return next();
  }

  const tenant = tenantsRepo.obtener(req.usuario.tenantId || req.usuario.id);
  if (tenant) {
    res.set("X-License-Active", tenant.licenciaActiva ? "1" : "0");
    res.set("X-License-Trial", tenant.enTrial ? "1" : "0");
    res.set("X-License-Days-Left", String(tenant.diasRestantes));
    if (tenant.trialExpirado && !tenant.licenciaActiva) {
      res.set("X-License-Expired", "1");
    }
  }

  next();
}
