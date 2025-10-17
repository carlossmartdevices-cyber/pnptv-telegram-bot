# Configuración de Sentry para Monitoreo de Errores

Este documento explica cómo configurar y usar Sentry para capturar y monitorear errores en producción en el bot de Telegram y la aplicación web.

## ¿Qué es Sentry?

Sentry es una plataforma de monitoreo de errores que te permite:
- Capturar errores en tiempo real
- Ver stack traces completos de errores
- Identificar qué usuarios se vieron afectados
- Rastrear el rendimiento de la aplicación
- Recibir alertas cuando ocurren errores críticos

## Configuración Inicial

### 1. Crear una cuenta en Sentry

1. Ve a https://sentry.io/
2. Crea una cuenta gratuita (incluye 5,000 errores/mes)
3. Crea un nuevo proyecto seleccionando "Node.js" como plataforma

### 2. Obtener el DSN

1. Una vez creado el proyecto, ve a **Settings → Projects → [Tu Proyecto] → Client Keys (DSN)**
2. Copia el DSN (se ve similar a: `https://xxxxx@xxx.ingest.sentry.io/xxxxx`)

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Error Tracking & Monitoring
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENABLE_IN_DEV=false
NODE_ENV=production
```

**Variables:**
- `SENTRY_DSN`: Tu DSN de Sentry (obligatorio para activar Sentry)
- `SENTRY_ENABLE_IN_DEV`: `true` para habilitar en desarrollo, `false` por defecto
- `NODE_ENV`: Entorno actual (`production`, `development`, `staging`)

### 4. Configurar en Heroku (Producción)

```bash
heroku config:set SENTRY_DSN=your_sentry_dsn_here
heroku config:set NODE_ENV=production
```

## Características Implementadas

### 1. Integración en Web Server (Express)

**Ubicación:** `src/web/server.js`

Sentry se integra automáticamente con:
- Request handler (captura información de cada solicitud HTTP)
- Tracing handler (monitoreo de rendimiento)
- Error handler (captura errores no manejados en Express)

**Características:**
- Filtrado automático de datos sensibles (tokens, contraseñas, API keys)
- Captura de contexto de solicitudes HTTP
- Monitoreo de rendimiento con sample rate del 10% en producción

### 2. Integración en Bot de Telegram

**Ubicación:** `src/bot/index.js`

Sentry captura:
- Errores en handlers de comandos
- Errores en callbacks de botones
- Contexto del usuario (ID, username)
- Información del comando o acción que causó el error

### 3. Módulo de Configuración Centralizado

**Ubicación:** `src/config/sentry.js`

Proporciona funciones útiles:

```javascript
const { captureException, captureMessage, setUser, addBreadcrumb } = require("../config/sentry");

// Capturar error manualmente
try {
  // código que puede fallar
} catch (error) {
  captureException(error, {
    context: "payment-processing",
    userId: "123456"
  });
}

// Registrar mensaje informativo
captureMessage("Payment processed successfully", "info", {
  amount: 50000,
  userId: "123456"
});

// Establecer contexto de usuario
setUser({
  id: userId,
  username: "usuario123"
});

// Agregar breadcrumb para debugging
addBreadcrumb({
  category: "payment",
  message: "User selected plan Premium",
  level: "info"
});
```

## Seguridad y Privacidad

### Datos Sensibles Filtrados Automáticamente

El sistema está configurado para NO enviar a Sentry:

**Headers HTTP:**
- `authorization`
- `cookie`
- `x-telegram-init-data`

**Variables de Entorno:**
- `TELEGRAM_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `EPAYCO_PRIVATE_KEY`
- `EPAYCO_P_KEY`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_DSN`

### Errores Ignorados

Algunos errores esperados se ignoran automáticamente:
- Errores de Telegram API (mensajes bloqueados, usuarios que bloquean el bot)
- Errores de red temporales (ECONNRESET, ETIMEDOUT, ENOTFOUND)
- Mensajes no modificados (400: message is not modified)

## Uso en Producción

### Monitorear Errores

1. Ve al dashboard de Sentry: https://sentry.io/
2. Selecciona tu proyecto
3. Ve a la sección "Issues" para ver todos los errores capturados

### Información Capturada

Para cada error, Sentry muestra:
- **Stack trace completo** con líneas de código
- **Información del usuario** (ID, username)
- **Contexto de la solicitud** (URL, método HTTP, parámetros)
- **Breadcrumbs** (historial de eventos que llevaron al error)
- **Variables de entorno** (sin datos sensibles)
- **Dispositivo y plataforma** del usuario

### Configurar Alertas

1. En Sentry, ve a **Settings → Alerts**
2. Crea reglas de alerta para:
   - Errores nuevos detectados
   - Picos en tasa de errores
   - Errores en rutas críticas

3. Configura notificaciones por:
   - Email
   - Slack
   - Discord
   - Webhooks personalizados

## Mejores Prácticas

### 1. Usar Contexto Rico

```javascript
captureException(error, {
  feature: "payment",
  planType: "premium",
  userId: userId,
  amount: paymentAmount
});
```

### 2. Agregar Breadcrumbs

```javascript
addBreadcrumb({
  category: "auth",
  message: "User login attempt",
  level: "info"
});

// ... código que puede fallar ...
```

### 3. Establecer Información del Usuario

```javascript
setUser({
  id: userId,
  username: username,
  tier: "premium"
});
```

### 4. Capturar Mensajes Importantes

```javascript
// No solo errores, también eventos importantes
captureMessage("High value transaction completed", "warning", {
  amount: 500000,
  userId: userId,
  planId: planId
});
```

## Solución de Problemas

### Sentry No Captura Errores

**Verifica que:**
1. `SENTRY_DSN` esté configurado correctamente
2. El DSN sea válido (cópialo de Sentry.io)
3. `NODE_ENV` esté configurado
4. El error no esté en la lista de errores ignorados

### Demasiados Errores Capturados

**Solución:**
1. Ajusta `tracesSampleRate` en `src/config/sentry.js`
2. Agrega más patrones a `ignoreErrors`
3. Aumenta tu plan de Sentry si es necesario

### Datos Sensibles en Sentry

**Solución:**
1. Actualiza `beforeSend` en `src/config/sentry.js`
2. Agrega más campos a la lista de filtrado
3. Revisa que no se estén logueando datos sensibles

## Recursos Adicionales

- [Documentación oficial de Sentry](https://docs.sentry.io/)
- [Sentry para Node.js](https://docs.sentry.io/platforms/node/)
- [Mejores prácticas de Sentry](https://docs.sentry.io/product/best-practices/)
- [Dashboard de Sentry](https://sentry.io/)

## Ejemplo de Uso Completo

```javascript
const { captureException, setUser, addBreadcrumb } = require("../config/sentry");

async function processPayment(userId, planId, amount) {
  try {
    // Establecer contexto de usuario
    setUser({ id: userId });

    // Agregar breadcrumb
    addBreadcrumb({
      category: "payment",
      message: `Starting payment for plan ${planId}`,
      level: "info"
    });

    // Código del procesamiento de pago
    const result = await epayco.createPaymentLink({
      userId,
      planId,
      amount
    });

    // Breadcrumb de éxito
    addBreadcrumb({
      category: "payment",
      message: "Payment link created successfully",
      level: "info"
    });

    return result;

  } catch (error) {
    // Capturar error con contexto rico
    captureException(error, {
      feature: "payment",
      userId,
      planId,
      amount,
      errorType: error.constructor.name
    });

    throw error; // Re-lanzar para manejo adicional
  }
}
```

## Monitoreo de Rendimiento

Sentry también captura métricas de rendimiento:
- Tiempo de respuesta de endpoints
- Consultas a base de datos lentas
- Operaciones que toman mucho tiempo

Para ver métricas de rendimiento:
1. Ve a **Performance** en el dashboard de Sentry
2. Identifica endpoints lentos
3. Optimiza basándote en los datos recolectados

---

**Configuración completada.** Sentry está listo para capturar errores en producción y ayudarte a mantener tu aplicación estable y confiable.
