// ============================================================
// Autenticación Multi-Tenant
// Maneja login/registro para clientes (tenants) del sistema de licencias.
// Coexiste con el auth.js existente (que gestiona el admin legacy).
// Usa el MISMO JWT_SECRET que auth.js para que los tokens sean compatibles.
// ============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { tenantsRepo } from "./db/licencias.js";
import { verificarToken } from "./auth.js";

// Reusar el mismo secret que auth.js (importamos verificarToken para confirmar compatibilidad)
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-fallback-key";
const JWT_EXPIRA = process.env.JWT_EXPIRA || "8h";

/**
 * Login de un tenant (cliente).
 * Retorna token JWT + datos del usuario, o null si falla.
 */
export function loginTenant(usuario, clave) {
  const raw = tenantsRepo.porUsuarioRaw(usuario);
  if (!raw) return null;

  const ok = bcrypt.compareSync(clave, raw.clave_hash);
  if (!ok) return null;

  const tenant = tenantsRepo.obtener(raw.id);
  const token = jwt.sign(
    {
      id: raw.id,
      tenantId: raw.id,
      usuario: raw.usuario,
      rol: raw.rol,
      tipo: "tenant",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRA }
  );

  return {
    token,
    usuario: {
      id: tenant.id,
      usuario: tenant.usuario,
      nombre: tenant.nombre,
      email: tenant.email,
      rol: tenant.rol,
      licenciaActiva: tenant.licenciaActiva,
      enTrial: tenant.enTrial,
      trialExpirado: tenant.trialExpirado,
      diasRestantes: tenant.diasRestantes,
      plan: tenant.planId ? tenant.planId : null,
    },
  };
}

/**
 * Registro de un nuevo tenant (cliente).
 * Crea la cuenta con trial de 7 días.
 */
export function registrarTenant({ nombre, email, telefono, usuario, clave }) {
  // Validaciones
  if (!nombre || !email || !usuario || !clave) {
    throw new Error("Nombre, email, usuario y contraseña son obligatorios.");
  }
  if (clave.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw new Error("El email no es válido.");
  }
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(usuario)) {
    throw new Error("El usuario debe tener entre 3-30 caracteres (letras, números, _ . -).");
  }

  // Verificar que no exista
  if (tenantsRepo.porEmail(email)) {
    throw new Error("Ya existe una cuenta con ese email.");
  }
  if (tenantsRepo.porUsuario(usuario)) {
    throw new Error("Ese nombre de usuario ya está en uso.");
  }

  // Crear tenant
  const tenant = tenantsRepo.crear({ nombre, email, telefono, usuario, clave });

  // Generar token para login automático tras registro
  const token = jwt.sign(
    {
      id: tenant.id,
      tenantId: tenant.id,
      usuario: tenant.usuario,
      rol: tenant.rol,
      tipo: "tenant",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRA }
  );

  return {
    token,
    usuario: {
      id: tenant.id,
      usuario: tenant.usuario,
      nombre: tenant.nombre,
      email: tenant.email,
      rol: tenant.rol,
      licenciaActiva: tenant.licenciaActiva,
      enTrial: tenant.enTrial,
      diasRestantes: tenant.diasRestantes,
    },
  };
}
