#!/usr/bin/liquidsoap
# AutoDJ + DJ en vivo para Eternal Beat Medios.
# - Reproduce la música de /media (tu biblioteca).
# - Acepta un DJ en vivo por "harbor" (encoder/navegador) con prioridad.
# - Emite a Icecast en el mount /stream.

# Consola de control (telnet) para que el panel pueda gobernar el AutoDJ.
settings.server.telnet := true
settings.server.telnet.bind_addr := "0.0.0.0"
settings.server.telnet.port := 1234

# --- AutoDJ: playlist desde la carpeta /media ---
musica = playlist(mode="randomize", reload=300, reload_mode="watch", "/media")
# mksafe garantiza que siempre haya señal (silencio si no hay música).
musica = mksafe(musica)

# --- DJ en vivo (fuente harbor) ---
# Un encoder (BUTT, Mixxx, o el navegador vía puente) se conecta aquí.
en_vivo = input.harbor("live", port=8005, password="hackme")

# El directo tiene prioridad sobre el AutoDJ; al cortar, vuelve a la música.
radio = fallback(track_sensitive=false, [en_vivo, musica])

# --- Salida a Icecast ---
output.icecast(
  %mp3(bitrate=128),
  host="icecast",
  port=8000,
  password="hackme",
  mount="/stream",
  name="Eternal Beat Medios",
  description="Radio en vivo",
  genre="Variada",
  radio
)
