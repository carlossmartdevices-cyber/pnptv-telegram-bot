# 🧪 Guía de Testing - Backend de Autenticación

## 📋 Prerequisitos

Antes de probar, asegúrate de tener:

1. ✅ Variables de entorno configuradas en `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=tu_token_aqui
   JWT_SECRET=tu_secret_de_64_caracteres_aqui
   FIREBASE_PROJECT_ID=pnptv-b8af8
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY=...
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=TU_BOT_USERNAME
   ```

2. ✅ Dependencias instaladas:
   ```bash
   cd src/webapp
   npm install
   ```

3. ✅ Usuario registrado en el bot de Telegram:
   - Abre tu bot en Telegram
   - Envía `/start`
   - Completa el onboarding

---

## 🚀 Ejecutar la WebApp

```bash
# Desde src/webapp
npm run dev

# O desde la raíz
npm run dev:webapp
```

La app estará en: **http://localhost:3001**

---

## 🧪 Test 1: Landing Page

### Objetivo
Verificar que la landing page carga correctamente.

### Pasos
1. Abre http://localhost:3001
2. Verifica que ves:
   - Logo 💎 PNPtv
   - Título "Connect, Share, and Discover"
   - Botones "Start Exploring" y "Open in Telegram"
   - 6 feature cards
   - Footer con links

### Resultado Esperado
✅ Página visible sin errores
✅ Estilos de Tailwind aplicados correctamente
✅ Botones funcionan (redirigen)

---

## 🧪 Test 2: Página de Login

### Objetivo
Verificar que la página de login carga el widget de Telegram.

### Pasos
1. Abre http://localhost:3001/login
2. Verifica que ves:
   - Logo de PNPtv
   - "Sign in with Telegram" title
   - Widget de Telegram (botón azul con logo)
   - 3 benefit cards

### Resultado Esperado
✅ Página visible sin errores
✅ Widget de Telegram cargado
✅ Botón azul "Log in with Telegram" visible

### Debugging
Abre DevTools (F12) → Console

**Si el widget no carga:**
```javascript
// Verifica que el script se cargó
document.querySelector('script[src*="telegram-widget"]')

// Verifica la variable de entorno
console.log(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)
```

---

## 🧪 Test 3: Autenticación con Telegram

### Objetivo
Probar el flujo completo de autenticación.

### Pasos

#### 1. Preparación
- Asegúrate de tener Telegram Desktop o Web abierto
- Asegúrate de estar logueado en Telegram
- Asegúrate de haber iniciado el bot (`/start`)

#### 2. Iniciar Login
1. Ve a http://localhost:3001/login
2. Click en el botón "Log in with Telegram"
3. Se abrirá una ventana popup de Telegram

#### 3. Autorizar
1. En el popup, verifica que dice el nombre correcto del bot
2. Click en "Accept" / "Aceptar"
3. El popup se cerrará automáticamente

#### 4. Verificar Autenticación
Abre DevTools → Console y busca:

```javascript
// Deberías ver:
Telegram auth successful: { id: 123456, first_name: "...", ... }
Authenticating with Telegram...
Authentication successful!
```

#### 5. Verificar Redirección
- La página debería redirigir a `/feed`
- Por ahora dará error 404 (normal, aún no existe)

### Resultado Esperado
✅ Popup de Telegram se abre
✅ Autorización exitosa
✅ Console muestra "Authentication successful!"
✅ Token guardado en localStorage
✅ Intenta redirigir a /feed

### Debugging

**Error: "User not found"**
- El usuario no ha iniciado el bot
- Solución: Abre Telegram → busca tu bot → `/start`

**Error: "Invalid authentication hash"**
- `TELEGRAM_BOT_TOKEN` incorrecto en `.env`
- Verifica que sea el token correcto

**Error: "Server configuration error"**
- `TELEGRAM_BOT_TOKEN` no está configurado
- Revisa tu archivo `.env`

---

## 🧪 Test 4: Verificar Token en localStorage

### Objetivo
Verificar que el token JWT se guardó correctamente.

### Pasos

1. Después de autenticarte exitosamente
2. Abre DevTools → Application → Local Storage → http://localhost:3001
3. Busca la key `authToken`

### Resultado Esperado
```javascript
authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
user: "{\"userId\":\"123456\",\"displayName\":\"...\", ...}"
```

### Verificar contenido del token

```javascript
// En la consola
const token = localStorage.getItem('authToken')
const decoded = JSON.parse(atob(token.split('.')[1]))
console.log(decoded)

// Deberías ver:
{
  userId: "123456",
  telegramId: 123456,
  username: "tu_username",
  iat: 1234567890,
  exp: 1234567890
}
```

---

## 🧪 Test 5: API Endpoint `/api/auth/me`

### Objetivo
Probar que el endpoint de obtener usuario funciona.

### Pasos

#### Opción 1: Usando curl (terminal)

```bash
# Obtener el token de localStorage primero
# Luego ejecutar:

curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### Opción 2: Usando DevTools Console

```javascript
const token = localStorage.getItem('authToken')

fetch('http://localhost:3001/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log(data))
```

### Resultado Esperado

```json
{
  "success": true,
  "user": {
    "userId": "123456",
    "telegramId": 123456,
    "username": "tu_username",
    "displayName": "Tu Nombre",
    "photoUrl": "https://...",
    "bio": "...",
    "membership": { "tier": "free" },
    "socialStats": { "posts": 0, "followers": 0, "following": 0 },
    ...
  }
}
```

### Debugging

**Error 401: "No authentication token"**
- No enviaste el header `Authorization`
- Verifica que el formato sea: `Bearer <token>`

**Error 401: "Invalid or expired token"**
- El token expiró (default: 7 días)
- El `JWT_SECRET` cambió
- El token fue manipulado

**Error 404: "User not found"**
- El usuario fue eliminado de Firestore
- El userId en el token no coincide con Firestore

---

## 🧪 Test 6: Firestore Actualización

### Objetivo
Verificar que `lastActive` y `lastLoginWeb` se actualizan.

### Pasos

1. Autentica con Telegram
2. Ve a Firebase Console → Firestore
3. Abre la colección `users` → tu documento (userId)
4. Verifica los campos:
   - `lastActive`: debe tener timestamp reciente
   - `lastLoginWeb`: debe tener timestamp reciente

### Resultado Esperado
✅ `lastActive` actualizado al timestamp de login
✅ `lastLoginWeb` creado/actualizado

---

## 🧪 Test 7: Expiración de Token

### Objetivo
Verificar que tokens expirados son rechazados.

### Pasos

#### Modificar expiración (temporal)

Edita `src/webapp/lib/jwt.ts`:

```typescript
// Cambiar de '7d' a '5s' temporalmente
const JWT_EXPIRES_IN = '5s' // 5 segundos
```

#### Probar

1. Autentica con Telegram
2. Espera 10 segundos
3. Intenta llamar `/api/auth/me`:

```javascript
const token = localStorage.getItem('authToken')

fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => console.log(data))
```

### Resultado Esperado

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Recuerda:** Volver a cambiar `JWT_EXPIRES_IN = '7d'` después del test.

---

## 🧪 Test 8: Validación de Hash Telegram

### Objetivo
Verificar que datos manipulados son rechazados.

### Pasos

```javascript
// En DevTools Console, envía datos manipulados
fetch('http://localhost:3001/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 123456,
    first_name: "Hacker",
    username: "hacker",
    auth_date: Math.floor(Date.now() / 1000),
    hash: "invalid_hash_12345"
  })
})
  .then(res => res.json())
  .then(data => console.log(data))
```

### Resultado Esperado

```json
{
  "success": false,
  "error": "Invalid authentication hash. Data may have been tampered with."
}
```

---

## 📊 Resumen de Tests

| Test | Estado | Descripción |
|------|--------|-------------|
| 1. Landing Page | ⬜ | Página principal carga |
| 2. Login Page | ⬜ | Widget de Telegram visible |
| 3. Autenticación | ⬜ | Login completo funciona |
| 4. LocalStorage | ⬜ | Token guardado correctamente |
| 5. API /me | ⬜ | Obtener usuario funciona |
| 6. Firestore Update | ⬜ | lastActive actualizado |
| 7. Token Expiration | ⬜ | Tokens expirados rechazados |
| 8. Hash Validation | ⬜ | Datos manipulados rechazados |

---

## 🐛 Problemas Comunes

### Error: "Cannot find module 'jsonwebtoken'"

```bash
cd src/webapp
npm install jsonwebtoken @types/jsonwebtoken
```

### Error: Firebase initialization failed

Verifica que estas variables estén en tu `.env`:
```env
FIREBASE_PROJECT_ID=pnptv-b8af8
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Error: CORS

Si llamas desde otro dominio, necesitas configurar CORS.
Por ahora, los endpoints ya tienen headers CORS básicos.

### Token no persiste entre recargas

Es normal en desarrollo. El token está en localStorage y debe persistir.
Si no persiste, verifica:
1. No estés en modo incógnito
2. LocalStorage no esté deshabilitado
3. No haya errores de JavaScript

---

## ✅ Checklist Final

Antes de continuar al siguiente paso, verifica:

- [ ] Landing page carga sin errores
- [ ] Login page muestra widget de Telegram
- [ ] Login con Telegram funciona
- [ ] Token se guarda en localStorage
- [ ] `/api/auth/me` retorna datos del usuario
- [ ] `lastActive` se actualiza en Firestore
- [ ] Tokens expirados son rechazados
- [ ] Hash de Telegram se valida correctamente

---

**Si todos los tests pasan, la autenticación está funcionando correctamente! ✅**

Próximo paso: Implementar el Feed y Posts.
