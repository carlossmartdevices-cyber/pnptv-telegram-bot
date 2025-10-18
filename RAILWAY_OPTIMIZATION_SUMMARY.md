# Railway Deployment Optimization - Summary

## Resumen de Optimizaciones Implementadas

Este documento resume todas las optimizaciones realizadas para hacer deploy del bot PNPtv en Railway usando CLI.

---

## Archivos Creados

### 1. `railway.toml` ⭐
Archivo de configuración principal de Railway con:
- Builder: Nixpacks
- Build command optimizado
- Start command
- Health check path
- Restart policy con 5 reintentos
- NODE_ENV=production

### 2. `.railwayignore`
Excluye archivos innecesarios del deployment:
- node_modules
- .env files
- tests
- documentación
- archivos temporales
- logs

### 3. `railway-env.txt`
Template con todas las variables de entorno necesarias para Railway, incluyendo:
- TELEGRAM_BOT_TOKEN
- FIREBASE_* variables
- EPAYCO_* credentials
- BOT_URL / WEBHOOK_URL
- Referencias de comandos CLI

### 4. `deploy-railway.sh` (Linux/macOS)
Script automatizado de deployment que incluye:
- Verificación de Railway CLI
- Autenticación
- Pre-deployment checks
- Deployment con confirmación
- Post-deployment instructions

### 5. `deploy-railway.ps1` (Windows)
Versión PowerShell del script de deployment con las mismas funcionalidades.

### 6. `RAILWAY_CLI_DEPLOYMENT.md` 📚
Documentación completa con:
- Instalación de Railway CLI
- Configuración inicial
- Comandos de deployment
- Variables de entorno
- Troubleshooting
- Mejores prácticas
- Health check endpoints

### 7. `RAILWAY_OPTIMIZATION_SUMMARY.md` (este archivo)
Resumen de todas las optimizaciones.

---

## Archivos Modificados

### 1. `package.json` ✅
**Añadido:**
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "build": "echo 'No build step required'",
    "railway:deploy": "railway up",
    "railway:logs": "railway logs",
    "railway:status": "railway status"
  }
}
```

### 2. `src/bot/webhook.js` 🚀
**Completamente refactorizado con:**

**Añadido:**
- Trust proxy para Railway
- Request logging middleware
- Root endpoint (`/`)
- Enhanced health check (`/health`)
- Readiness probe (`/ready`)
- 404 handler
- Error handler mejorado
- Auto-detección de Railway URL (`RAILWAY_PUBLIC_DOMAIN`)
- Graceful shutdown (SIGTERM/SIGINT)
- 10 second grace period para requests activos
- Better logging y console output
- Host `0.0.0.0` (requerido para Railway)

**Endpoints disponibles:**
- `GET /` - Info del servicio
- `GET /health` - Health check con uptime y memoria
- `GET /ready` - Readiness probe (verifica conexión con Telegram)
- `POST /bot{TOKEN}` - Webhook de Telegram

---

## Optimizaciones por Categoría

### 🏗️ Build & Deploy
- ✅ Nixpacks builder configurado
- ✅ Build command optimizado: `npm install --production=false`
- ✅ Start command: `npm start`
- ✅ .railwayignore para reducir tamaño de deployment
- ✅ Scripts automatizados de deployment

### 🔧 Runtime
- ✅ Node >= 18 requerido
- ✅ NODE_ENV=production
- ✅ Graceful shutdown handling
- ✅ Restart policy con reintentos
- ✅ Trust proxy configurado

### 🏥 Health Checks
- ✅ `/health` - Básico (uptime, memoria, status)
- ✅ `/ready` - Avanzado (verifica conexión con Telegram API)
- ✅ healthcheckPath en railway.toml
- ✅ healthcheckTimeout: 30 segundos

### 📊 Observability
- ✅ Request logging (con duración)
- ✅ Winston logger integrado
- ✅ Sentry integration (ya existente)
- ✅ Error handling mejorado
- ✅ 7 días de log retention

### 🔐 Seguridad
- ✅ Variables de entorno validadas
- ✅ Trust proxy habilitado
- ✅ Body parser con límite de 10mb
- ✅ Error messages sanitizados

### 🌐 Networking
- ✅ Host: 0.0.0.0 (Railway compatible)
- ✅ PORT auto-assigned por Railway
- ✅ Auto-detección de RAILWAY_PUBLIC_DOMAIN
- ✅ Webhook URL auto-configuración

---

## Comandos Railway CLI

### Instalación
```bash
npm install -g @railway/cli
```

### Setup inicial
```bash
railway login
railway link  # o railway init para nuevo proyecto
```

### Deployment
```bash
# Opción 1: Script automatizado
./deploy-railway.sh  # Linux/macOS
./deploy-railway.ps1  # Windows

# Opción 2: Comando directo
railway up

# Opción 3: Con npm script
npm run railway:deploy
```

### Monitoreo
```bash
railway logs           # Ver logs en tiempo real
railway status         # Ver estado del servicio
railway variables      # Ver/editar variables de entorno
railway open           # Abrir dashboard en navegador
```

---

## Variables de Entorno Requeridas

### Críticas (REQUERIDAS)
```bash
TELEGRAM_BOT_TOKEN=xxx
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_CREDENTIALS='{"type":"service_account",...}'
```

### Importantes
```bash
NODE_ENV=production
PORT=${{PORT}}  # Auto-assigned por Railway
BOT_URL=https://your-service.railway.app
WEBHOOK_URL=https://your-service.railway.app
ADMIN_IDS=xxx
```

### Opcionales
```bash
EPAYCO_PUBLIC_KEY=xxx
EPAYCO_PRIVATE_KEY=xxx
EPAYCO_P_CUST_ID=xxx
EPAYCO_P_KEY=xxx
EPAYCO_TEST_MODE=true
SENTRY_DSN=xxx
```

**Configurar desde CLI:**
```bash
railway variables set TELEGRAM_BOT_TOKEN="xxx"
railway variables set FIREBASE_PROJECT_ID="xxx"
# etc...
```

---

## Workflow de Deployment

```
1. Desarrollo Local
   ↓
2. Testing (npm test)
   ↓
3. Commit cambios (git)
   ↓
4. Deploy a Railway (railway up)
   ↓
5. Verificar logs (railway logs)
   ↓
6. Health check (curl /health)
   ↓
7. Test bot (Telegram)
```

---

## Health Check Testing

Después del deployment, verificar:

```bash
# Obtener URL
railway domain

# Test root endpoint
curl https://your-service.railway.app/

# Test health check
curl https://your-service.railway.app/health

# Test readiness
curl https://your-service.railway.app/ready
```

**Respuestas esperadas:**

**Root (`/`):**
```json
{
  "service": "PNPtv Telegram Bot",
  "status": "running",
  "version": "2.0.0",
  "environment": "production"
}
```

**Health (`/health`):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T...",
  "uptime": 3600,
  "memory": {...},
  "environment": "production"
}
```

**Ready (`/ready`):**
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

## Troubleshooting Común

### Bot no arranca
```bash
# Ver logs
railway logs

# Verificar variables
railway variables

# Verificar FIREBASE_CREDENTIALS (debe ser JSON válido)
railway variables get FIREBASE_CREDENTIALS
```

### Webhook no funciona
```bash
# Actualizar URLs
railway variables set BOT_URL="https://your-service.railway.app"
railway variables set WEBHOOK_URL="https://your-service.railway.app"

# Redeploy
railway up
```

### Build falla
```bash
# Ver logs completos
railway logs --tail 500

# Testear localmente
npm install
npm start
```

---

## Mejores Prácticas

### ✅ DO
- Usar variables de entorno para todas las URLs
- Monitorear logs regularmente: `railway logs`
- Verificar health checks después de deploy
- Backup de variables: `railway variables > backup.txt`
- Testear localmente antes de deploy
- Usar scripts automatizados de deployment

### ❌ DON'T
- Hardcodear URLs en el código
- Commitear archivos `.env` al repo
- Ignorar errores en logs
- Deploy sin testear localmente
- Cambiar variables sin redeploy

---

## Performance Improvements

### Antes de la optimización:
- ❌ No había health checks
- ❌ No había graceful shutdown
- ❌ URL hardcodeada
- ❌ Sin configuración Railway específica
- ❌ Logs limitados

### Después de la optimización:
- ✅ Health checks: `/health` y `/ready`
- ✅ Graceful shutdown con 10s grace period
- ✅ Auto-detección de Railway URL
- ✅ railway.toml con configuración optimizada
- ✅ Request logging completo
- ✅ Error handling robusto
- ✅ Restart policy automático
- ✅ Scripts de deployment automatizados

---

## Estructura de Archivos

```
project-root/
├── railway.toml                    # ⭐ Config Railway
├── .railwayignore                  # ⭐ Archivos a ignorar
├── railway-env.txt                 # ⭐ Template de variables
├── deploy-railway.sh               # ⭐ Script deployment (Bash)
├── deploy-railway.ps1              # ⭐ Script deployment (PowerShell)
├── RAILWAY_CLI_DEPLOYMENT.md       # ⭐ Documentación completa
├── RAILWAY_OPTIMIZATION_SUMMARY.md # ⭐ Este archivo
├── package.json                    # ✅ Modificado (engines, scripts)
├── src/
│   └── bot/
│       └── webhook.js              # ✅ Completamente refactorizado
└── ...
```

---

## Métricas de Optimización

### Deployment Speed
- **Antes:** Manual, sin validaciones
- **Ahora:** Automatizado con validaciones en <30s

### Reliability
- **Antes:** Sin health checks, sin restart policy
- **Ahora:** Health checks + readiness probe + restart policy

### Observability
- **Antes:** Logs básicos
- **Ahora:** Request logging + Winston + Sentry + duration tracking

### Developer Experience
- **Antes:** Comandos manuales, sin documentación
- **Ahora:** Scripts automatizados + documentación completa + npm shortcuts

---

## Next Steps (Opcional)

### Mejoras futuras que podrías implementar:

1. **Monitoring Avanzado**
   - Integrar Prometheus metrics
   - Añadir alertas en Sentry
   - Dashboard de métricas

2. **CI/CD Pipeline**
   - GitHub Actions para auto-deploy
   - Tests automáticos pre-deploy
   - Rollback automático si falla

3. **Scaling**
   - Railway auto-scaling
   - Load balancing
   - Caching con Redis

4. **Testing**
   - Tests de integración
   - Tests E2E del webhook
   - Performance testing

---

## Recursos

- 📚 [Documentación completa](./RAILWAY_CLI_DEPLOYMENT.md)
- 🚀 [Railway Docs](https://docs.railway.app/)
- 🛠️ [Railway CLI Reference](https://docs.railway.app/develop/cli)
- 💬 [Railway Discord](https://discord.gg/railway)

---

## Conclusión

Tu proyecto ahora está completamente optimizado para Railway deployment con:

✅ Configuración automatizada
✅ Health checks robustos
✅ Graceful shutdown
✅ Scripts de deployment
✅ Documentación completa
✅ Error handling mejorado
✅ Observability implementada

**Para empezar:**
```bash
railway login
railway link
./deploy-railway.sh  # o .ps1 en Windows
```

**¡Listo para producción! 🚀**
