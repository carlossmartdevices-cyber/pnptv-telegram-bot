# 🚀 Railway Quick Fix - Firebase Credentials

## El Problema

Tu bot está crasheando con este error:
```
Error parsing FIREBASE_CREDENTIALS: Unterminated string in JSON at position 155
```

## Solución en 3 Pasos

### Paso 1: Preparar las credenciales

Tienes tu archivo `firebase-credentials.json` de Firebase Console. Ejecuta:

```bash
node prepare-firebase-env.js ./ruta/a/firebase-credentials.json
```

Esto generará:
- ✅ `firebase-credentials-minified.txt` - JSON en una línea
- ✅ `firebase-credentials-base64.txt` - Version base64
- ✅ `railway-firebase-commands.sh` - Script automatizado

### Paso 2: Configurar en Railway

**Opción A: Dashboard (RECOMENDADO)**
```bash
railway open
```
1. Ve a **Settings → Variables**
2. Click **+ New Variable**
3. Name: `FIREBASE_CREDENTIALS`
4. Value: Copia TODO el contenido de `firebase-credentials-minified.txt`
5. Click **Add**

**Opción B: CLI**
```bash
# Linux/macOS
railway variables set FIREBASE_CREDENTIALS="$(cat firebase-credentials-minified.txt)"

# Windows (PowerShell)
$content = Get-Content firebase-credentials-minified.txt -Raw
railway variables set FIREBASE_CREDENTIALS="$content"
```

**Opción C: Script automatizado**
```bash
chmod +x railway-firebase-commands.sh
./railway-firebase-commands.sh
```

### Paso 3: Deploy y verificar

```bash
# Deploy
railway up

# Verificar logs
railway logs
```

**Busca estos mensajes (✅ = éxito):**
```
✅ Using Firebase credentials from environment variable
   Project ID: your-project-id
   Client Email: your-email@project.iam.gserviceaccount.com
✅ Firebase ha sido inicializado correctamente.
🚀 PNPtv Bot Server Started
```

## Si no tienes el archivo firebase-credentials.json

1. Ve a Firebase Console: https://console.firebase.google.com/
2. Selecciona tu proyecto
3. **Project Settings** (⚙️ icono arriba izquierda)
4. Tab **Service Accounts**
5. Click **Generate New Private Key**
6. Descarga el archivo JSON
7. Guárdalo como `firebase-credentials.json`
8. Vuelve al Paso 1

## Variables de entorno requeridas

Además de `FIREBASE_CREDENTIALS`, necesitas:

```bash
railway variables set TELEGRAM_BOT_TOKEN="tu_token_aqui"
railway variables set FIREBASE_PROJECT_ID="tu-project-id"
railway variables set NODE_ENV="production"
railway variables set ADMIN_IDS="tu_telegram_user_id"
```

## Verificar que todo está bien

```bash
# Ver todas las variables
railway variables

# Debe mostrar (al menos):
FIREBASE_CREDENTIALS = {"type":"service_account"... (truncated)
FIREBASE_PROJECT_ID = your-project-id
TELEGRAM_BOT_TOKEN = 1234567890:ABCDef...
NODE_ENV = production
ADMIN_IDS = 123456789
```

## Troubleshooting Rápido

### Error: "command not found: railway"
```bash
npm install -g @railway/cli
railway login
railway link
```

### Error: "File not found: firebase-credentials.json"
Descárgalo de Firebase Console (ver arriba)

### Error: "FIREBASE_CREDENTIALS length: 155 chars"
El JSON está truncado. Asegúrate de copiar TODO el contenido del archivo minificado.

### Error: "Missing required fields"
El JSON no es válido o está incompleto. Descarga uno nuevo de Firebase Console.

### El bot sigue crasheando
```bash
# Ver logs completos
railway logs --tail 100

# Verificar variables
railway variables get FIREBASE_CREDENTIALS

# Si es muy corto (< 1000 chars), está truncado
# Vuelve a configurar con el archivo minified completo
```

## Una vez que funciona

Deberías ver en los logs:
```
Starting PNPtv Bot...
Iniciando Firebase...
FIREBASE_CREDENTIALS length: 1234 chars
✅ Using Firebase credentials from environment variable
✅ Firebase ha sido inicializado correctamente.
🚀 PNPtv Bot Server Started
   - Environment: production
   - Port: 3000
   - Bot Username: @PNPtvbot
```

**¡Listo! Tu bot está corriendo en Railway. 🎉**

## Recursos

- **Documentación completa:** `FIREBASE_RAILWAY_FIX.md`
- **Deployment guide:** `RAILWAY_CLI_DEPLOYMENT.md`
- **Railway Dashboard:** `railway open`
- **Logs en tiempo real:** `railway logs`

---

**Última actualización:** 2025-10-17
