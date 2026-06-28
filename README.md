# 📻 PANEL RADIO ONLINE

Panel de control de streaming de radio online inspirado en **Centova Cast**. Permite
gestionar estaciones, oyentes, AutoDJ y estadísticas desde una interfaz web moderna.

> ⚠️ Versión inicial: la interfaz está completa y funcional con **datos simulados**.
> La integración real con servidores Icecast/SHOUTcast se irá conectando por etapas.

## ✨ Funcionalidades

- **Login** — pantalla de inicio de sesión (demo: cualquier credencial funciona).
- **Estaciones** — panel con tarjetas por estación: estado, oyentes, pico, capacidad,
  canción actual y controles de iniciar/detener + escuchar.
- **Estadísticas** — gráficas de oyentes (24h), distribución por país, ancho de banda
  semanal y detalle por estación.
- **AutoDJ** — biblioteca de música, playlists con pesos y programación de horarios.
- **Configuración** — ajustes del servidor, calidad de audio, credenciales y URL del stream.
- **Reproductor web** — mini reproductor global embebido en el panel.

## 🛠️ Stack

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Recharts](https://recharts.org/) (gráficas)
- [Lucide](https://lucide.dev/) (iconos)

## 🚀 Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # previsualizar el build
```

## 📁 Estructura

```
src/
├── components/      # Layout, MiniReproductor
├── context/         # PlayerContext (reproductor global)
├── data/            # mockData.js (datos simulados)
├── pages/           # Login, Dashboard, Estadisticas, AutoDJ, Configuracion
├── App.jsx          # Rutas
└── main.jsx         # Punto de entrada
```

## 🗺️ Próximos pasos

- Backend (Node.js/Express o Python) que exponga la API real.
- Integración con **Icecast2** + **Liquidsoap** para AutoDJ.
- Autenticación real (JWT) y gestión de usuarios/revendedores.
- Estadísticas en tiempo real vía WebSocket.
