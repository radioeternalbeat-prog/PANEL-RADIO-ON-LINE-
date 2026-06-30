#!/usr/bin/liquidsoap
# Emite directamente a Caster.fm (Icecast 2.5) para Eternal Beat.
#
# La contraseña del "source" NUNCA se escribe aquí: se toma de la
# variable de entorno CASTER_PASSWORD.
#
# Uso:
#   export CASTER_PASSWORD="tu_clave_source"
#   liquidsoap streaming/liquidsoap/radio-caster.liq
#
# O con Docker (ver docker-compose):
#   CASTER_PASSWORD=... docker compose up liquidsoap-caster

# --- Helper para leer variables de entorno con valor por defecto ---
def env(key, defecto)
  v = environment.get(key)
  if v == "" then defecto else v end
end

caster_host = env("CASTER_HOST", "sapircast.caster.fm")
caster_port = int_of_string(env("CASTER_PORT", "13721"))
caster_mount = env("CASTER_MOUNT", "/D6md9")
caster_user = env("CASTER_USER", "source")
caster_pass = environment.get("CASTER_PASSWORD")   # obligatoria (secreta)
caster_bitrate = int_of_string(env("CASTER_BITRATE", "96"))

# Consola de control (telnet) para gobernar el AutoDJ desde el panel.
settings.server.telnet := true
settings.server.telnet.bind_addr := "0.0.0.0"
settings.server.telnet.port := 1234

# --- AutoDJ: música desde /media (tu biblioteca) ---
musica = playlist(mode="randomize", reload=300, reload_mode="watch", "/media")
musica = mksafe(musica)

# --- DJ en vivo (harbor): un encoder/navegador se conecta aquí con prioridad ---
en_vivo = input.harbor("live", port=8005, password=env("HARBOR_PASSWORD", "cambia_esto"))
radio = fallback(track_sensitive=false, [en_vivo, musica])

# --- Salida hacia Caster.fm ---
output.icecast(
  %mp3(bitrate=caster_bitrate),
  host=caster_host,
  port=caster_port,
  user=caster_user,
  password=caster_pass,
  mount=caster_mount,
  name="Eternal Beat",
  description="Eternal Beat Medios",
  genre="Variada",
  radio
)
