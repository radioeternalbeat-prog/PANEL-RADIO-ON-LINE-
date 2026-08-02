# 📻 PANEL RADIO ONLINE

Panel de control de streaming de radio online inspirado en **Centova Cast**. Permite
gestionar estaciones, oyentes, AutoDJ y estadísticas desde una interfaz web moderna,
con un backend real (API REST + WebSocket) y autenticación JWT.

> El backend persiste los datos en una base **SQLite** (`server/data/panel.db`), creada y
> sembrada automáticamente en el primer arranque. Está preparado para integrarse con
> servidores **Icecast/SHOUTcast** y **AzuraCast**.

## ✨ Funcionalidades

- **Login real con JWT** — autenticación segura contra el backend con expiración configurable.
- **Estaciones** — panel con tarjetas por estación: estado, oyentes, pico, capacidad,
  canción actual y controles de **iniciar/detener** (vía API) + escuchar.
- **Estadísticas** — gráficas de oyentes (24h), distribución por país, ancho de banda
  semanal y detalle por estación.
- **AutoDJ con iTunes** — busca canciones **reales** en el catálogo de Apple (con carátula y
  preview de 30s reproducible), impórtalas a tu biblioteca, o sube tu `iTunes Library.xml`
  para cargar tus canciones almacenadas locales.
- **Subida de canciones** — sube archivos MP3 directamente a la biblioteca o a una playlist.
- **Soundboard / Samples** — banco de efectos de sonido asignables a slots con colores.
- **Mapeo MIDI** — conecta controladores físicos y asigna botones/faders al mezclador.
- **Configuración** — ajustes del servidor, calidad de audio, credenciales y URL del stream.
- **Tiempo real** — oyentes y canción en reproducción se actualizan en vivo por **WebSocket**.
- **Copia de seguridad** — exporta e importa toda la base de datos en un clic.
- **Mensajes / WhatsApp** — recibe mensajes de oyentes vía webhook y gestiona desde el panel.
- **Página pública** — player embebible para oyentes sin autenticación.
- **Reproductor web** — mini reproductor global que **reproduce los previews reales de iTunes**.

## 🔒 Seguridad

El panel incluye múltiples capas de protección listas para producción:

- **JWT obligatorio** — el servidor se niega a arrancar sin `JWT_SECRET` en producción.
- **CORS restringido** — solo los dominios definidos en `CORS_ORIGIN` pueden acceder a la API.
- **Rate-limiting** — protección contra fuerza bruta en login (5/min) y uploads (10-15/min).
- **WebSocket autenticado** — conexiones sin token son rechazadas en producción.
- **SQL injection protegido** — whitelist estricta de tablas en backup/restore.
- **Contraseña configurable** — el admin define su propia clave antes del primer arranque.
- **Hashing bcrypt** — las contraseñas se almacenan hasheadas (nunca en texto plano).

## 🍎 Integración con iTunes

iTunes funciona como **motor de gestión y base de datos de canciones**:

1. **Catálogo de Apple (iTunes Search API)** — busca cualquier canción real y obtén
   metadatos + carátula + un preview de audio de 30s que suena en el navegador. No requiere
   API key. El backend hace de proxy en `GET /api/itunes/buscar`.
2. **Importar tu biblioteca local** — en iTunes/Música: *Archivo → Biblioteca → Exportar
   biblioteca…* genera un `Library.xml`. Súbelo desde el AutoDJ y el backend lo parsea
   (formato *plist*) para importar tus canciones reales (título, artista, álbum, género,
   duración y ruta del archivo).

## 🛠️ Stack

**Frontend**
- [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/) · [Recharts](https://recharts.org/) · [Lucide](https://lucide.dev/)

**Backend**
- [Node.js 22+](https://nodejs.org/) + [Express](https://expressjs.com/)
- **SQLite** (vía `node:sqlite`, integrado en Node 22.5+) para persistencia de datos
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (JWT) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (hash de contraseñas)
- [ws](https://github.com/websockets/ws) (WebSocket de estadísticas en vivo)
- [plist](https://github.com/TooTallNate/plist.js) (parseo del `iTunes Library.xml`)
- [multer](https://github.com/expressjs/multer) (subida de archivos de audio)

## 🚀 Cómo ejecutarlo

### Requisitos previos

- **Node.js 22.5 o superior** (usa `node:sqlite` integrado)
- npm o yarn

### Opción A — Todo en uno (una sola URL) — Recomendada

El backend sirve el frontend compilado + API + WebSocket en una única dirección:

```bash
# 1) Compilar el frontend
npm install
npm run build

# 2) Configurar variables de entorno del servidor
cd server
cp .env.example .env
# Edita .env y configura al menos: JWT_SECRET, ADMIN_PASSWORD
nano .env

# 3) Arrancar el servidor
npm install
npm start
```

Abre **http://localhost:4000** e inicia sesión con el usuario y contraseña que configuraste.

### Opción B — Desarrollo (dos servidores, con recarga en caliente)

```bash
# Terminal 1 - Backend
cd server
cp .env.example .env       # Configura JWT_SECRET y ADMIN_PASSWORD
npm install && npm start   # http://localhost:4000

# Terminal 2 - Frontend
npm install
npm run dev                # http://localhost:5173 (proxy a :4000)
```

## 🌍 Deploy en producción

### Opción 1 — Render.com (la más simple)

El repositorio incluye un blueprint `render.yaml` para [Render.com](https://render.com):

1. Entra a Render y crea una cuenta (puedes usar tu GitHub).
2. **New + → Blueprint** y conecta este repositorio.
3. Render lee `render.yaml` y crea el servicio con variables de entorno seguras.
4. **Configura `ADMIN_PASSWORD`** con una contraseña fuerte antes del primer deploy.
5. **Configura `CORS_ORIGIN`** con tu URL de Render (ej: `https://panel-radio-online.onrender.com`).
6. Pulsa **Apply**. En unos minutos tendrás tu panel funcionando.

### Opción 2 — Docker (VPS propio)

```bash
# Construir la imagen
docker build -t panel-radio .

# Ejecutar con volumen persistente
docker run -d \
  --name panel-radio \
  -p 4000:4000 \
  -v panel-data:/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e ADMIN_PASSWORD="TuClaveSegura123" \
  -e CORS_ORIGIN="https://tu-dominio.com" \
  -e NODE_ENV=production \
  panel-radio
```

### Opción 3 — VPS con Caddy (HTTPS automático)

Consulta el archivo `.env.example` en la raíz para la configuración completa con Caddy,
incluyendo soporte para AzuraCast e Icecast/Liquidsoap.

### Variables de entorno obligatorias en producción

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | Debe ser `production` |
| `JWT_SECRET` | Clave aleatoria larga. Genera con: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Contraseña del admin (solo se usa al crear la BD por primera vez) |
| `CORS_ORIGIN` | URL(s) permitidas. Ej: `https://tu-panel.onrender.com` |

### Variables opcionales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `4000` |
| `JWT_EXPIRA` | Expiración del token | `8h` |
| `DB_PATH` | Ruta de la base de datos | `./data/panel.db` |
| `UPLOADS_DIR` | Carpeta de archivos subidos | `./data/uploads` |
| `WEBHOOK_TOKEN` | Protege el webhook de WhatsApp | (vacío) |
| `AZURACAST_BASE_URL` | URL de tu instancia AzuraCast | (vacío) |
| `AZURACAST_STATION` | Shortcode de la estación | (vacío) |
| `STREAM_URL` | URL pública del stream | (vacío) |

## 🔌 API REST

Base: `http://localhost:4000/api` — todas las rutas (salvo `auth`, `publico` y `health`)
requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/health` | Estado del servicio (público) |
| POST | `/auth/login` | Inicia sesión y devuelve el token JWT |
| GET  | `/auth/perfil` | Perfil del usuario autenticado |
| POST | `/auth/cambiar-clave` | Cambiar contraseña del panel |
| GET  | `/estaciones` | Lista de estaciones |
| POST | `/estaciones` | Crear estación |
| PUT  | `/estaciones/:id` | Actualizar estación |
| DELETE | `/estaciones/:id` | Eliminar estación |
| POST | `/estaciones/:id/iniciar` | Arrancar transmisión |
| POST | `/estaciones/:id/detener` | Detener transmisión |
| GET  | `/estadisticas/resumen` | KPIs generales |
| GET  | `/estadisticas/oyentes-por-hora` | Serie de oyentes (24h) |
| GET  | `/estadisticas/oyentes-por-pais` | Distribución geográfica |
| GET  | `/estadisticas/ancho-banda` | Consumo semanal (GB) |
| GET  | `/autodj/biblioteca?busqueda=` | Biblioteca de música |
| POST | `/autodj/subir` | Subir canción (multipart) |
| DELETE | `/autodj/biblioteca/:id` | Eliminar pista |
| GET  | `/autodj/playlists` | Playlists |
| POST | `/autodj/playlists` | Crear playlist |
| POST | `/autodj/playlists/:id/subir` | Subir canción a playlist |
| GET  | `/autodj/programacion` | Programación de horarios |
| POST | `/autodj/programacion` | Crear bloque de programación |
| GET  | `/autodj/inserciones` | Reglas de cuñas/jingles |
| GET  | `/itunes/buscar?termino=` | Busca canciones en el catálogo de Apple |
| POST | `/itunes/importar` | Importa pistas seleccionadas de iTunes |
| POST | `/itunes/importar-xml` | Importa el `iTunes Library.xml` exportado |
| GET  | `/samples` | Lista de samples/efectos |
| POST | `/samples` | Subir sample (multipart) |
| GET  | `/mensajes` | Lista de mensajes de oyentes |
| GET  | `/midi/mapeos` | Perfiles de mapeo MIDI |
| GET  | `/backup/exportar` | Exportar copia de seguridad completa |
| POST | `/backup/importar` | Restaurar desde copia de seguridad |
| GET  | `/publico/radio` | Info pública de la radio (sin auth) |
| GET  | `/publico/historial` | Historial público (sin auth) |

**WebSocket:** `ws://localhost:4000/ws?token=<JWT>` — emite snapshot de métricas cada 3s.
En producción requiere token válido.

## 📁 Estructura

```
.
├── src/                  # Frontend (React)
│   ├── api/              # Cliente HTTP (client.js)
│   ├── components/       # Layout, MiniReproductor, RutaProtegida, MIDI, Configuracion
│   ├── context/          # AuthContext, PlayerContext, OnAirContext, ThemeContext
│   ├── hooks/            # useRealtime (WebSocket)
│   ├── data/             # mockData.js (constantes UI)
│   ├── pages/            # Login, Dashboard, Estadisticas, AutoDJ, Transmision, Configuracion
│   ├── App.jsx           # Rutas (con protección)
│   └── main.jsx          # Punto de entrada (providers)
├── server/               # Backend (Express)
│   └── src/
│       ├── db/           # db.js (SQLite + esquema/seed) y repos.js (consultas)
│       ├── routes/       # auth, estaciones, estadisticas, autodj, itunes, samples, midi, backup
│       ├── services/     # itunes.js, icecast.js, azuracast.js
│       ├── live.js       # Datos transitorios (oyentes/hora, rotación)
│       ├── utils.js      # Utilidades (formato de duración)
│       ├── auth.js       # JWT + middleware
│       ├── rateLimit.js  # Rate-limiting en memoria (sin dependencias)
│       ├── realtime.js   # WebSocket (tiempo real)
│       └── index.js      # App + servidor HTTP
├── Dockerfile            # Imagen Docker lista para producción
├── render.yaml           # Blueprint de deploy para Render.com
└── .env.example          # Variables de entorno (plantilla)
```

## 📄 Licencia

Uso comercial autorizado. Consulta los términos de distribución con el autor.
