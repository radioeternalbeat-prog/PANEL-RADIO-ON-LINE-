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
    streamUrl: r.stream_url || null,
    embedToken: r.embed_token || null,
    embedCanal: r.embed_canal || null,
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

function mapPrograma(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    inicio: r.inicio,
    fin: r.fin,
    dias: r.dias,
    playlistId: r.playlist_id || null,
    // Nombre real de la playlist enlazada; si no existe, el texto histórico.
    playlist: r.pl_nombre || r.playlist || "",
    playlistActiva: r.pl_activa == null ? null : !!r.pl_activa,
    playlistPistas: r.pl_pistas || 0,
  };
}

// ---------- Usuarios ----------
export const usuariosRepo = {
  porUsuario(usuario) {
    return db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario);
  },
  porId(id) {
    return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
  },
  cambiarClave(id, claveHash) {
    db.prepare("UPDATE usuarios SET clave_hash = ? WHERE id = ?").run(claveHash, id);
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
        (id, nombre, estado, servidor, montaje, host, puerto, bitrate, formato, stream_url, embed_token, embed_canal,
         oyentes_actuales, oyentes_maximos, pico_oyentes, cancion_actual, autodj, uptime)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
      d.streamUrl || null,
      d.embedToken || null,
      d.embedCanal || null,
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
      streamUrl: "stream_url",
      embedToken: "embed_token",
      embedCanal: "embed_canal",
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
    const filas = db.prepare("SELECT * FROM playlists ORDER BY id").all();
    const conteos = db
      .prepare("SELECT playlist_id, COUNT(*) AS n FROM playlist_pistas GROUP BY playlist_id")
      .all();
    const mapa = Object.fromEntries(conteos.map((c) => [c.playlist_id, c.n]));
    return filas.map((r) => ({ ...mapPlaylist(r), pistas: mapa[r.id] || 0 }));
  },
  obtener(id) {
    const r = db.prepare("SELECT * FROM playlists WHERE id = ?").get(id);
    if (!r) return null;
    const n = db.prepare("SELECT COUNT(*) AS n FROM playlist_pistas WHERE playlist_id = ?").get(id).n;
    return { ...mapPlaylist(r), pistas: n };
  },
  crear({ nombre, tipo }) {
    const info = db
      .prepare("INSERT INTO playlists (nombre, tipo, pistas, activa, peso) VALUES (?,?,0,1,0)")
      .run(nombre, tipo || "General");
    return this.obtener(info.lastInsertRowid);
  },
  eliminar(id) {
    const p = this.obtener(id);
    if (!p) return null;
    db.prepare("DELETE FROM playlist_pistas WHERE playlist_id = ?").run(id);
    db.prepare("DELETE FROM playlists WHERE id = ?").run(id);
    return p;
  },
  // Canciones de una playlist
  pistasDe(id) {
    return db
      .prepare(
        `SELECT p.* FROM pistas p
         JOIN playlist_pistas pp ON pp.pista_id = p.id
         WHERE pp.playlist_id = ?
         ORDER BY pp.creado`
      )
      .all(id)
      .map(mapPista);
  },
  agregarPista(id, pistaId) {
    db.prepare(
      "INSERT OR IGNORE INTO playlist_pistas (playlist_id, pista_id, creado) VALUES (?,?,?)"
    ).run(id, pistaId, Date.now());
    return this.obtener(id);
  },
  quitarPista(id, pistaId) {
    db.prepare("DELETE FROM playlist_pistas WHERE playlist_id = ? AND pista_id = ?").run(id, pistaId);
    return this.obtener(id);
  },
};

export const programacionRepo = {
  listar() {
    return db
      .prepare(
        `SELECT pr.*, pl.nombre AS pl_nombre, pl.activa AS pl_activa,
                (SELECT COUNT(*) FROM playlist_pistas pp WHERE pp.playlist_id = pr.playlist_id) AS pl_pistas
         FROM programacion pr
         LEFT JOIN playlists pl ON pl.id = pr.playlist_id
         ORDER BY pr.inicio`
      )
      .all()
      .map(mapPrograma);
  },
  obtener(id) {
    const r = db
      .prepare(
        `SELECT pr.*, pl.nombre AS pl_nombre, pl.activa AS pl_activa,
                (SELECT COUNT(*) FROM playlist_pistas pp WHERE pp.playlist_id = pr.playlist_id) AS pl_pistas
         FROM programacion pr
         LEFT JOIN playlists pl ON pl.id = pr.playlist_id
         WHERE pr.id = ?`
      )
      .get(id);
    return r ? mapPrograma(r) : null;
  },
  crear({ nombre, inicio, fin, playlistId, dias }) {
    const pl = playlistId ? db.prepare("SELECT nombre FROM playlists WHERE id = ?").get(playlistId) : null;
    const info = db
      .prepare(
        "INSERT INTO programacion (nombre, inicio, fin, playlist, playlist_id, dias) VALUES (?,?,?,?,?,?)"
      )
      .run(nombre, inicio || "00:00", fin || "00:00", pl?.nombre || "", playlistId || null, dias || "");
    return this.obtener(info.lastInsertRowid);
  },
  actualizar(id, d) {
    const actual = db.prepare("SELECT * FROM programacion WHERE id = ?").get(id);
    if (!actual) return null;
    const sets = [];
    const vals = [];
    const campos = { nombre: "nombre", inicio: "inicio", fin: "fin", dias: "dias" };
    for (const [k, col] of Object.entries(campos)) {
      if (d[k] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(d[k]);
      }
    }
    if (d.playlistId !== undefined) {
      const pl = d.playlistId
        ? db.prepare("SELECT nombre FROM playlists WHERE id = ?").get(d.playlistId)
        : null;
      sets.push("playlist_id = ?", "playlist = ?");
      vals.push(d.playlistId || null, pl?.nombre || "");
    }
    if (sets.length) {
      db.prepare(`UPDATE programacion SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return this.obtener(id);
  },
  eliminar(id) {
    const p = this.obtener(id);
    if (!p) return null;
    db.prepare("DELETE FROM programacion WHERE id = ?").run(id);
    return p;
  },
};

function mapInsercion(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    playlistId: r.playlist_id || null,
    playlist: r.pl_nombre || "",
    playlistPistas: r.pl_pistas || 0,
    cadaMin: r.cada_min,
    activa: !!r.activa,
  };
}

export const insercionesRepo = {
  listar() {
    return db
      .prepare(
        `SELECT i.*, pl.nombre AS pl_nombre,
                (SELECT COUNT(*) FROM playlist_pistas pp WHERE pp.playlist_id = i.playlist_id) AS pl_pistas
         FROM inserciones i
         LEFT JOIN playlists pl ON pl.id = i.playlist_id
         ORDER BY i.cada_min`
      )
      .all()
      .map(mapInsercion);
  },
  obtener(id) {
    const r = db
      .prepare(
        `SELECT i.*, pl.nombre AS pl_nombre,
                (SELECT COUNT(*) FROM playlist_pistas pp WHERE pp.playlist_id = i.playlist_id) AS pl_pistas
         FROM inserciones i
         LEFT JOIN playlists pl ON pl.id = i.playlist_id
         WHERE i.id = ?`
      )
      .get(id);
    return r ? mapInsercion(r) : null;
  },
  actualizar(id, d) {
    const actual = db.prepare("SELECT * FROM inserciones WHERE id = ?").get(id);
    if (!actual) return null;
    const sets = [];
    const vals = [];
    if (d.activa !== undefined) {
      sets.push("activa = ?");
      vals.push(d.activa ? 1 : 0);
    }
    if (d.cadaMin !== undefined) {
      sets.push("cada_min = ?");
      vals.push(Number(d.cadaMin));
    }
    if (d.nombre !== undefined) {
      sets.push("nombre = ?");
      vals.push(d.nombre);
    }
    if (sets.length) {
      db.prepare(`UPDATE inserciones SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return this.obtener(id);
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
    slot: r.slot ?? 0,
    url: r.url,
    color: r.color,
    creado: r.creado,
  };
}

export const samplesRepo = {
  listar() {
    return db.prepare("SELECT * FROM samples ORDER BY id DESC").all().map(mapSample);
  },
  agregar({ nombre, categoria, slot, archivo, url, color }) {
    // Si ya hay un sample en esa categoría+slot, lo reemplaza (libera la caja).
    if (categoria != null && slot != null) {
      db.prepare("DELETE FROM samples WHERE categoria = ? AND slot = ?").run(categoria, slot);
    }
    const info = db
      .prepare(
        `INSERT INTO samples (nombre, categoria, slot, archivo, url, color, creado)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(nombre, categoria || "efecto", Number(slot) || 0, archivo, url, color || null, Date.now());
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
