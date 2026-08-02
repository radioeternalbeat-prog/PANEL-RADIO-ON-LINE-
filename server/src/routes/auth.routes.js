import { Router } from "express";
import bcrypt from "bcryptjs";
import { login } from "../auth.js";
import { requiereAuth } from "../auth.js";
import { usuariosRepo } from "../db/repos.js";
import { crearRateLimit } from "../rateLimit.js";

// Máximo 5 intentos de login por minuto por IP.
const loginLimiter = crearRateLimit({
  ventanaMs: 60_000,
  max: 5,
  mensaje: "Demasiados intentos de inicio de sesión. Espera 1 minuto.",
});

// Máximo 3 intentos de cambio de clave por minuto.
const cambioLimiter = crearRateLimit({
  ventanaMs: 60_000,
  max: 3,
  mensaje: "Demasiados intentos. Espera 1 minuto.",
});

const router = Router();

// POST /api/auth/login
router.post("/login", loginLimiter, (req, res) => {
  const { usuario, clave } = req.body || {};
  if (!usuario || !clave) {
    return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios." });
  }

  const resultado = login(usuario, clave);
  if (!resultado) {
    return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
  }

  res.json(resultado);
});

// GET /api/auth/perfil  (requiere token)
router.get("/perfil", requiereAuth, (req, res) => {
  const u = usuariosRepo.porId(req.usuario.id);
  if (!u) return res.status(404).json({ mensaje: "Usuario no encontrado." });
  res.json({
    id: u.id,
    usuario: u.usuario,
    nombre: u.nombre,
    rol: u.rol,
    plan: u.plan,
  });
});

// POST /api/auth/cambiar-clave  { actual, nueva }  (requiere token)
router.post("/cambiar-clave", requiereAuth, cambioLimiter, (req, res) => {
  const { actual, nueva } = req.body || {};
  if (!actual || !nueva) {
    return res.status(400).json({ mensaje: "Faltan datos." });
  }
  if (nueva.length < 6) {
    return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 6 caracteres." });
  }
  const u = usuariosRepo.porId(req.usuario.id);
  if (!u || !bcrypt.compareSync(actual, u.clave_hash)) {
    return res.status(400).json({ mensaje: "La contraseña actual no es correcta." });
  }
  usuariosRepo.cambiarClave(u.id, bcrypt.hashSync(nueva, 10));
  res.json({ mensaje: "Contraseña actualizada correctamente." });
});

export default router;
