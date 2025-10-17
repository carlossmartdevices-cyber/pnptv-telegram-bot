# Guía Completa de Despliegue en Producción

## 📋 Tabla de Contenidos

1. [Preparación Pre-Despliegue](#preparación-pre-despliegue)
2. [Despliegue en Railway](#despliegue-en-railway)
3. [Despliegue en Heroku](#despliegue-en-heroku)
4. [Configuración Post-Despliegue](#configuración-post-despliegue)
5. [Verificación de Producción](#verificación-de-producción)
6. [Monitoreo y Logs](#monitoreo-y-logs)
7. [Mantenimiento](#mantenimiento)
8. [Rollback y Recuperación](#rollback-y-recuperación)

---

## Preparación Pre-Despliegue

### Checklist Pre-Despliegue

Antes de desplegar, verifica que hayas completado:

#### ✅ Código y Pruebas
- [ ] Todo el código está commitido en Git
- [ ] Todas las pruebas locales pasan
- [ ] `node test-epayco.js` ejecuta exitosamente
- [ ] No hay errores en consola
- [ ] Dependencias actualizadas (`npm install`)

#### ✅ Configuración
- [ ] Archivo `.env` configurado correctamente
- [ ] Variables de entorno documentadas
- [ ] Credenciales de producción obtenidas
- [ ] Credenciales de Firebase configuradas
- [ ] Bot de Telegram creado

#### ✅ Base de Datos
- [ ] Firebase Firestore configurado
- [ ] Índices de Firestore creados
- [ ] Colecciones inicializadas
- [ ] Reglas de seguridad configuradas

#### ✅ Pagos
- [ ] Credenciales de ePayco de producción obtenidas
- [ ] Modo de prueba probado exitosamente
- [ ] Webhooks probados localmente
- [ ] Planes de suscripción configurados

### Obtener Credenciales de Producción

#### 1. Firebase (Producción)
```bash
# Obtener credenciales desde Firebase Console
# https://console.firebase.google.com/

# Ir a: Configuración del Proyecto → Cuentas de Servicio
# Descargar: JSON de credenciales de producción
```

#### 2. ePayco (Producción)
```bash
# Ingresar a: https://dashboard.epayco.co/
# Ir a: Configuración → API Keys
# Ambiente: PRODUCCIÓN (no pruebas)
# Copiar todas las credenciales
```

#### 3. Telegram Bot
```bash
# Si no tienes un bot, créalo:
# 1. Abre Telegram y busca @BotFather
# 2. Envía /newbot
# 3. Sigue las instrucciones
# 4. Guarda el token que te proporciona
```

---

## Despliegue en Railway

Railway es la plataforma recomendada por su facilidad de uso y configuración.

### Paso 1: Crear Cuenta en Railway

1. Visita https://railway.app/
2. Haz clic en "Start a New Project"
3. Inicia sesión con GitHub

### Paso 2: Crear Nuevo Proyecto

#### Opción A: Desde GitHub (Recomendado)

1. Haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Autoriza Railway para acceder a tus repositorios
4. Selecciona tu repositorio `Bots`
5. Railway detectará automáticamente que es una app de Node.js

#### Opción B: Desde CLI de Railway

```bash
# Instalar CLI de Railway
npm install -g @railway/cli

# Iniciar sesión
railway login

# Inicializar proyecto
railway init

# Vincular con repositorio Git
railway link
```

### Paso 3: Configurar Variables de Entorno

En el dashboard de Railway:

1. Ve a tu proyecto
2. Haz clic en "Variables"
3. Agrega todas las variables necesarias:

```env
# Bot de Telegram
TELEGRAM_TOKEN=tu_token_de_telegram
TELEGRAM_BOT_TOKEN=tu_token_de_telegram
CHANNEL_ID=tu_channel_id
ADMIN_IDS=tu_telegram_user_id

# Firebase
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_CREDENTIALS={"type":"service_account",...}

# ePayco (PRODUCCIÓN)
EPAYCO_PUBLIC_KEY=tu_public_key_produccion
EPAYCO_PRIVATE_KEY=tu_private_key_produccion
EPAYCO_P_CUST_ID=tu_customer_id_produccion
EPAYCO_P_KEY=tu_p_key_produccion
EPAYCO_TEST_MODE=false
EPAYCO_STRICT_SIGNATURE_MODE=true

# URLs (Railway te proporciona esto)
BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
WEB_APP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
WEBAPP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
PORT=3000

# Webhook URLs (se generan automáticamente)
EPAYCO_RESPONSE_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/confirmation
```

**⚠️ Importante:**
- `FIREBASE_CREDENTIALS` debe ser el JSON completo en una sola línea
- `EPAYCO_TEST_MODE=false` para producción
- `BOT_URL` sin "/" al final

### Paso 4: Configurar Build y Start

Railway detecta automáticamente, pero puedes verificar:

1. Ve a "Settings"
2. Verifica "Build Command": `npm install`
3. Verifica "Start Command": `npm start`

O crea/verifica `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/epayco/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Paso 5: Desplegar

#### Desde GitHub (Automático)
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Railway desplegará automáticamente cuando detecte cambios en `main`.

#### Desde CLI
```bash
railway up
```

### Paso 6: Obtener URL Pública

1. Ve a tu proyecto en Railway
2. Haz clic en "Settings" → "Domains"
3. Copia la URL: `tu-proyecto.up.railway.app`
4. Actualiza `BOT_URL` con esta URL

### Paso 7: Configurar Webhook de Telegram

```bash
# Reemplaza con tu token y URL
curl -X POST "https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/webhook"

# Verificar
curl "https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo"
```

**Resultado esperado:**
```json
{
  "ok": true,
  "result": {
    "url": "https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Despliegue en Heroku

### Paso 1: Crear Cuenta en Heroku

1. Visita https://heroku.com/
2. Crea una cuenta gratuita
3. Verifica tu email

### Paso 2: Instalar CLI de Heroku

**Windows:**
```powershell
# Descarga desde: https://devcenter.heroku.com/articles/heroku-cli
```

**Mac:**
```bash
brew tap heroku/brew && brew install heroku
```

**Linux:**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

### Paso 3: Iniciar Sesión

```bash
heroku login
```

### Paso 4: Crear Aplicación

```bash
# Crear app con nombre único
heroku create tu-app-nombre

# O dejar que Heroku genere un nombre
heroku create
```

### Paso 5: Configurar Variables de Entorno

```bash
# Bot de Telegram
heroku config:set TELEGRAM_TOKEN=tu_token
heroku config:set TELEGRAM_BOT_TOKEN=tu_token
heroku config:set CHANNEL_ID=tu_channel_id
heroku config:set ADMIN_IDS=tu_user_id

# Firebase
heroku config:set FIREBASE_PROJECT_ID=tu_proyecto_id
heroku config:set FIREBASE_CREDENTIALS='{"type":"service_account",...}'

# ePayco (PRODUCCIÓN)
heroku config:set EPAYCO_PUBLIC_KEY=tu_public_key
heroku config:set EPAYCO_PRIVATE_KEY=tu_private_key
heroku config:set EPAYCO_P_CUST_ID=tu_customer_id
heroku config:set EPAYCO_P_KEY=tu_p_key
heroku config:set EPAYCO_TEST_MODE=false
heroku config:set EPAYCO_STRICT_SIGNATURE_MODE=true

# URLs
heroku config:set BOT_URL=https://tu-app.herokuapp.com
heroku config:set WEB_APP_URL=https://tu-app.herokuapp.com
heroku config:set WEBAPP_URL=https://tu-app.herokuapp.com
```

O usa el script automatizado:

```bash
# Windows
.\heroku-env-setup.ps1

# Mac/Linux
./heroku-env-setup.sh
```

### Paso 6: Configurar Procfile

Verifica que existe `Procfile` en la raíz:

```
web: node src/bot/index.js
```

### Paso 7: Desplegar

```bash
# Agregar remote de Heroku (si no existe)
heroku git:remote -a tu-app-nombre

# Commit y push
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Paso 8: Escalar Dynos

```bash
# Iniciar un dyno web
heroku ps:scale web=1

# Verificar estado
heroku ps
```

### Paso 9: Configurar Webhook

```bash
# Obtener URL de la app
heroku info

# Configurar webhook
curl -X POST "https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://tu-app.herokuapp.com/webhook"
```

---

## Configuración Post-Despliegue

### 1. Verificar Despliegue Exitoso

#### Railway:
```bash
# Ver logs en vivo
railway logs

# O visita el dashboard
```

#### Heroku:
```bash
# Ver logs en vivo
heroku logs --tail

# Ver últimas 100 líneas
heroku logs -n 100
```

### 2. Probar Endpoints

```bash
# Health check
curl https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/health

# Test de configuración
curl https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/debug/test-payment

# Info de webhook de Telegram
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### 3. Configurar Dominio Personalizado (Opcional)

#### Railway:
1. Ve a "Settings" → "Domains"
2. Haz clic en "Add Domain"
3. Ingresa tu dominio: `bot.tudominio.com`
4. Configura DNS según instrucciones

#### Heroku:
```bash
# Agregar dominio
heroku domains:add bot.tudominio.com

# Ver instrucciones de DNS
heroku domains
```

### 4. Configurar SSL/HTTPS

Railway y Heroku proporcionan SSL automáticamente. Verifica:

```bash
curl -I https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
# Debe mostrar: HTTP/2 200
```

### 5. Inicializar Base de Datos

Si es el primer despliegue, inicializa datos:

```bash
# Crear planes de suscripción
# Puedes hacerlo desde el bot como admin
# O ejecutar un script de inicialización
```

---

## Verificación de Producción

### Checklist de Verificación

#### ✅ Infraestructura
```bash
# Verificar app está corriendo
curl https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/health
# Esperado: {"status":"ok"}

# Verificar logs no tienen errores
railway logs
# o
heroku logs --tail
```

#### ✅ Bot de Telegram
1. Abre Telegram
2. Busca tu bot
3. Envía `/start`
4. Verifica que responde correctamente

#### ✅ Webhooks de Telegram
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Verifica:
- `"url"` apunta a tu app
- `"has_custom_certificate": false`
- `"pending_update_count": 0`

#### ✅ Configuración de ePayco
```bash
# Probar endpoint de debug
curl https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/debug/test-payment | json_pp
```

Verifica:
- Todas las credenciales marcadas como "✓ Configured"
- `"environment": "production"` (si EPAYCO_TEST_MODE=false)
- Payment link se crea exitosamente

#### ✅ Mini App
1. Abre el bot en Telegram
2. Haz clic en el botón del Mini App
3. Verifica que carga correctamente
4. Prueba todas las funcionalidades

#### ✅ Pagos (Prueba Pequeña)
1. Crea un plan de bajo costo (ej. $1000 COP)
2. Intenta completar una compra real
3. Verifica que el webhook se recibe
4. Verifica que la membresía se activa

---

## Monitoreo y Logs

### Ver Logs en Tiempo Real

#### Railway:
```bash
# CLI
railway logs

# Web
# Visita: https://railway.app/ → Tu Proyecto → Logs
```

#### Heroku:
```bash
# Últimos logs
heroku logs

# Logs en vivo
heroku logs --tail

# Filtrar por patrón
heroku logs --tail | grep -i error
heroku logs --tail | grep -i epayco
```

### Logs Importantes a Monitorear

**Logs de Inicio:**
```
Web server running on port 3000
Mini App available at: https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
Firebase initialized successfully
ePayco credentials validated successfully
```

**Logs de Pagos:**
```
[WEBHOOK] ePayco confirmation received
[WEBHOOK] Payment processed successfully
[WEBHOOK] Membership activated successfully
```

**Errores a Vigilar:**
```
[ERROR] Missing ePayco credentials
[ERROR] Payment link creation failed
[WEBHOOK] Invalid signature
[ERROR] Firestore error
```

### Configurar Alertas

#### Railway:
1. Ve a "Settings" → "Notifications"
2. Configura notificaciones de:
   - Deployment failed
   - Service crashed
   - High CPU usage

#### Heroku:
```bash
# Configurar alertas por email
heroku labs:enable runtime-dyno-metadata
heroku notifications:add -r heroku -a tu-app
```

### Métricas a Monitorear

1. **Uptime** - ¿La app está disponible?
2. **Response Time** - ¿Responde rápido?
3. **Error Rate** - ¿Hay muchos errores?
4. **Memory Usage** - ¿Consume mucha memoria?
5. **Payment Success Rate** - ¿Los pagos se completan?

---

## Mantenimiento

### Actualizaciones de Código

```bash
# 1. Hacer cambios locales
# 2. Probar localmente
npm test
node test-epayco.js

# 3. Commit
git add .
git commit -m "Update: descripción de cambios"

# 4. Push
git push origin main  # Railway auto-deploys
# o
git push heroku main  # Heroku
```

### Actualizar Variables de Entorno

#### Railway:
1. Dashboard → Variables
2. Editar variable
3. Save (redeploy automático)

#### Heroku:
```bash
heroku config:set VARIABLE=nuevo_valor
```

### Actualizar Dependencias

```bash
# Actualizar packages
npm update

# Verificar vulnerabilidades
npm audit
npm audit fix

# Commit y deploy
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Limpiar Logs Antiguos

#### Railway:
Los logs se limpian automáticamente después de 7 días.

#### Heroku:
```bash
# Ver espacio usado
heroku ps

# Los logs se rotan automáticamente
# Para logs persistentes, usa un add-on:
heroku addons:create papertrail
```

### Reiniciar Aplicación

#### Railway:
```bash
railway restart
```

#### Heroku:
```bash
heroku restart
```

---

## Rollback y Recuperación

### Rollback a Versión Anterior

#### Railway:
1. Ve a "Deployments"
2. Encuentra el deployment anterior funcional
3. Haz clic en "Redeploy"

#### Heroku:
```bash
# Ver releases
heroku releases

# Rollback a release anterior
heroku rollback v<número>

# Ejemplo: rollback a v42
heroku rollback v42
```

### Backup de Base de Datos

Firebase Firestore hace backups automáticos, pero puedes exportar:

```bash
# Exportar colección
gcloud firestore export gs://tu-bucket/backup-$(date +%Y%m%d)

# Importar desde backup
gcloud firestore import gs://tu-bucket/backup-20241017
```

### Recuperación de Desastres

1. **Aplicación Caída:**
   ```bash
   # Railway
   railway restart

   # Heroku
   heroku restart
   ```

2. **Base de Datos Corrupta:**
   - Restaurar desde backup de Firestore
   - Verificar reglas de seguridad

3. **Credenciales Comprometidas:**
   - Regenerar credenciales en dashboards
   - Actualizar variables de entorno
   - Redeploy aplicación

4. **Webhook No Funciona:**
   - Verificar URL pública
   - Reconfigurar webhook de Telegram
   - Verificar logs de ePayco

---

## Checklist Final de Producción

Antes de considerar el despliegue completo:

- [ ] App desplegada y corriendo
- [ ] Todas las variables de entorno configuradas
- [ ] Webhook de Telegram funcionando
- [ ] Mini App carga correctamente
- [ ] ePayco configurado en modo producción
- [ ] Webhooks de ePayco funcionando
- [ ] Transacción de prueba completada exitosamente
- [ ] Logs monitoreándose correctamente
- [ ] Alertas configuradas
- [ ] Backup configurado
- [ ] Documentación actualizada
- [ ] Equipo notificado del despliegue

---

## Recursos Adicionales

### Documentación de Plataformas
- **Railway:** https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/
- **Heroku:** https://devcenter.heroku.com/
- **Telegram Bots:** https://core.telegram.org/bots

### Herramientas de Monitoreo
- **Railway Dashboard:** https://railway.app/dashboard
- **Heroku Dashboard:** https://dashboard.heroku.com/
- **Firebase Console:** https://console.firebase.google.com/
- **ePayco Dashboard:** https://dashboard.epayco.co/

### Comandos Útiles

```bash
# Railway
railway login
railway link
railway up
railway logs
railway restart
railway status

# Heroku
heroku login
heroku apps
heroku logs --tail
heroku restart
heroku ps
heroku config
```

---

## Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs detalladamente
2. Verifica todas las variables de entorno
3. Consulta la documentación de la plataforma
4. Revisa `CONFIGURACION_EPAYCO.md` para problemas de pagos
5. Contacta soporte de la plataforma si es necesario

**¡Tu aplicación está lista para producción!** 🚀
