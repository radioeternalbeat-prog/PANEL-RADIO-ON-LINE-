import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { usuarios } from "./data/store.js";

const JWT_SECRET = process.env.JWT_SECRET || "cambia-esta-clave-en-produccion";
const JWT_EXPIRA = process.env.JWT_EXPIRA || "8h";

export function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRA }
  );
}

export function login(nombreUsuario, clave) {
  const usuario = usuarios.find((u) => u.usuario === nombreUsuario);
  if (!usuario) return null;
  const ok = bcrypt.compareSync(clave, usuario.claveHash);
  if (!ok) return null;

  const token = generarToken(usuario);
  return {
    token,
    usuario: {
      id: usuario.id,
      usuario: usuario.usuario,
      nombre: usuario.nombre,
      rol: usuario.rol,
      plan: usuario.plan,
    },
  };
}

// Middleware: exige un token válido en el header Authorization: Bearer <token>
export function requiereAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ mensaje: "No autorizado: falta el token." });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado." });
  }
}

// Verifica un token y devuelve su payload (para WebSocket).
export function verificarToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
