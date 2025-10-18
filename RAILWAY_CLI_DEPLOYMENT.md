# Railway CLI Deployment Guide - PNPtv Bot

Guía optimizada para hacer deploy en Railway usando la CLI.

## Tabla de Contenidos
- [Instalación de Railway CLI](#instalación-de-railway-cli)
- [Configuración Inicial](#configuración-inicial)
- [Deployment](#deployment)
- [Variables de Entorno](#variables-de-entorno)
- [Optimizaciones Implementadas](#optimizaciones-implementadas)
- [Comandos Útiles](#comandos-útiles)
- [Troubleshooting](#troubleshooting)

---

## Instalación de Railway CLI

### Opción 1: NPM (Recomendado)
```bash
npm install -g @railway/cli
```

### Opción 2: Homebrew (macOS/Linux)
```bash
brew install railway
```

### Opción 3: Script de instalación (Linux/macOS)
```bash
bash <(curl -fsSL cli.new)
```

### Verificar instalación
```bash
railway --version
```

---

## Configuración Inicial

### 1. Login en Railway
```bash
railway login
```
Esto abrirá tu navegador para autenticarte.

### 2. Vincular proyecto existente
Si ya tienes un proyecto en Railway:
```bash
railway link
```
Selecciona tu proyecto de la lista.

### 3. O crear nuevo proyecto
```bash
railway init
```

### 4. Verificar configuración
```bash
railway status
```

---

## Deployment

### Método 1: Script Automatizado (Recomendado)

#### En Windows (PowerShell):
```powershell
.\deploy-railway.ps1
```

#### En Linux/macOS (Bash):
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

Los scripts incluyen:
- ✅ Verificación de Railway CLI
- ✅ Autenticación automática
- ✅ Validación de archivos
- ✅ Verificación de cambios no commiteados
- ✅ Deployment con confirmación
- ✅ Instrucciones post-deployment

### Método 2: Comando Directo
```bash
railway up
```

### Método 3: Deploy con logs en tiempo real
```bash
railway up --detach
railway logs
```

---

## Variables de Entorno

### Configurar desde CLI

#### Método interactivo:
```bash
railway variables
```

#### Configurar variables individuales:
```bash
# Bot Configuration
railway variables set TELEGRAM_BOT_TOKEN="your_token_here"
railway variables set ADMIN_IDS="your_telegram_id"

# Firebase
railway variables set FIREBASE_PROJECT_ID="your_project_id"
railway variables set FIREBASE_CLIENT_EMAIL="your-sa@project.iam.gserviceaccount.com"
railway variables set FIREBASE_CREDENTIALS='{"type":"service_account",...}'

# ePayco
railway variables set EPAYCO_PUBLIC_KEY="your_public_key"
railway variables set EPAYCO_PRIVATE_KEY="your_private_key"
railway variables set EPAYCO_P_CUST_ID="your_cust_id"
railway variables set EPAYCO_P_KEY="your_p_key"
railway variables set EPAYCO_TEST_MODE="true"

# Server Config
railway variables set NODE_ENV="production"
```

#### Ver variables configuradas:
```bash
railway variables
```

#### Eliminar una variable:
```bash
railway variables delete VARIABLE_NAME
```

### Configurar desde archivo

Puedes usar el archivo `railway-env.txt` como referencia y configurar las variables desde el dashboard:
```bash
railway open
```
Luego ve a **Settings → Variables** y pega las variables necesarias.

---

## Optimizaciones Implementadas

### 1. **package.json** optimizado
- ✅ Engines definidos (Node >= 18, npm >= 9)
- ✅ Scripts de Railway (`railway:deploy`, `railway:logs`, `railway:status`)
- ✅ Build command optimizado

### 2. **railway.toml** configurado
- ✅ Builder: Nixpacks
- ✅ Build command: `npm install --production=false`
- ✅ Start command: `npm start`
- ✅ Health check path: `/health`
- ✅ Restart policy con reintentos
- ✅ NODE_ENV=production

### 3. **Webhook Server** mejorado (`src/bot/webhook.js`)
- ✅ Health check endpoint (`/health`)
- ✅ Readiness probe (`/ready`)
- ✅ Auto-detección de Railway URL
- ✅ Graceful shutdown (SIGTERM/SIGINT)
- ✅ Trust proxy configurado
- ✅ Request logging optimizado
- ✅ Error handling robusto

### 4. **.railwayignore** creado
Excluye archivos innecesarios del deployment:
- Tests
- Documentación
- Archivos locales
- node_modules (se reinstalan)

### 5. **Scripts de deployment**
- `deploy-railway.sh` (Linux/macOS)
- `deploy-railway.ps1` (Windows)

---

## Comandos Útiles

### Deployment y Logs
```bash
# Deploy
railway up

# Ver logs en tiempo real
railway logs

# Ver logs con filtro
railway logs --filter "error"

# Ver últimas 100 líneas
railway logs --tail 100
```

### Estado y Monitoreo
```bash
# Ver estado del servicio
railway status

# Abrir dashboard en navegador
railway open

# Ver información del proyecto
railway whoami
```

### Variables de Entorno
```bash
# Ver todas las variables
railway variables

# Configurar variable
railway variables set KEY="value"

# Eliminar variable
railway variables delete KEY

# Ver valor de una variable
railway variables get KEY
```

### Dominios y URLs
```bash
# Ver dominio público
railway domain

# Tu URL será algo como:
# https://your-service.railway.app
```

### Servicios
```bash
# Listar servicios
railway service

# Cambiar a otro servicio
railway service <service-name>
```

### Base de datos (si usas)
```bash
# Conectar a base de datos
railway connect <database-service>
```

---

## Troubleshooting

### Error: "railway: command not found"
**Solución:**
```bash
# Reinstalar CLI
npm install -g @railway/cli

# O usar npx
npx @railway/cli up
```

### Error: "Not logged in"
**Solución:**
```bash
railway login
```

### Error: "No project selected"
**Solución:**
```bash
# Vincular proyecto existente
railway link

# O crear nuevo
railway init
```

### Bot no arranca después del deploy
**Verificar:**

1. **Logs del deployment:**
   ```bash
   railway logs
   ```

2. **Variables de entorno:**
   ```bash
   railway variables
   ```
   Verificar que todas las variables críticas estén configuradas.

3. **Health check:**
   ```bash
   # Obtener tu URL
   railway domain

   # Probar health check
   curl https://your-service.railway.app/health
   ```

4. **Readiness probe:**
   ```bash
   curl https://your-service.railway.app/ready
   ```

### Webhook no funciona
**Verificar:**

1. **URL pública configurada:**
   ```bash
   railway variables set BOT_URL="https://your-service.railway.app"
   railway variables set WEBHOOK_URL="https://your-service.railway.app"
   ```

2. **ePayco URLs actualizadas:**
   ```bash
   railway variables set EPAYCO_RESPONSE_URL="https://your-service.railway.app/epayco/response"
   railway variables set EPAYCO_CONFIRMATION_URL="https://your-service.railway.app/epayco/confirmation"
   ```

3. **Redeploy después de actualizar URLs:**
   ```bash
   railway up
   ```

### Build falla
**Verificar:**

1. **Dependencias en package.json:**
   ```bash
   # Localmente
   npm install
   npm start
   ```

2. **Node version:**
   El proyecto requiere Node >= 18
   ```bash
   node --version
   ```

3. **Ver build logs completos:**
   ```bash
   railway logs --tail 500
   ```

### Aplicación crashea después de deploy
**Verificar:**

1. **Firebase credentials:**
   ```bash
   # Debe ser JSON válido en una sola línea
   railway variables get FIREBASE_CREDENTIALS
   ```

   Validar JSON en: https://jsonlint.com/

2. **Telegram token:**
   ```bash
   railway variables get TELEGRAM_BOT_TOKEN
   ```

3. **Restart el servicio:**
   ```bash
   railway up
   ```

### Variables de entorno no se aplican
**Solución:**
Después de cambiar variables, hay que hacer redeploy:
```bash
railway up
```

---

## Workflow Recomendado

### Development → Production

```bash
# 1. Desarrollo local
npm run dev

# 2. Testear localmente
npm test

# 3. Commit cambios
git add .
git commit -m "feat: nueva funcionalidad"

# 4. Deploy a Railway
railway up

# 5. Verificar deployment
railway logs

# 6. Verificar health check
curl https://your-service.railway.app/health

# 7. Testear bot
# Enviar /start al bot en Telegram
```

---

## Comandos package.json añadidos

```json
{
  "scripts": {
    "railway:deploy": "railway up",
    "railway:logs": "railway logs",
    "railway:status": "railway status"
  }
}
```

**Uso:**
```bash
npm run railway:deploy
npm run railway:logs
npm run railway:status
```

---

## Health Checks Endpoints

El servidor webhook ahora incluye:

### 1. Root endpoint
```bash
GET https://your-service.railway.app/
```
Respuesta:
```json
{
  "service": "PNPtv Telegram Bot",
  "status": "running",
  "version": "2.0.0",
  "environment": "production"
}
```

### 2. Health check
```bash
GET https://your-service.railway.app/health
```
Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T...",
  "uptime": 3600,
  "memory": {...},
  "environment": "production"
}
```

### 3. Readiness probe
```bash
GET https://your-service.railway.app/ready
```
Respuesta:
```json
{
  "ready": true,
  "bot": {
    "id": 123456789,
    "username": "PNPtvbot",
    "firstName": "PNPtv"
  }
}
```

---

## Mejores Prácticas

### 1. Usar variables de entorno
❌ **No hardcodear URLs:**
```javascript
const url = "https://mybot.railway.app"; // Malo
```

✅ **Usar variables de entorno:**
```javascript
const url = process.env.BOT_URL; // Bueno
```

### 2. Monitorear logs regularmente
```bash
# Alias útil (añadir a .bashrc o .zshrc)
alias rw-logs="railway logs"
alias rw-status="railway status"
```

### 3. Backup de variables
```bash
# Exportar variables (para backup)
railway variables > railway-vars-backup.txt
```

### 4. Testing antes de deploy
```bash
# 1. Test local
npm test

# 2. Test connection
npm run test:connection

# 3. Deploy
railway up
```

### 5. Rollback si algo falla
En el dashboard de Railway:
1. Ve a **Deployments**
2. Encuentra el deployment anterior que funcionaba
3. Click en **Redeploy**

---

## Recursos Adicionales

- **Railway Docs**: https://docs.railway.app/
- **Railway CLI Reference**: https://docs.railway.app/develop/cli
- **Dashboard**: https://railway.app/dashboard
- **Status Page**: https://status.railway.app/

---

## Soporte

Si encuentras problemas:

1. ✅ Revisa los logs: `railway logs`
2. ✅ Verifica variables: `railway variables`
3. ✅ Consulta esta guía
4. ✅ Revisa [Railway Docs](https://docs.railway.app/)
5. ✅ Railway Discord: https://discord.gg/railway

---

## Changelog de Optimizaciones

### v2.0.0 - Railway CLI Optimization

**Añadido:**
- ✅ `railway.toml` con configuración optimizada
- ✅ `.railwayignore` para excluir archivos innecesarios
- ✅ Health check endpoints en webhook server
- ✅ Graceful shutdown handling
- ✅ Auto-detección de Railway URL
- ✅ Scripts de deployment automatizados
- ✅ Variables de entorno documentadas

**Mejorado:**
- ✅ `package.json` con engines y scripts Railway
- ✅ `src/bot/webhook.js` completamente refactorizado
- ✅ Error handling y logging

**Documentado:**
- ✅ Guía completa de Railway CLI
- ✅ Troubleshooting común
- ✅ Workflow recomendado
- ✅ Mejores prácticas

---

**¡Listo para deployment! 🚀**

Para empezar:
```bash
railway login
railway link
railway up
```
