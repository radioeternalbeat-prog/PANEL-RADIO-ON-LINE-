# Script de PRUEBA: emite un tono (sine) a Icecast para verificar el stack.
radio = mksafe(sine(440.))
output.icecast(
  %mp3(bitrate=128),
  host="icecast",
  port=8000,
  password="hackme",
  mount="/stream",
  name="PRUEBA Eternal Beat",
  radio
)
