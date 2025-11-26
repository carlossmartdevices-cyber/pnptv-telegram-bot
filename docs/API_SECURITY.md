# API Security Documentation

## Autenticación y Autorización

Este documento describe la estrategia de seguridad implementada en las rutas de la API, incluyendo autenticación, validación de datos y control de acceso.

## Middleware de Seguridad

### 1. Middleware de Autenticación

#### `authenticateTelegramUser`
Valida datos de Telegram WebApp usando HMAC-SHA256 para prevenir suplantación de identidad.

**Características:**
- Valida hash criptográfico de initData
- Verifica que auth_date no sea mayor a 24 horas
- Previene ataques de clock skew (permite máximo 5 minutos)
- Adjunta `req.telegramUser` con datos validados
- Verifica que userId en params/body coincida con usuario autenticado

**Uso:**
```javascript
app.get("/api/profile/:userId", authenticateTelegramUser, handler);
```

#### `authenticateWithToken`
Autenticación basada en tokens de sesión (access tokens JWT).

**Características:**
- Valida Bearer token en header Authorization
- Verifica tokens contra sesiones activas en Firestore
- Soporta revocación de sesiones
- Adjunta `req.telegramUser` con datos de sesión

**Uso:**
```javascript
app.post("/api/auth/logout", authenticateWithToken, handler);
```

#### `authenticateHybrid`
Autenticación híbrida que intenta token primero y luego Telegram initData.

**Características:**
- Flexible para diferentes clientes
- Prioriza tokens de sesión
- Fallback a Telegram initData

**Uso:**
```javascript
app.get("/api/profile/:userId", authenticateHybrid, handler);
```

#### `requireAdmin`
Middleware que requiere privilegios de administrador.

**Características:**
- Debe usarse DESPUÉS de authenticateTelegramUser
- Verifica userId contra ADMIN_IDS en variables de entorno
- Registra intentos de acceso no autorizado

**Uso:**
```javascript
router.get("/plans", authenticateTelegramUser, requireAdmin, handler);
```

### 2. Middleware de Validación

Todas las rutas implementan validación exhaustiva usando `express-validator`.

#### Validaciones Implementadas:

- **validateUserId**: Valida formato de Telegram user ID (entero positivo)
- **validatePlanId**: Valida ID de plan (alfanumérico, guiones, guiones bajos)
- **validatePostId**: Valida ID de post
- **validateProfileUpdate**: Valida actualización de perfil (bio, ubicación)
- **validatePlanCreate**: Valida creación de plan (todos los campos requeridos)
- **validatePlanUpdate**: Valida actualización de plan (campos opcionales)
- **validatePostCreate**: Valida creación de post (texto, media, ubicación)
- **validatePostUpdate**: Valida actualización de post
- **validatePostDelete**: Valida eliminación de post
- **validateNearbyRequest**: Valida solicitud de usuarios cercanos (lat/lng, radio)
- **validatePaymentCreate**: Valida creación de pago

## Clasificación de Rutas

### 🟢 Rutas Públicas (Sin Autenticación)

Estas rutas son accesibles sin autenticación:

```
GET  /api/config/public          - Configuración pública del cliente
GET  /api/monitoring/health      - Health check para monitoreo
GET  /                            - Página principal de Mini App
GET  /nearby                      - Mini App de usuarios cercanos
```

**Seguridad:** Estas rutas no exponen información sensible y son necesarias para funcionalidad básica.

### 🟡 Rutas Autenticadas (Usuario)

Requieren autenticación de Telegram o token de sesión:

```
# Autenticación
POST /api/auth/telegram-login     - Login con Telegram Widget
POST /api/auth/refresh            - Refrescar access token
POST /api/auth/logout             - Cerrar sesión (token)
POST /api/auth/logout-all         - Cerrar todas las sesiones (token)

# Perfil
GET  /api/profile/:userId         - Obtener perfil (auth + validation)
PUT  /api/profile/:userId         - Actualizar perfil (auth + validation)

# Mapa
POST /api/map/nearby              - Usuarios cercanos (auth + validation)

# Planes
GET  /api/plans                   - Listar planes activos

# Pagos
POST /api/payment/create          - Crear link de pago (auth + validation)

# Posts
POST   /api/posts                 - Crear post (auth + validation)
GET    /api/posts/feed            - Feed de posts
GET    /api/posts/user/:userId    - Posts de usuario
GET    /api/posts/nearby          - Posts cercanos (validation)
GET    /api/posts/:postId         - Obtener post (validation)
PUT    /api/posts/:postId         - Actualizar post (auth + validation)
DELETE /api/posts/:postId         - Eliminar post (auth + validation)
POST   /api/posts/:postId/like    - Like a post
GET    /api/posts/user/:userId/stats - Estadísticas de posts

# Streaming (placeholder)
GET  /api/live/streams            - Listar streams en vivo
```

**Seguridad:**
- Validación de identity mediante Telegram initData o session token
- Verificación que userId en request coincide con usuario autenticado
- Sanitización de inputs para prevenir XSS/injection
- Rate limiting implícito vía Telegram

### 🔴 Rutas de Administrador

Requieren autenticación + privilegios de administrador:

```
# Admin - Gestión de Planes
GET    /api/admin/plans            - Todos los planes (auth + admin)
GET    /api/admin/plans/stats      - Estadísticas de planes (auth + admin)
GET    /api/admin/plans/:id        - Plan específico (auth + admin + validation)
POST   /api/admin/plans            - Crear plan (auth + admin + validation)
PUT    /api/admin/plans/:id        - Actualizar plan (auth + admin + validation)
DELETE /api/admin/plans/:id        - Eliminar plan (auth + admin + validation)
POST   /api/admin/plans/:id/activate - Reactivar plan (auth + admin + validation)

# Monitoring
GET  /api/monitoring/status           - Estado del sistema (auth + admin)
GET  /api/monitoring/sessions/stats   - Estadísticas de sesiones (auth + admin)
POST /api/monitoring/sessions/cleanup - Limpieza de sesiones (auth + admin)
GET  /api/monitoring/security/webhook-audit - Audit log (auth + admin)
GET  /api/monitoring/rate-limiting/stats - Stats rate limit (auth + admin)
GET  /api/monitoring/alerts           - Alertas del sistema (auth + admin)
```

**Seguridad:**
- Doble capa: autenticación + verificación de admin
- ADMIN_IDS configurado en variables de entorno
- Logging de todas las acciones administrativas
- Validación estricta de inputs

### 🟣 Webhooks (Autenticación Especial)

```
POST /epayco/confirmation         - Webhook de confirmación de pago
POST /epayco/response             - Respuesta de pago
```

**Seguridad:**
- Validación de signature de ePayco
- Rate limiting específico para webhooks
- Registro de auditoría de todas las solicitudes
- Validación de IPs permitidas (recomendado configurar)

## Validación de Datos

### Estrategia de Validación

Todas las rutas implementan validación en múltiples capas:

1. **Validación de Tipo**: express-validator verifica tipos de datos
2. **Sanitización**: Limpieza de HTML/scripts maliciosos
3. **Rangos**: Validación de rangos numéricos (lat/lng, precios, etc.)
4. **Formatos**: Regex para IDs, usernames, etc.
5. **Longitudes**: Límites de caracteres para prevenir DoS

### Ejemplos de Validación

#### User ID
```javascript
validateUserId: [
  param('userId')
    .trim()
    .matches(/^\d+$/)
    .isLength({ min: 1, max: 20 })
]
```

#### Ubicación
```javascript
body('location.latitude')
  .isFloat({ min: -90, max: 90 })

body('location.longitude')
  .isFloat({ min: -180, max: 180 })
```

#### Bio de Perfil
```javascript
body('bio')
  .optional()
  .trim()
  .isLength({ max: 500 })
  .customSanitizer(value => value.replace(/<[^>]*>/g, ''))
```

## Prevención de Vulnerabilidades

### ✅ Implementado

1. **Prevención de User ID Spoofing**
   - Validación criptográfica de Telegram initData
   - Verificación que userId en request = userId autenticado

2. **Prevención de XSS (Cross-Site Scripting)**
   - Sanitización de todos los inputs de texto
   - Remoción de tags HTML en campos de texto libre
   - Validación de tipos de datos

3. **Prevención de SQL/NoSQL Injection**
   - Validación estricta de tipos
   - No se construyen queries dinámicas sin validación
   - Uso de métodos seguros de Firestore

4. **Rate Limiting**
   - Webhook rate limiting implementado
   - Límites de tamaño de payload (100MB para uploads)
   - Límites de cantidad de items en arrays

5. **Session Management**
   - Tokens JWT con expiración
   - Refresh tokens rotatorios
   - Revocación de sesiones
   - Limpieza automática de sesiones expiradas

6. **CORS Configurado**
   - Headers CORS apropiados
   - Manejo de preflight OPTIONS

### ⚠️ Recomendaciones Adicionales

1. **Rate Limiting Global**
   - Implementar rate limiting por IP para todas las rutas
   - Usar librerías como `express-rate-limit`

2. **Helmet.js**
   - Agregar headers de seguridad HTTP
   - Prevención de clickjacking, MIME sniffing, etc.

3. **Validación de IPs para Webhooks**
   - Restringir webhooks de ePayco a IPs conocidas

4. **HTTPS Only**
   - Forzar HTTPS en producción
   - HSTS headers

5. **Input Size Limits**
   - Límites más estrictos en tamaños de archivos según tipo
   - Validación de dimensiones de imágenes

## Variables de Entorno Críticas

Estas variables deben estar configuradas para seguridad completa:

```bash
# Autenticación
TELEGRAM_TOKEN=              # Token del bot de Telegram
TELEGRAM_BOT_TOKEN=          # Alias del token

# Administradores (IDs separados por comas)
ADMIN_IDS=123456789,987654321

# Sesiones
SESSION_SECRET=              # Secret para firmar tokens JWT
ACCESS_TOKEN_EXPIRY=15m      # Expiración de access tokens
REFRESH_TOKEN_EXPIRY=7d      # Expiración de refresh tokens

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# ePayco
EPAYCO_PUBLIC_KEY=
EPAYCO_PRIVATE_KEY=
EPAYCO_P_CUST_ID=
EPAYCO_P_KEY=
```

## Testing de Seguridad

### Tests Recomendados

1. **Test de Autenticación**
   - Intentar acceder rutas protegidas sin auth
   - Intentar con tokens expirados
   - Intentar con initData inválido o manipulado

2. **Test de Validación**
   - Enviar datos con tipos incorrectos
   - Enviar datos fuera de rangos permitidos
   - Intentar XSS en campos de texto
   - Enviar arrays/objetos excesivamente grandes

3. **Test de Autorización**
   - Usuario no-admin intentando rutas de admin
   - Usuario intentando acceder datos de otro usuario

4. **Test de Rate Limiting**
   - Flood de requests a webhooks
   - Verificar límites de payload

## Monitoreo y Logging

### Eventos Registrados

- ✅ Autenticación exitosa/fallida
- ✅ Intentos de acceso no autorizado a rutas de admin
- ✅ Errores de validación (con detalles sanitizados)
- ✅ Acciones administrativas (crear/modificar/eliminar planes)
- ✅ Webhooks recibidos (para auditoría de pagos)

### Alertas Configuradas

El endpoint `/api/monitoring/alerts` detecta:
- Uso excesivo de memoria (>75% warning, >90% critical)
- Sesiones expiradas acumuladas (>500)
- Variables de entorno críticas faltantes

## Conclusión

La API implementa seguridad en profundidad con:
- ✅ Autenticación robusta (Telegram + JWT)
- ✅ Validación exhaustiva de inputs
- ✅ Control de acceso basado en roles
- ✅ Sanitización contra XSS
- ✅ Logging y auditoría
- ✅ Session management seguro

Todas las rutas sensibles están protegidas y validadas. La superficie de ataque ha sido minimizada significativamente.
