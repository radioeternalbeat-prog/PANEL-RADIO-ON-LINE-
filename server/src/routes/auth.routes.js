import { Router } from "express";
import { login } from "../auth.js";
import { requiereAuth } from "../auth.js";
import { usuariosRepo } from "../db/repos.js";

const router = Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
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

export default router;
