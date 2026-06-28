# 📻 PANEL RADIO ONLINE

Panel de control de streaming de radio online inspirado en **Centova Cast**. Permite
gestionar estaciones, oyentes, AutoDJ y estadísticas desde una interfaz web moderna,
con un backend real (API REST + WebSocket) y autenticación JWT.

> ⚠️ El backend usa un **almacén de datos en memoria** preparado para reemplazarse por una
> base de datos y por la integración real con servidores **Icecast/SHOUTcast**.

## ✨ Funcionalidades

- **Login real con JWT** — autenticación contra el backend (demo: `admin` / `admin123`).
- **Estaciones** — panel con tarjetas por estación: estado, oyentes, pico, capacidad,
  canción actual y controles de **iniciar/detener** (vía API) + escuchar.
- **Estadísticas** — gráficas de oyentes (24h), distribución por país, ancho de banda
  semanal y detalle por estación.
- **AutoDJ con iTunes** — busca canciones **reales** en el catálogo de Apple (con carátula y
  preview de 30s reproducible), impórtalas a tu biblioteca, o sube tu `iTunes Library.xml`
  para cargar tus canciones almacenadas locales.
- **Configuración** — ajustes del servidor, calidad de audio, credenciales y URL del stream.
- **Tiempo real** — oyentes y canción en reproducción se actualizan en vivo por **WebSocket**.
- **Reproductor web** — mini reproductor global que **reproduce los previews reales de iTunes**.

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
- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/) · [Recharts](https://recharts.org/) · [Lucide](https://lucide.dev/)

**Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (JWT) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (hash de contraseñas)
- [ws](https://github.com/websockets/ws) (WebSocket de estadísticas en vivo)

## 🚀 Cómo ejecutarlo

Necesitas **dos terminales** (una para el backend y otra para el frontend).

### 1) Backend (API + WebSocket)

```bash
cd server
npm install
cp .env.example .env      # opcional: ajusta PORT y JWT_SECRET
npm start                 # API en http://localhost:4000
```

### 2) Frontend (panel web)

```bash
npm install
cp .env.example .env      # define VITE_API_URL y VITE_WS_URL
npm run dev               # panel en http://localhost:5173
```

Luego entra con **usuario `admin` y contraseña `admin123`**.

## 🔌 API REST

Base: `http://localhost:4000/api` — todas las rutas (salvo `auth` y `health`) requieren
el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/health` | Estado del servicio (público) |
| POST | `/auth/login` | Inicia sesión y devuelve el token JWT |
| GET  | `/auth/perfil` | Perfil del usuario autenticado |
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
| DELETE | `/autodj/biblioteca/:id` | Eliminar pista |
| GET  | `/autodj/playlists` | Playlists |
| GET  | `/autodj/programacion` | Programación de horarios |
| GET  | `/itunes/buscar?termino=` | Busca canciones reales en el catálogo de Apple |
| POST | `/itunes/importar` | Importa pistas seleccionadas de iTunes a la biblioteca |
| POST | `/itunes/importar-xml` | Importa el `iTunes Library.xml` exportado |

**WebSocket:** `ws://localhost:4000/ws` — emite un snapshot de oyentes/estado cada 3 s.

## 📁 Estructura

```
.
├── src/                  # Frontend (React)
│   ├── api/              # Cliente HTTP (client.js)
│   ├── components/       # Layout, MiniReproductor, RutaProtegida
│   ├── context/          # AuthContext, PlayerContext
│   ├── hooks/            # useRealtime (WebSocket)
│   ├── data/             # mockData.js (constantes UI)
│   ├── pages/            # Login, Dashboard, Estadisticas, AutoDJ, Configuracion
│   ├── App.jsx           # Rutas (con protección)
│   └── main.jsx          # Punto de entrada (providers)
└── server/               # Backend (Express)
    └── src/
        ├── data/store.js # Almacén en memoria
        ├── routes/       # auth, estaciones, estadisticas, autodj
        ├── auth.js       # JWT + middleware
        ├── realtime.js   # WebSocket
        └── index.js      # App + servidor HTTP
```

## 🗺️ Próximos pasos

- Persistencia real con **PostgreSQL/SQLite** (reemplazar el store en memoria).
- Integración con **Icecast2 + Liquidsoap** para streaming y AutoDJ reales.
- Subida de archivos de audio y gestión de usuarios/revendedores.
- Despliegue (Docker) y HTTPS.
