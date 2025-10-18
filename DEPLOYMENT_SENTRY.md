# Despliegue con Sentry - Guía Paso a Paso

Esta guía te ayudará a desplegar tu bot con Sentry error tracking habilitado en Heroku.

## ✅ Estado Actual

**Configuración Local:**
- ✅ instrument.js creado
- ✅ start-bot.js actualizado
- ✅ src/bot/index.js actualizado
- ✅ Prueba local exitosa

**Configuración en Heroku:**
- ✅ App: `pnptv-telegram-bot`
- ✅ URL: https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
- ✅ SENTRY_DSN configurado
- ✅ NODE_ENV=production configurado

## Paso 1: Commit de los Cambios

Primero, vamos a hacer commit de los cambios de Sentry:

```bash
# Agregar los archivos nuevos de Sentry
git add instrument.js
git add start-bot.js
git add src/bot/index.js
git add .gitignore
git add SENTRY_SETUP.md

# Verificar los cambios
git status

# Crear commit
git commit -m "Add Sentry error tracking with best practices

- Create instrument.js for early Sentry initialization
- Update start-bot.js to import instrument.js first
- Remove duplicate Sentry init from src/bot/index.js
- Add comprehensive documentation in SENTRY_SETUP.md
- Filter sensitive data (tokens, keys, credentials)
- Ignore expected errors (Telegram API, network)
- Add test file for verification

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Paso 2: Desplegar a Heroku

### Opción A: Deploy Simple (Recomendado)

```bash
git push heroku main
```

### Opción B: Deploy desde otra rama

Si estás en una rama diferente:

```bash
git push heroku tu-rama:main
```

## Paso 3: Verificar el Despliegue

### 3.1 Ver los logs en tiempo real

```bash
heroku logs --tail --app pnptv-telegram-bot
```

**Busca esta línea en los logs:**
```
✓ Sentry initialized (environment: production)
```

Si ves esta línea, ¡Sentry está funcionando correctamente! 🎉

### 3.2 Verificar que el bot inició

En los logs deberías ver:
```
Bot started successfully
PNPtv Bot is running!
```

### 3.3 Verificar variables de entorno

```bash
heroku config:get SENTRY_DSN --app pnptv-telegram-bot
heroku config:get NODE_ENV --app pnptv-telegram-bot
```

Ambos deberían mostrar valores configurados.

## Paso 4: Probar Error Tracking en Producción

### Método 1: Usar el bot y ver errores naturales

1. Abre Telegram y busca tu bot: @PNPtvbot
2. Envía comandos para probar
3. Ve a https://sentry.io/ → Issues
4. Deberías ver cualquier error que ocurra en tiempo real

### Método 2: Forzar un error de prueba (opcional)

**NOTA:** Solo hacer esto en un momento de bajo tráfico o en un bot de prueba.

Puedes crear un comando de prueba temporal:

```javascript
// En src/bot/index.js (solo para prueba)
bot.command('test_sentry', adminMiddleware(), async (ctx) => {
  const { captureException } = require('../config/sentry');
  try {
    throw new Error('🧪 Test error from production');
  } catch (error) {
    captureException(error, {
      userId: ctx.from.id,
      test: true
    });
    await ctx.reply('Error test sent to Sentry!');
  }
});
```

Luego:
1. Deploy el cambio
2. Envía `/test_sentry` al bot
3. Ve a Sentry para ver el error
4. Remueve el comando de prueba

## Paso 5: Configurar Alertas en Sentry

1. Ve a https://sentry.io/
2. Selecciona tu proyecto "pnptv-telegram-bot"
3. Ve a **Settings** → **Alerts**
4. Crea una nueva alerta:

### Alerta de Nuevos Errores

```
Condición: A new issue is created
Acciones:
  - Send a notification via email
  - (Opcional) Send to Slack/Discord
```

### Alerta de Alto Volumen

```
Condición: The issue is seen more than 10 times in 1 hour
Acciones:
  - Send a notification via email
```

### Alerta de Errores Críticos

```
Condición: An event's level is equal to fatal or error
Filtro: Add filter "environment" equals "production"
Acciones:
  - Send a notification immediately
```

## Paso 6: Monitoreo Continuo

### Dashboard de Sentry

Revisa regularmente:
- **Issues**: Errores capturados
- **Performance**: Métricas de rendimiento
- **Releases**: Historial de deploys (si configuras releases)

### Comandos Útiles de Heroku

```bash
# Ver logs en tiempo real
heroku logs --tail --app pnptv-telegram-bot

# Ver solo logs de errores
heroku logs --tail --app pnptv-telegram-bot | grep -i error

# Ver información de la app
heroku apps:info --app pnptv-telegram-bot

# Reiniciar la app (si es necesario)
heroku restart --app pnptv-telegram-bot

# Ver uso de dynos
heroku ps --app pnptv-telegram-bot
```

## Solución de Problemas

### Problema: No veo "Sentry initialized" en los logs

**Solución:**
1. Verifica que SENTRY_DSN esté configurado:
   ```bash
   heroku config:get SENTRY_DSN --app pnptv-telegram-bot
   ```
2. Si está vacío, configúralo:
   ```bash
   heroku config:set SENTRY_DSN=https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216 --app pnptv-telegram-bot
   ```
3. Reinicia la app:
   ```bash
   heroku restart --app pnptv-telegram-bot
   ```

### Problema: Los errores no aparecen en Sentry

**Posibles causas:**

1. **El error está en la lista de ignorados**
   - Revisa `instrument.js` → `ignoreErrors`
   - Errores de Telegram API esperados se ignoran automáticamente

2. **Quota de Sentry excedida**
   - Ve a Sentry → Settings → Subscription
   - Verifica que no hayas alcanzado el límite mensual

3. **Error de red desde Heroku**
   - Poco probable, pero verifica los logs de Heroku
   - Busca errores relacionados con Sentry

### Problema: Deploy falla

**Solución:**

1. Verifica que el commit no tenga errores de sintaxis:
   ```bash
   node -c instrument.js
   node -c start-bot.js
   ```

2. Verifica que todas las dependencias estén en package.json:
   ```bash
   npm list @sentry/node
   ```

3. Revisa los logs de build de Heroku:
   ```bash
   heroku logs --tail --app pnptv-telegram-bot
   ```

## Verificación Final

Checklist después del deploy:

- [ ] Bot está corriendo (envía /start en Telegram)
- [ ] Sentry initialized aparece en logs de Heroku
- [ ] Dashboard de Sentry muestra el proyecto activo
- [ ] Alertas configuradas en Sentry
- [ ] Test de error enviado y visible en Sentry (opcional)

## Comandos Rápidos de Referencia

```bash
# Deploy
git push heroku main

# Ver logs
heroku logs --tail --app pnptv-telegram-bot

# Verificar variables
heroku config --app pnptv-telegram-bot

# Reiniciar
heroku restart --app pnptv-telegram-bot

# Abrir dashboard
heroku open --app pnptv-telegram-bot

# Abrir Sentry
open https://sentry.io/
```

## Próximos Pasos

1. **Configurar Releases en Sentry** (opcional):
   - Asocia cada deploy con una versión
   - Ve qué versión introdujo cada error
   - [Guía de Releases](https://docs.sentry.io/product/releases/)

2. **Configurar Source Maps** (si usas TypeScript):
   - Permite ver código original en stack traces
   - [Guía de Source Maps](https://docs.sentry.io/platforms/node/sourcemaps/)

3. **Integrar con Slack/Discord**:
   - Recibe notificaciones de errores en tiempo real
   - [Guía de Integraciones](https://docs.sentry.io/product/integrations/)

---

**¡Tu bot ahora tiene monitoreo profesional de errores!** 🎉

Cualquier error que ocurra en producción será capturado automáticamente en Sentry con:
- Stack trace completo
- Contexto del usuario
- Información del comando
- Variables de entorno (sin datos sensibles)
- Breadcrumbs de eventos previos

Puedes dormir tranquilo sabiendo que serás alertado de cualquier problema. 😊
