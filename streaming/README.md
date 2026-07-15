# 📡 Stack de streaming (Docker) — Eternal Beat Medios

Levanta una radio real completa en tu PC o en un VPS con **3 servicios**:

| Servicio | Qué hace | Puerto |
|----------|----------|--------|
| **panel** | Frontend + API + WebSocket | 4000 |
| **icecast** | Servidor de streaming (lo que oyen los oyentes) | 8000 |
| **liquidsoap** | AutoDJ (playlist) + entrada de DJ en vivo, emite a Icecast | 8005 (DJ), 1234 (control) |

## 🚀 Cómo levantarlo

Necesitas **Docker** + **Docker Compose**. Desde la raíz del repositorio:

```bash
# 1) Coloca tu música en la carpeta ./media (archivos .mp3)
# 2) Levanta todo
docker compose up --build
```

Luego:
- **Panel:** http://localhost:4000 — usuario `admin`, contraseña `admin123`
- **Stream (oyentes):** http://localhost:8000/stream
- **Admin de Icecast:** http://localhost:8000 — usuario `admin`, contraseña `admin`

## 🎙️ Salir al aire en vivo (DJ)

El AutoDJ suena solo con la música de `./media`. Para transmitir **en vivo**, conecta un
encoder a la entrada *harbor* de Liquidsoap:

- **Host:** `localhost`  ·  **Puerto:** `8005`  ·  **Mount:** `live`  ·  **Contraseña:** `hackme`
- Encoders recomendados: **BUTT** (Broadcast Using This Tool), **Mixxx**, o **OBS** con plugin.

Cuando el DJ en vivo se conecta, **tiene prioridad** sobre el AutoDJ; al desconectarse,
vuelve automáticamente la música.

## 🔐 Antes de publicar en internet (VPS)

Cambia estas contraseñas (no dejes las de ejemplo):
- `streaming/icecast/icecast.xml`: `source-password`, `relay-password`, `admin-password`
- `streaming/liquidsoap/radio.liq`: contraseña del `output.icecast` y del `input.harbor`
- `docker-compose.yml`: `JWT_SECRET` y `ADMIN_PASSWORD`

> Para muchos oyentes, sube el límite `<clients>` en `icecast.xml` y dimensiona el VPS
> según *bitrate × oyentes* (128 kbps × 100 ≈ 12.8 Mbps de subida).

## 🧩 Arquitectura

```
DJ en vivo (encoder) ─┐
                       ├─► Liquidsoap ─► Icecast ─► 🎧 Oyentes (http://.../stream)
Música ./media (AutoDJ)┘        ▲
                                └── control por telnet (puerto 1234) desde el panel (futuro)
```

## ✅ Verificado
- La imagen de **Icecast** se construye y sirve correctamente.
- **Liquidsoap** procesa y **codifica audio MP3** sin problemas.
- El enlace completo entre contenedores funciona en Docker estándar (en PC/VPS).
