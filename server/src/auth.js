import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { usuariosRepo } from "./db/repos.js";

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ FATAL: JWT_SECRET no está definido. Define la variable de entorno JWT_SECRET antes de iniciar en producción.");
    process.exit(1);
  }
  console.warn("⚠️  JWT_SECRET no definido. Usando clave de desarrollo (NO usar en producción).");
  return "dev-only-secret-" + Date.now();
})();
const JWT_EXPIRA = process.env.JWT_EXPIRA || "8h";

export function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRA }
  );
}

export function login(nombreUsuario, clave) {
  const usuario = usuariosRepo.porUsuario(nombreUsuario);
  if (!usuario) return null;
  const ok = bcrypt.compareSync(clave, usuario.clave_hash);
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
