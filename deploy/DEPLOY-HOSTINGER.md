# 🚀 Migrar Eternal Beat a un VPS de Hostinger

Guía completa para dejar el panel **permanente, autónomo y con HTTPS** en un VPS,
con la base de datos y los audios guardados en disco (nunca se reinician).

> Resultado final: `https://panel.tudominio.com` funcionando 24/7, con datos
> persistentes, copias de seguridad y (opcional) radio que emite sola sin tu Mac.

---

## 0) Requisitos

- Un **VPS de Hostinger** (NO el hosting compartido). Mínimo recomendado:
  **2 vCPU · 4 GB RAM · 40+ GB NVMe**, con **Ubuntu 22/24** y **Docker**.
  - Al crear el VPS, si Hostinger ofrece una **plantilla con Docker** (o "Ubuntu + Docker"), elígela.
- Un **dominio** (o subdominio) que puedas apuntar al VPS. Ej: `panel.tudominio.com`.
- Tu **copia de seguridad** exportada desde el panel actual
  (Configuración → Copia de seguridad → **Exportar**).

---

## 1) Apuntar el dominio al VPS (DNS)

En tu proveedor de dominio crea un registro:

| Tipo | Nombre            | Valor (Apunta a)        |
|------|-------------------|-------------------------|
| A    | `panel`           | `LA_IP_DE_TU_VPS`       |

Espera unos minutos a que propague. (La IP del VPS la ves en el panel de Hostinger.)

---

## 2) Conectarte al VPS por SSH

Desde tu Mac/PC (usa los datos que te da Hostinger):

```bash
ssh root@LA_IP_DE_TU_VPS
```

---

## 3) Instalar Docker (si no viene en la plantilla)

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

---

## 4) Clonar el proyecto

```bash
cd /opt
git clone https://github.com/radioeternalbeat-prog/PANEL-RADIO-ON-LINE-.git eternal-beat
cd eternal-beat
```

> Si el repositorio es **privado**, usa un *token* de GitHub:
> `git clone https://TU_TOKEN@github.com/radioeternalbeat-prog/PANEL-RADIO-ON-LINE-.git eternal-beat`

---

## 5) Configurar las variables de entorno

```bash
cp .env.example .env
nano .env
```

Rellena **como mínimo**:

- `DOMINIO` → `panel.tudominio.com`
- `EMAIL_SSL` → tu correo (para el certificado SSL)
- `JWT_SECRET` → genera uno: `openssl rand -hex 32`
- `ADMIN_PASSWORD` → una contraseña fuerte
- `CORS_ORIGIN` → `https://panel.tudominio.com`
- `STREAM_URL` → tu URL de stream (Caster.fm o tu Icecast)

Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.

---

## 6) Levantar el panel (con HTTPS automático)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- Caddy obtiene el certificado SSL solo (Let's Encrypt).
- En ~1 minuto entra a **`https://panel.tudominio.com`**.
- Inicia sesión con `admin` y tu `ADMIN_PASSWORD`.

Ver el estado / registros:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f panel
```

---

## 7) Migrar tus datos (importar la copia de seguridad)

1. En el panel nuevo: **Configuración → Copia de seguridad → Importar / restaurar**.
2. Sube el archivo `eternal-beat-backup-*.json` que exportaste del panel viejo.
3. Recarga la página. Recuperas estaciones, playlists, programación, inserciones, etc.

> Los **archivos de audio** (.mp3) son binarios y NO van en el backup JSON.
> Vuelve a subirlos desde **AutoDJ → Subir música / Playlists**; ahora **quedan
> guardados de forma permanente** en `/opt/eternal-beat/data/uploads`.

---

## 8) Streaming: que la radio suene sola 24/7

Tienes dos caminos. Elige uno:

### Opción A — AzuraCast (recomendado, más completo)
1. Instala **AzuraCast** (Hostinger tiene plantilla de 1 clic, o en su propio VPS).
2. Crea tu estación y sube tu música a AzuraCast (AutoDJ 24/7).
3. **Conecta el panel a AzuraCast** para datos 100% reales (ahora suena, oyentes,
   historial) sin que el panel tenga que reportar nada: en `.env` define
   ```
   AZURACAST_BASE_URL=https://radio.tudominio.com
   AZURACAST_STATION=el-shortcode-de-tu-estacion
   ```
   y reinicia el panel (`bash deploy/deploy.sh`). El panel detecta AzuraCast
   automáticamente y toma de ahí las estadísticas.

### Opción B — Nuestro Icecast + Liquidsoap (todo en este VPS)
1. **Cambia las contraseñas** `hackme` por unas propias en:
   - `streaming/icecast/icecast.xml` (`<source-password>` y `<relay-password>`)
   - `streaming/liquidsoap/radio.liq` (los `password="hackme"`)
2. Levanta también el perfil de radio:
   ```bash
   docker compose -f docker-compose.prod.yml --profile radio up -d --build
   ```
3. El AutoDJ reproduce automáticamente la música que subes desde el panel
   (carpeta `data/uploads`, montada en Liquidsoap como `/media`).
4. Oyentes: `http://LA_IP_DE_TU_VPS:8000/stream`.
   Para HTTPS, define `DOMINIO_STREAM` en `.env`, descomenta el bloque del
   `Caddyfile` y recarga Caddy.

---

## 9) Mantenimiento

**Actualizar a la última versión del código:**
```bash
cd /opt/eternal-beat
bash deploy/deploy.sh          # atajo: git pull + rebuild + restart
# (o, para incluir el streaming propio: bash deploy/deploy.sh radio)
```

**Reiniciar / detener:**
```bash
docker compose -f docker-compose.prod.yml restart panel
docker compose -f docker-compose.prod.yml down        # detener todo
```

**Copia de seguridad periódica (recomendado):**
- Desde el panel: Configuración → Exportar (descarga el JSON).
- A nivel servidor, respalda toda la carpeta de datos:
  ```bash
  tar czf eternal-beat-data-$(date +%F).tgz -C /opt/eternal-beat data
  ```
  (incluye base de datos **y** audios). Guárdala fuera del VPS.

---

## 10) Problemas comunes

- **No carga HTTPS:** revisa que el DNS apunte a la IP del VPS y que los puertos
  **80 y 443** estén abiertos en el firewall de Hostinger.
- **"Bad Gateway":** el panel aún está construyéndose; mira `logs -f panel`.
- **Olvidé la contraseña admin:** borra la BD para re-sembrar
  (`rm -f data/panel.db` y reinicia) — ⚠️ perderás datos no respaldados; mejor
  importa una copia.
- **El stream no suena en el panel:** si usas Caster.fm gratis, usa el
  reproductor embebido (ya integrado). Con AzuraCast/Icecast propio, usa la URL
  HTTPS pública.

---

## ✅ Checklist final
- [ ] VPS creado (con Docker) y dominio apuntando a su IP
- [ ] `.env` configurado (dominio, secretos, contraseña admin)
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` corriendo
- [ ] `https://panel.tudominio.com` accesible y con login
- [ ] Copia de seguridad importada (datos migrados)
- [ ] Música subida (queda permanente)
- [ ] Streaming configurado (AzuraCast o Icecast propio)
- [ ] Copia de seguridad guardada fuera del VPS
