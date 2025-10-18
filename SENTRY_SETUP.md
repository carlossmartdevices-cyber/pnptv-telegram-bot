# Configuración de Sentry para Monitoreo de Errores

Este documento explica cómo configurar y usar Sentry para capturar y monitorear errores en producción en el bot de Telegram.

## ✅ Configuración Completada

Sentry ha sido configurado siguiendo las mejores prácticas de Sentry:

1. **instrument.js** - Inicialización de Sentry al inicio de la aplicación
2. **start-bot.js** - Importa `instrument.js` en la primera línea
3. **src/config/sentry.js** - Funciones auxiliares para tracking de errores
4. **src/bot/index.js** - Usa las funciones de Sentry para manejo de errores del bot

## ¿Qué es Sentry?

Sentry es una plataforma de monitoreo de errores que te permite:
- ✅ Capturar errores en tiempo real
- ✅ Ver stack traces completos de errores
- ✅ Identificar qué usuarios se vieron afectados
- ✅ Rastrear el rendimiento de la aplicación
- ✅ Recibir alertas cuando ocurren errores críticos

## Configuración Inicial

### 1. Crear una cuenta en Sentry

1. Ve a https://sentry.io/
2. Crea una cuenta gratuita (incluye 5,000 errores/mes)
3. Crea un nuevo proyecto seleccionando "Node.js" como plataforma

### 2. Obtener el DSN

1. Una vez creado el proyecto, ve a **Settings → Projects → [Tu Proyecto] → Client Keys (DSN)**
2. Copia el DSN (se ve similar a: `https://xxxxx@xxx.ingest.sentry.io/xxxxx`)
3. **Tu DSN actual**: `https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216`

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Error Tracking & Monitoring
SENTRY_DSN=https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216
SENTRY_ENABLE_IN_DEV=false  # true para habilitar en desarrollo
NODE_ENV=production  # production, development, staging
```

**Variables:**
- `SENTRY_DSN`: Tu DSN de Sentry (obligatorio para activar Sentry)
- `SENTRY_ENABLE_IN_DEV`: `true` para habilitar en desarrollo, `false` por defecto
- `NODE_ENV`: Entorno actual (`production`, `development`, `staging`)

### 4. Configurar en Heroku (Producción)

```bash
heroku config:set SENTRY_DSN=https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216
heroku config:set NODE_ENV=production
```

## Características Implementadas

### 1. Inicialización Temprana (Mejores Prácticas)

**Ubicación:** `instrument.js` (raíz del proyecto)

Siguiendo las mejores prácticas de Sentry, la inicialización ocurre en un archivo separado que se importa ANTES que cualquier otro módulo. Esto garantiza:
- ✅ Captura de errores desde el inicio de la aplicación
- ✅ Instrumentación automática de librerías
- ✅ Monitoreo de rendimiento completo
- ✅ Captura de errores en tiempo de importación

**Importado en:** `start-bot.js` (primera línea)

### 2. Integración en Bot de Telegram

**Ubicación:** `src/bot/index.js`

Sentry captura automáticamente:
- ✅ Errores en handlers de comandos
- ✅ Errores en callbacks de botones
- ✅ Errores en middleware
- ✅ Contexto del usuario (ID, username)
- ✅ Información del comando o acción que causó el error
- ✅ Chat ID y tipo de actualización

### 3. Módulo de Configuración Centralizado

**Ubicación:** `src/config/sentry.js`

Proporciona funciones útiles en todo el código:

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
- `FIREBASE_CREDENTIALS`
- `SENTRY_DSN`
- `DAIMO_API_KEY`

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

## Probar la Configuración

### 1. Verificar que instrument.js carga correctamente

```bash
node -e "require('./instrument.js'); console.log('✓ Sentry cargado correctamente');"
```

Deberías ver:
```
✓ Sentry initialized (environment: production)
✓ Sentry cargado correctamente
```

### 2. Crear archivo de prueba

Crea `test-sentry.js` en la raíz del proyecto:

```javascript
// test-sentry.js
require('./instrument.js');
const { captureException, captureMessage } = require('./src/config/sentry');

console.log('Probando integración con Sentry...\n');

// Test 1: Capturar mensaje
captureMessage('🧪 Mensaje de prueba desde PNPtv Bot', 'info', {
  test: true,
  timestamp: new Date().toISOString()
});
console.log('✓ Mensaje de prueba enviado a Sentry');

// Test 2: Capturar excepción
try {
  throw new Error('🧪 Error de prueba desde PNPtv Bot');
} catch (error) {
  captureException(error, {
    test: true,
    feature: 'sentry-setup',
    timestamp: new Date().toISOString()
  });
  console.log('✓ Error de prueba enviado a Sentry');
}

// Esperar a que Sentry envíe los eventos
setTimeout(() => {
  console.log('\n✓ Prueba completada. Ve a https://sentry.io/ para ver los eventos.');
  process.exit(0);
}, 2000);
```

Ejecuta:
```bash
node test-sentry.js
```

### 3. Verificar en el Dashboard de Sentry

1. Ve a https://sentry.io/
2. Abre tu proyecto
3. Ve a la sección **Issues**
4. Deberías ver:
   - Un error: "🧪 Error de prueba desde PNPtv Bot"
   - Un mensaje: "🧪 Mensaje de prueba desde PNPtv Bot"

### 4. Probar con el Bot

Inicia el bot y fuerza un error (solo para prueba):
```bash
npm start
```

Luego, en otra terminal, puedes ver los logs de Sentry cuando ocurran errores reales.

---

## ✅ Resumen de la Configuración

**Archivos modificados/creados:**
- ✅ `instrument.js` - Inicialización de Sentry (nuevo)
- ✅ `start-bot.js` - Importa instrument.js
- ✅ `src/bot/index.js` - Usa funciones de Sentry
- ✅ `src/config/sentry.js` - Ya existía, sin cambios necesarios
- ✅ `.env.example` - Ya incluye SENTRY_DSN

**Próximos pasos:**
1. ✅ Obtén tu DSN de Sentry.io (o usa el que ya tienes)
2. ✅ Agrégalo a tu `.env` local
3. ✅ Configúralo en Heroku con `heroku config:set`
4. ✅ Ejecuta las pruebas anteriores
5. ✅ Despliega a producción
6. ✅ Monitorea errores en el dashboard de Sentry

**Configuración completada.** Sentry está listo para capturar errores en producción y ayudarte a mantener tu aplicación estable y confiable.
