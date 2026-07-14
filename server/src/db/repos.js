// Repositorios: encapsulan el acceso a la base de datos y mapean las filas
// (snake_case) al formato que espera el frontend (camelCase).

import { db } from "./db.js";

// ---------- Mapeos ----------
function mapEstacion(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    estado: r.estado,
    servidor: r.servidor,
    montaje: r.montaje,
    host: r.host,
    puerto: r.puerto,
    bitrate: r.bitrate,
    formato: r.formato,
    oyentesActuales: r.oyentes_actuales,
    oyentesMaximos: r.oyentes_maximos,
    picoOyentes: r.pico_oyentes,
    cancionActual: r.cancion_actual,
    autodj: !!r.autodj,
    uptime: r.uptime,
  };
}

function mapPista(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    artista: r.artista,
    album: r.album,
    duracion: r.duracion,
    genero: r.genero,
    fuente: r.fuente,
    artwork: r.artwork,
    previewUrl: r.preview_url,
    itunesId: r.itunes_id,
    ruta: r.ruta,
  };
}

function mapPlaylist(r) {
  return { id: r.id, nombre: r.nombre, tipo: r.tipo, pistas: r.pistas, activa: !!r.activa, peso: r.peso };
}

// ---------- Usuarios ----------
export const usuariosRepo = {
  porUsuario(usuario) {
    return db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario);
  },
  porId(id) {
    return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
  },
};

// ---------- Estaciones ----------
export const estacionesRepo = {
  listar() {
    return db.prepare("SELECT * FROM estaciones ORDER BY nombre").all().map(mapEstacion);
  },
  obtener(id) {
    return mapEstacion(db.prepare("SELECT * FROM estaciones WHERE id = ?").get(id));
  },
  crear(d) {
    const id = `estacion-${Date.now()}`;
    db.prepare(`
      INSERT INTO estaciones
        (id, nombre, estado, servidor, montaje, host, puerto, bitrate, formato,
         oyentes_actuales, oyentes_maximos, pico_oyentes, cancion_actual, autodj, uptime)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      d.nombre,
      "offline",
      "Icecast 2.4.4",
      d.montaje || "/stream",
      d.host || "stream.panelradio.online",
      Number(d.puerto) || 8000,
      Number(d.bitrate) || 128,
      d.formato || "MP3",
      0,
      Number(d.oyentesMaximos) || 100,
      0,
      "—",
      d.autodj ? 1 : 0,
      "—"
    );
    return this.obtener(id);
  },
  actualizar(id, d) {
    const actual = db.prepare("SELECT * FROM estaciones WHERE id = ?").get(id);
    if (!actual) return null;
    const mapa = {
      nombre: "nombre",
      montaje: "montaje",
      host: "host",
      puerto: "puerto",
      bitrate: "bitrate",
      formato: "formato",
      oyentesMaximos: "oyentes_maximos",
    };
    const sets = [];
    const vals = [];
    for (const [k, col] of Object.entries(mapa)) {
      if (d[k] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(d[k]);
      }
    }
    if (d.autodj !== undefined) {
      sets.push("autodj = ?");
      vals.push(d.autodj ? 1 : 0);
    }
    if (sets.length) {
      db.prepare(`UPDATE estaciones SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return this.obtener(id);
  },
  eliminar(id) {
    const e = this.obtener(id);
    if (!e) return null;
    db.prepare("DELETE FROM estaciones WHERE id = ?").run(id);
    return e;
  },
  iniciar(id) {
    const e = this.obtener(id);
    if (!e) return null;
    const inicio = Math.max(1, e.picoOyentes - 30);
    db.prepare(
      "UPDATE estaciones SET estado='online', uptime='0d 0h 1m', oyentes_actuales=? WHERE id=?"
    ).run(inicio, id);
    return this.obtener(id);
  },
  detener(id) {
    const e = this.obtener(id);
    if (!e) return null;
    db.prepare(
      "UPDATE estaciones SET estado='offline', uptime='—', oyentes_actuales=0, cancion_actual='—' WHERE id=?"
    ).run(id);
    return this.obtener(id);
  },
  // Usado por el motor de tiempo real para persistir métricas.
  actualizarMetricas(id, { oyentesActuales, picoOyentes, cancionActual }) {
    db.prepare(
      "UPDATE estaciones SET oyentes_actuales=?, pico_oyentes=?, cancion_actual=? WHERE id=?"
    ).run(oyentesActuales, picoOyentes, cancionActual, id);
  },
};

// ---------- Pistas (biblioteca) ----------
export const pistasRepo = {
  listar(busqueda = "") {
    if (busqueda) {
      const q = `%${busqueda.toLowerCase()}%`;
      return db
        .prepare(
          "SELECT * FROM pistas WHERE LOWER(titulo) LIKE ? OR LOWER(artista) LIKE ? ORDER BY id"
        )
        .all(q, q)
        .map(mapPista);
    }
    return db.prepare("SELECT * FROM pistas ORDER BY id").all().map(mapPista);
  },
  eliminar(id) {
    const r = db.prepare("SELECT * FROM pistas WHERE id = ?").get(id);
    if (!r) return null;
    db.prepare("DELETE FROM pistas WHERE id = ?").run(id);
    return mapPista(r);
  },
  existeItunes(itunesId) {
    if (!itunesId) return false;
    return !!db.prepare("SELECT 1 FROM pistas WHERE itunes_id = ?").get(itunesId);
  },
  agregar(d) {
    if (d.itunesId && this.existeItunes(d.itunesId)) return null;
    const info = db
      .prepare(
        `INSERT INTO pistas (titulo, artista, album, duracion, genero, fuente, artwork, preview_url, itunes_id, ruta)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        d.titulo || "Desconocido",
        d.artista || "Desconocido",
        d.album || "",
        d.duracion || "0:00",
        d.genero || "Sin género",
        d.fuente || "manual",
        d.artwork || null,
        d.previewUrl || null,
        d.itunesId || null,
        d.ruta || null
      );
    return mapPista(db.prepare("SELECT * FROM pistas WHERE id = ?").get(info.lastInsertRowid));
  },
  agregarVarias(lista = []) {
    const agregadas = [];
    let omitidas = 0;
    try {
      db.exec("BEGIN");
      for (const d of lista) {
        const p = this.agregar(d);
        if (p) agregadas.push(p);
        else omitidas++;
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { agregadas, omitidas };
  },
};

// ---------- Playlists y programación ----------
export const playlistsRepo = {
  listar() {
    return db.prepare("SELECT * FROM playlists ORDER BY id").all().map(mapPlaylist);
  },
};

export const programacionRepo = {
  listar() {
    return db.prepare("SELECT * FROM programacion ORDER BY id").all();
  },
};

// ---------- Estadísticas ----------
export const estadisticasRepo = {
  oyentesPorPais() {
    return db.prepare("SELECT pais, oyentes FROM oyentes_pais ORDER BY oyentes DESC").all();
  },
  anchoBanda() {
    return db.prepare("SELECT dia, gb FROM ancho_banda ORDER BY orden").all();
  },
};

// ---------- Samples / Soundboard ----------
function mapSample(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    url: r.url,
    color: r.color,
    creado: r.creado,
  };
}

export const samplesRepo = {
  listar() {
    return db.prepare("SELECT * FROM samples ORDER BY id DESC").all().map(mapSample);
  },
  agregar({ nombre, categoria, archivo, url, color }) {
    const info = db
      .prepare(
        `INSERT INTO samples (nombre, categoria, archivo, url, color, creado)
         VALUES (?,?,?,?,?,?)`
      )
      .run(nombre, categoria || "efecto", archivo, url, color || null, Date.now());
    return mapSample(db.prepare("SELECT * FROM samples WHERE id = ?").get(info.lastInsertRowid));
  },
  obtener(id) {
    const r = db.prepare("SELECT * FROM samples WHERE id = ?").get(id);
    return r ? mapSample(r) : null;
  },
  eliminar(id) {
    const r = db.prepare("SELECT * FROM samples WHERE id = ?").get(id);
    if (!r) return null;
    db.prepare("DELETE FROM samples WHERE id = ?").run(id);
    return mapSample(r);
  },
};

// ---------- Mapeos MIDI (perfiles de controlador por usuario) ----------
function mapMidiMapeo(r) {
  if (!r) return null;
  let mapeo = [];
  try {
    mapeo = JSON.parse(r.mapeo || "[]");
  } catch {
    mapeo = [];
  }
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    nombre: r.nombre,
    dispositivo: r.dispositivo,
    mapeo,
    activo: !!r.activo,
    creado: r.creado,
    actualizado: r.actualizado,
  };
}

export const midiMapeosRepo = {
  listarPorUsuario(usuarioId) {
    return db
      .prepare("SELECT * FROM midi_mapeos WHERE usuario_id = ? ORDER BY actualizado DESC")
      .all(usuarioId)
      .map(mapMidiMapeo);
  },
  obtener(id, usuarioId) {
    return mapMidiMapeo(
      db.prepare("SELECT * FROM midi_mapeos WHERE id = ? AND usuario_id = ?").get(id, usuarioId)
    );
  },
  activo(usuarioId) {
    return mapMidiMapeo(
      db
        .prepare("SELECT * FROM midi_mapeos WHERE usuario_id = ? AND activo = 1")
        .get(usuarioId)
    );
  },
  crear(usuarioId, { nombre, dispositivo, mapeo, activo }) {
    const ahora = Date.now();
    if (activo) {
      db.prepare("UPDATE midi_mapeos SET activo = 0 WHERE usuario_id = ?").run(usuarioId);
    }
    const info = db
      .prepare(
        `INSERT INTO midi_mapeos (usuario_id, nombre, dispositivo, mapeo, activo, creado, actualizado)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        usuarioId,
        nombre || "Mi controlador",
        dispositivo || null,
        JSON.stringify(mapeo || []),
        activo ? 1 : 0,
        ahora,
        ahora
      );
    return this.obtener(info.lastInsertRowid, usuarioId);
  },
  actualizar(id, usuarioId, { nombre, dispositivo, mapeo }) {
    const actual = this.obtener(id, usuarioId);
    if (!actual) return null;
    const sets = ["actualizado = ?"];
    const vals = [Date.now()];
    if (nombre !== undefined) {
      sets.push("nombre = ?");
      vals.push(nombre);
    }
    if (dispositivo !== undefined) {
      sets.push("dispositivo = ?");
      vals.push(dispositivo);
    }
    if (mapeo !== undefined) {
      sets.push("mapeo = ?");
      vals.push(JSON.stringify(mapeo));
    }
    db.prepare(`UPDATE midi_mapeos SET ${sets.join(", ")} WHERE id = ? AND usuario_id = ?`).run(
      ...vals,
      id,
      usuarioId
    );
    return this.obtener(id, usuarioId);
  },
  activar(id, usuarioId) {
    const actual = this.obtener(id, usuarioId);
    if (!actual) return null;
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE midi_mapeos SET activo = 0 WHERE usuario_id = ?").run(usuarioId);
      db.prepare("UPDATE midi_mapeos SET activo = 1, actualizado = ? WHERE id = ? AND usuario_id = ?").run(
        Date.now(),
        id,
        usuarioId
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return this.obtener(id, usuarioId);
  },
  eliminar(id, usuarioId) {
    const actual = this.obtener(id, usuarioId);
    if (!actual) return null;
    db.prepare("DELETE FROM midi_mapeos WHERE id = ? AND usuario_id = ?").run(id, usuarioId);
    return actual;
  },
};

// ---------- Mensajes (WhatsApp / oyentes) ----------
function mapMensaje(r) {
  return {
    id: r.id,
    autor: r.autor,
    telefono: r.telefono,
    texto: r.texto,
    estado: r.estado,
    origen: r.origen,
    creado: r.creado,
  };
}

export const mensajesRepo = {
  listar() {
    return db.prepare("SELECT * FROM mensajes ORDER BY id DESC LIMIT 200").all().map(mapMensaje);
  },
  agregar({ autor, telefono, texto, origen }) {
    const info = db
      .prepare(
        `INSERT INTO mensajes (autor, telefono, texto, estado, origen, creado)
         VALUES (?,?,?,?,?,?)`
      )
      .run(autor || "Oyente", telefono || null, texto, "pendiente", origen || "manual", Date.now());
    return mapMensaje(db.prepare("SELECT * FROM mensajes WHERE id = ?").get(info.lastInsertRowid));
  },
  actualizarEstado(id, estado) {
    const r = db.prepare("SELECT * FROM mensajes WHERE id = ?").get(id);
    if (!r) return null;
    db.prepare("UPDATE mensajes SET estado = ? WHERE id = ?").run(estado, id);
    return mapMensaje(db.prepare("SELECT * FROM mensajes WHERE id = ?").get(id));
  },
  eliminar(id) {
    const r = db.prepare("SELECT * FROM mensajes WHERE id = ?").get(id);
    if (!r) return null;
    db.prepare("DELETE FROM mensajes WHERE id = ?").run(id);
    return mapMensaje(r);
  },
};
