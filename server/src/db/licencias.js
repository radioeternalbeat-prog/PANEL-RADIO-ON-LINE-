// ============================================================
// Sistema de Licencias + Multi-Tenant
// Esquema, migraciones y repositorios para gestión de clientes,
// planes de suscripción y pagos vía Mercado Pago.
// ============================================================

import { db } from "./db.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

// ---- Migraciones (idempotentes) ----

export function crearEsquemaLicencias() {
  db.exec(`
    -- Planes disponibles para la venta
    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      precio REAL NOT NULL,
      moneda TEXT NOT NULL DEFAULT 'CLP',
      duracion_dias INTEGER NOT NULL,
      max_estaciones INTEGER DEFAULT 1,
      max_oyentes INTEGER DEFAULT 100,
      max_storage_mb INTEGER DEFAULT 500,
      descripcion TEXT,
      activo INTEGER DEFAULT 1,
      creado INTEGER
    );

    -- Tenants (clientes / organizaciones)
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT,
      usuario TEXT UNIQUE NOT NULL,
      clave_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cliente',
      estado TEXT NOT NULL DEFAULT 'activo',
      trial_inicio INTEGER NOT NULL,
      trial_fin INTEGER NOT NULL,
      licencia_activa INTEGER DEFAULT 0,
      licencia_expira INTEGER,
      plan_id INTEGER,
      mp_customer_id TEXT,
      notas TEXT,
      creado INTEGER,
      actualizado INTEGER,
      FOREIGN KEY (plan_id) REFERENCES planes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
    CREATE INDEX IF NOT EXISTS idx_tenants_usuario ON tenants(usuario);
    CREATE INDEX IF NOT EXISTS idx_tenants_estado ON tenants(estado);

    -- Pagos registrados (historial de transacciones)
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      moneda TEXT NOT NULL DEFAULT 'CLP',
      estado TEXT NOT NULL DEFAULT 'pendiente',
      mp_payment_id TEXT,
      mp_preference_id TEXT,
      mp_status TEXT,
      mp_status_detail TEXT,
      fecha_pago INTEGER,
      creado INTEGER,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (plan_id) REFERENCES planes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pagos_tenant ON pagos(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_pagos_mp_payment ON pagos(mp_payment_id);
    CREATE INDEX IF NOT EXISTS idx_pagos_mp_preference ON pagos(mp_preference_id);

    -- Licencias históricas (cada activación/renovación)
    CREATE TABLE IF NOT EXISTS licencias_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      pago_id INTEGER,
      inicio INTEGER NOT NULL,
      fin INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'pago',
      creado INTEGER,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (plan_id) REFERENCES planes(id),
      FOREIGN KEY (pago_id) REFERENCES pagos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_licencias_hist_tenant ON licencias_historial(tenant_id);
  `);
}

// ---- Sembrado de planes por defecto ----

export function sembrarPlanes() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM planes").get().n;
  if (count > 0) return;

  const ahora = Date.now();
  const ins = db.prepare(`
    INSERT INTO planes (nombre, codigo, precio, moneda, duracion_dias, max_estaciones, max_oyentes, max_storage_mb, descripcion, activo, creado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  const planes = [
    ["Oferta Lanzamiento", "oferta_lanzamiento", 30, "USD", 36500, 5, 1000, 5000, "OFERTA LIMITADA: Pago único $30 USD. Acceso FULL para siempre. 5 estaciones, 1000 oyentes, 5GB.", 1],
    ["Starter", "starter_mensual", 9990, "CLP", 30, 1, 100, 500, "1 estación, 100 oyentes, 500MB storage", 1],
    ["Profesional", "pro_mensual", 19990, "CLP", 30, 3, 500, 2000, "3 estaciones, 500 oyentes, 2GB storage", 1],
    ["Enterprise", "enterprise_mensual", 39990, "CLP", 30, 10, 2000, 10000, "10 estaciones, 2000 oyentes, 10GB storage", 1],
    ["Starter Anual", "starter_anual", 99900, "CLP", 365, 1, 100, 500, "1 estación, 100 oyentes, 500MB - Ahorra 2 meses", 1],
    ["Profesional Anual", "pro_anual", 199900, "CLP", 365, 3, 500, 2000, "3 estaciones, 500 oyentes, 2GB - Ahorra 2 meses", 1],
    ["Enterprise Anual", "enterprise_anual", 399900, "CLP", 365, 10, 2000, 10000, "10 estaciones, 2000 oyentes, 10GB - Ahorra 2 meses", 1],
    ["Lifetime", "lifetime", 95000, "CLP", 36500, 5, 1000, 5000, "Pago único $100 USD (CLP $95.000). 5 estaciones, 1000 oyentes, 5GB para siempre", 1],
  ];

  for (const [nombre, codigo, precio, moneda, dias, est, oy, stor, desc, activo] of planes) {
    ins.run(nombre, codigo, precio, moneda, dias, est, oy, stor, desc, activo, ahora);
  }
}

// ============================================================
// REPOSITORIOS
// ============================================================

// ---- Planes ----
function mapPlan(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    codigo: r.codigo,
    precio: r.precio,
    moneda: r.moneda,
    duracionDias: r.duracion_dias,
    maxEstaciones: r.max_estaciones,
    maxOyentes: r.max_oyentes,
    maxStorageMb: r.max_storage_mb,
    descripcion: r.descripcion,
    activo: !!r.activo,
  };
}

export const planesRepo = {
  listar() {
    return db.prepare("SELECT * FROM planes WHERE activo = 1 ORDER BY precio").all().map(mapPlan);
  },
  listarTodos() {
    return db.prepare("SELECT * FROM planes ORDER BY precio").all().map(mapPlan);
  },
  obtener(id) {
    return mapPlan(db.prepare("SELECT * FROM planes WHERE id = ?").get(id));
  },
  obtenerPorCodigo(codigo) {
    return mapPlan(db.prepare("SELECT * FROM planes WHERE codigo = ?").get(codigo));
  },
  crear(d) {
    const info = db.prepare(`
      INSERT INTO planes (nombre, codigo, precio, moneda, duracion_dias, max_estaciones, max_oyentes, max_storage_mb, descripcion, activo, creado)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      d.nombre, d.codigo, d.precio, d.moneda || "CLP", d.duracionDias,
      d.maxEstaciones || 1, d.maxOyentes || 100, d.maxStorageMb || 500,
      d.descripcion || "", 1, Date.now()
    );
    return this.obtener(info.lastInsertRowid);
  },
  actualizar(id, d) {
    const actual = db.prepare("SELECT * FROM planes WHERE id = ?").get(id);
    if (!actual) return null;
    const sets = [];
    const vals = [];
    const campos = {
      nombre: "nombre", precio: "precio", moneda: "moneda",
      duracionDias: "duracion_dias", maxEstaciones: "max_estaciones",
      maxOyentes: "max_oyentes", maxStorageMb: "max_storage_mb",
      descripcion: "descripcion", activo: "activo"
    };
    for (const [k, col] of Object.entries(campos)) {
      if (d[k] !== undefined) { sets.push(`${col} = ?`); vals.push(d[k]); }
    }
    if (sets.length) {
      db.prepare(`UPDATE planes SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return this.obtener(id);
  },
};

// ---- Tenants (clientes) ----
function mapTenant(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    usuario: r.usuario,
    rol: r.rol,
    estado: r.estado,
    nombreRadio: r.nombre_radio || null,
    logoUrl: r.logo_url || null,
    trialInicio: r.trial_inicio,
    trialFin: r.trial_fin,
    licenciaActiva: !!r.licencia_activa,
    licenciaExpira: r.licencia_expira,
    planId: r.plan_id,
    mpCustomerId: r.mp_customer_id,
    notas: r.notas,
    creado: r.creado,
    actualizado: r.actualizado,
    // Computed fields
    enTrial: !r.licencia_activa && Date.now() < r.trial_fin,
    trialExpirado: !r.licencia_activa && Date.now() >= r.trial_fin,
    licenciaExpirada: r.licencia_activa && r.licencia_expira && Date.now() >= r.licencia_expira,
    diasRestantes: calcularDiasRestantes(r),
  };
}

function calcularDiasRestantes(r) {
  const ahora = Date.now();
  if (r.licencia_activa && r.licencia_expira) {
    const diff = r.licencia_expira - ahora;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  if (!r.licencia_activa && ahora < r.trial_fin) {
    const diff = r.trial_fin - ahora;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

export const tenantsRepo = {
  listar() {
    return db.prepare("SELECT * FROM tenants ORDER BY creado DESC").all().map(mapTenant);
  },
  obtener(id) {
    return mapTenant(db.prepare("SELECT * FROM tenants WHERE id = ?").get(id));
  },
  porEmail(email) {
    return mapTenant(db.prepare("SELECT * FROM tenants WHERE email = ?").get(email));
  },
  porUsuario(usuario) {
    return mapTenant(db.prepare("SELECT * FROM tenants WHERE usuario = ?").get(usuario));
  },
  porUsuarioRaw(usuario) {
    return db.prepare("SELECT * FROM tenants WHERE usuario = ?").get(usuario);
  },

  crear({ nombre, email, telefono, usuario, clave }) {
    const ahora = Date.now();
    const trialFin = ahora + 7 * 24 * 60 * 60 * 1000; // 7 días
    const claveHash = bcrypt.hashSync(clave, 10);

    const info = db.prepare(`
      INSERT INTO tenants (nombre, email, telefono, usuario, clave_hash, rol, estado, trial_inicio, trial_fin, licencia_activa, creado, actualizado)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(nombre, email, telefono || null, usuario, claveHash, "cliente", "activo", ahora, trialFin, 0, ahora, ahora);

    return this.obtener(info.lastInsertRowid);
  },

  activarLicencia(id, { planId, duracionDias, pagoId }) {
    const ahora = Date.now();
    const expira = ahora + duracionDias * 24 * 60 * 60 * 1000;

    db.prepare(`
      UPDATE tenants SET licencia_activa = 1, licencia_expira = ?, plan_id = ?, actualizado = ?
      WHERE id = ?
    `).run(expira, planId, ahora, id);

    // Registrar en historial
    db.prepare(`
      INSERT INTO licencias_historial (tenant_id, plan_id, pago_id, inicio, fin, tipo, creado)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, planId, pagoId || null, ahora, expira, pagoId ? "pago" : "manual", ahora);

    return this.obtener(id);
  },

  desactivarLicencia(id) {
    db.prepare(`
      UPDATE tenants SET licencia_activa = 0, licencia_expira = NULL, plan_id = NULL, actualizado = ?
      WHERE id = ?
    `).run(Date.now(), id);
    return this.obtener(id);
  },

  suspender(id) {
    db.prepare("UPDATE tenants SET estado = 'suspendido', actualizado = ? WHERE id = ?").run(Date.now(), id);
    return this.obtener(id);
  },

  reactivar(id) {
    db.prepare("UPDATE tenants SET estado = 'activo', actualizado = ? WHERE id = ?").run(Date.now(), id);
    return this.obtener(id);
  },

  cambiarClave(id, nuevaClave) {
    const claveHash = bcrypt.hashSync(nuevaClave, 10);
    db.prepare("UPDATE tenants SET clave_hash = ?, actualizado = ? WHERE id = ?").run(claveHash, Date.now(), id);
  },

  actualizarDatos(id, d) {
    const sets = [];
    const vals = [];
    if (d.nombre) { sets.push("nombre = ?"); vals.push(d.nombre); }
    if (d.email) { sets.push("email = ?"); vals.push(d.email); }
    if (d.telefono !== undefined) { sets.push("telefono = ?"); vals.push(d.telefono); }
    if (d.notas !== undefined) { sets.push("notas = ?"); vals.push(d.notas); }
    if (d.nombreRadio !== undefined) { sets.push("nombre_radio = ?"); vals.push(d.nombreRadio); }
    if (d.logoUrl !== undefined) { sets.push("logo_url = ?"); vals.push(d.logoUrl); }
    if (sets.length) {
      sets.push("actualizado = ?");
      vals.push(Date.now());
      db.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return this.obtener(id);
  },

  eliminar(id) {
    const t = this.obtener(id);
    if (!t) return null;
    db.prepare("DELETE FROM pagos WHERE tenant_id = ?").run(id);
    db.prepare("DELETE FROM licencias_historial WHERE tenant_id = ?").run(id);
    db.prepare("DELETE FROM tenants WHERE id = ?").run(id);
    return t;
  },

  // Estadísticas para el superadmin
  estadisticas() {
    const total = db.prepare("SELECT COUNT(*) AS n FROM tenants").get().n;
    const activos = db.prepare("SELECT COUNT(*) AS n FROM tenants WHERE estado = 'activo'").get().n;
    const conLicencia = db.prepare("SELECT COUNT(*) AS n FROM tenants WHERE licencia_activa = 1").get().n;
    const enTrial = db.prepare("SELECT COUNT(*) AS n FROM tenants WHERE licencia_activa = 0 AND trial_fin > ?").get(Date.now()).n;
    const expirados = db.prepare("SELECT COUNT(*) AS n FROM tenants WHERE licencia_activa = 0 AND trial_fin <= ?").get(Date.now()).n;
    return { total, activos, conLicencia, enTrial, expirados };
  },
};

// ---- Pagos ----
function mapPago(r) {
  if (!r) return null;
  return {
    id: r.id,
    tenantId: r.tenant_id,
    planId: r.plan_id,
    monto: r.monto,
    moneda: r.moneda,
    estado: r.estado,
    mpPaymentId: r.mp_payment_id,
    mpPreferenceId: r.mp_preference_id,
    mpStatus: r.mp_status,
    mpStatusDetail: r.mp_status_detail,
    fechaPago: r.fecha_pago,
    creado: r.creado,
  };
}

export const pagosRepo = {
  listar(tenantId) {
    if (tenantId) {
      return db.prepare("SELECT * FROM pagos WHERE tenant_id = ? ORDER BY creado DESC").all(tenantId).map(mapPago);
    }
    return db.prepare("SELECT * FROM pagos ORDER BY creado DESC LIMIT 100").all().map(mapPago);
  },

  obtener(id) {
    return mapPago(db.prepare("SELECT * FROM pagos WHERE id = ?").get(id));
  },

  porPreferencia(mpPreferenceId) {
    return mapPago(db.prepare("SELECT * FROM pagos WHERE mp_preference_id = ?").get(mpPreferenceId));
  },

  porMpPayment(mpPaymentId) {
    return mapPago(db.prepare("SELECT * FROM pagos WHERE mp_payment_id = ?").get(mpPaymentId));
  },

  crear({ tenantId, planId, monto, moneda, mpPreferenceId }) {
    const info = db.prepare(`
      INSERT INTO pagos (tenant_id, plan_id, monto, moneda, estado, mp_preference_id, creado)
      VALUES (?,?,?,?,?,?,?)
    `).run(tenantId, planId, monto, moneda || "CLP", "pendiente", mpPreferenceId || null, Date.now());
    return this.obtener(info.lastInsertRowid);
  },

  confirmar(id, { mpPaymentId, mpStatus, mpStatusDetail }) {
    db.prepare(`
      UPDATE pagos SET estado = 'aprobado', mp_payment_id = ?, mp_status = ?, mp_status_detail = ?, fecha_pago = ?
      WHERE id = ?
    `).run(mpPaymentId, mpStatus, mpStatusDetail, Date.now(), id);
    return this.obtener(id);
  },

  rechazar(id, { mpPaymentId, mpStatus, mpStatusDetail }) {
    db.prepare(`
      UPDATE pagos SET estado = 'rechazado', mp_payment_id = ?, mp_status = ?, mp_status_detail = ?
      WHERE id = ?
    `).run(mpPaymentId, mpStatus, mpStatusDetail, id);
    return this.obtener(id);
  },

  // Ingresos totales
  ingresosTotales() {
    const r = db.prepare("SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE estado = 'aprobado'").get();
    return r.total;
  },
};

// Inicializar esquema y datos
crearEsquemaLicencias();
sembrarPlanes();

// Migración: asegurar que los planes de lanzamiento existan (para BDs creadas antes de v2.0)
(function migrarPlanes() {
  const planesRequeridos = [
    ["Oferta Lanzamiento", "oferta_lanzamiento", 30, "USD", 36500, 5, 1000, 5000, "OFERTA LIMITADA: Pago único $30 USD. Acceso FULL para siempre. 5 estaciones, 1000 oyentes, 5GB.", 1],
    ["Starter", "starter_mensual", 9990, "CLP", 30, 1, 100, 500, "1 estación, 100 oyentes, 500MB storage", 1],
    ["Profesional", "pro_mensual", 19990, "CLP", 30, 3, 500, 2000, "3 estaciones, 500 oyentes, 2GB storage", 1],
    ["Enterprise", "enterprise_mensual", 39990, "CLP", 30, 10, 2000, 10000, "10 estaciones, 2000 oyentes, 10GB storage", 1],
    ["Starter Anual", "starter_anual", 99900, "CLP", 365, 1, 100, 500, "1 estación, 100 oyentes, 500MB - Ahorra 2 meses", 1],
    ["Profesional Anual", "pro_anual", 199900, "CLP", 365, 3, 500, 2000, "3 estaciones, 500 oyentes, 2GB - Ahorra 2 meses", 1],
    ["Enterprise Anual", "enterprise_anual", 399900, "CLP", 365, 10, 2000, 10000, "10 estaciones, 2000 oyentes, 10GB - Ahorra 2 meses", 1],
    ["Lifetime", "lifetime", 95000, "CLP", 36500, 5, 1000, 5000, "Pago único $100 USD (CLP $95.000). 5 estaciones, 1000 oyentes, 5GB para siempre", 1],
  ];

  const ahora = Date.now();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO planes (nombre, codigo, precio, moneda, duracion_dias, max_estaciones, max_oyentes, max_storage_mb, descripcion, activo, creado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  const upd = db.prepare(`
    UPDATE planes SET nombre=?, precio=?, moneda=?, duracion_dias=?, max_estaciones=?, max_oyentes=?, max_storage_mb=?, descripcion=?, activo=?
    WHERE codigo=?
  `);

  for (const [nombre, codigo, precio, moneda, dias, est, oy, stor, desc, activo] of planesRequeridos) {
    const existe = db.prepare("SELECT id FROM planes WHERE codigo = ?").get(codigo);
    if (existe) {
      // Actualizar precio y datos por si cambiaron
      upd.run(nombre, precio, moneda, dias, est, oy, stor, desc, activo, codigo);
    } else {
      // Insertar nuevo plan
      ins.run(nombre, codigo, precio, moneda, dias, est, oy, stor, desc, activo, ahora);
    }
  }
})();

// Migración: campos de personalización de radio (logo y nombre)
try { db.exec("ALTER TABLE tenants ADD COLUMN nombre_radio TEXT"); } catch { /* ya existe */ }
try { db.exec("ALTER TABLE tenants ADD COLUMN logo_url TEXT"); } catch { /* ya existe */ }

// Crear superadmin si no existe en tenants (el dueño de la plataforma)
const superadminExiste = db.prepare("SELECT 1 FROM tenants WHERE rol = 'superadmin'").get();
if (!superadminExiste) {
  const ahora = Date.now();
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  db.prepare(`
    INSERT INTO tenants (nombre, email, telefono, usuario, clave_hash, rol, estado, trial_inicio, trial_fin, licencia_activa, licencia_expira, creado, actualizado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "Superadmin", "admin@panelradio.online", null, adminUser,
    bcrypt.hashSync(adminPass, 10), "superadmin", "activo",
    ahora, ahora + 365 * 100 * 24 * 60 * 60 * 1000, // "nunca" expira
    1, ahora + 365 * 100 * 24 * 60 * 60 * 1000, ahora, ahora
  );
}
