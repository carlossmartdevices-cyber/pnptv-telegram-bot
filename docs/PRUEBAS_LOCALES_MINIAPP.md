# Guía Completa de Pruebas Locales del Mini App

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración del Entorno Local](#configuración-del-entorno-local)
3. [Iniciar el Servidor Local](#iniciar-el-servidor-local)
4. [Probar el Mini App en Telegram](#probar-el-mini-app-en-telegram)
5. [Probar Funcionalidades](#probar-funcionalidades)
6. [Debugging y Herramientas](#debugging-y-herramientas)
7. [Solución de Problemas](#solución-de-problemas)
8. [Testing Avanzado](#testing-avanzado)

---

## Requisitos Previos

### Software Necesario

Asegúrate de tener instalado:

- ✅ **Node.js** v16 o superior
  ```bash
  node --version
  # Esperado: v16.x.x o superior
  ```

- ✅ **npm** v7 o superior
  ```bash
  npm --version
  # Esperado: 7.x.x o superior
  ```

- ✅ **Git** (para control de versiones)
  ```bash
  git --version
  ```

- ✅ **Navegador Web Moderno**
  - Chrome, Firefox, Edge, o Safari
  - Con herramientas de desarrollador

- ✅ **Telegram** (App de escritorio o móvil)
  - Descarga desde: https://telegram.org/

### Cuentas Necesarias

- ✅ Cuenta de Firebase con proyecto configurado
- ✅ Bot de Telegram creado (con @BotFather)
- ✅ Cuenta de ePayco (ambiente de pruebas)

---

## Configuración del Entorno Local

### Paso 1: Clonar/Descargar el Proyecto

Si aún no tienes el proyecto localmente:

```bash
# Clonar desde Git
git clone https://github.com/tu-usuario/Bots.git
cd Bots

# O si ya lo tienes, asegúrate de tener la última versión
git pull origin main
```

### Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias
npm install

# Verificar instalación
npm list --depth=0
```

### Paso 3: Configurar Variables de Entorno

Crea o edita el archivo `.env` en la raíz del proyecto:

```bash
# Windows PowerShell
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# ============================================
# Bot de Telegram
# ============================================
TELEGRAM_TOKEN=tu_token_del_bot
TELEGRAM_BOT_TOKEN=tu_token_del_bot
CHANNEL_ID=tu_canal_id_opcional
ADMIN_IDS=tu_telegram_user_id

# ============================================
# Firebase
# ============================================
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"tu-proyecto",...}

# ============================================
# ePayco (MODO DE PRUEBA)
# ============================================
EPAYCO_PUBLIC_KEY=tu_public_key_pruebas
EPAYCO_PRIVATE_KEY=tu_private_key_pruebas
EPAYCO_P_CUST_ID=tu_customer_id_pruebas
EPAYCO_P_KEY=tu_p_key_pruebas
EPAYCO_TEST_MODE=true  # ← IMPORTANTE: Dejar en true para pruebas
EPAYCO_STRICT_SIGNATURE_MODE=false  # Opcional: false para desarrollo

# ============================================
# URLs Locales
# ============================================
BOT_URL=http://localhost:3000
WEB_APP_URL=http://localhost:3000
WEBAPP_URL=http://localhost:3000
PORT=3000
WEB_PORT=3000

# URLs de Webhook (para pruebas locales)
EPAYCO_RESPONSE_URL=http://localhost:3000/epayco/response
EPAYCO_CONFIRMATION_URL=http://localhost:3000/epayco/confirmation
```

### Paso 4: Verificar Configuración

```bash
# Ejecutar tests de configuración
node test-epayco.js

# Debería mostrar:
# ✓ All tests passed!
```

---

## Iniciar el Servidor Local

### Método 1: Usando npm start

```bash
# Iniciar servidor
npm start

# Deberías ver:
# Web server running on port 3000
# Mini App available at: http://localhost:3000
```

### Método 2: Modo de Desarrollo (con auto-reload)

Si tienes `nodemon` instalado:

```bash
# Instalar nodemon (si no lo tienes)
npm install -g nodemon

# Iniciar en modo desarrollo
npm run dev
```

### Verificar que el Servidor Está Corriendo

Abre tu navegador y visita:

```
http://localhost:3000
```

Deberías ver la página principal del Mini App.

---

## Probar el Mini App en Telegram

### Opción 1: Usando ngrok (Recomendado para Testing Local)

ngrok crea un túnel seguro HTTPS hacia tu localhost, permitiendo que Telegram acceda a tu app local.

#### Paso 1: Instalar ngrok

**Windows:**
```powershell
# Descargar desde: https://ngrok.com/download
# O con chocolatey:
choco install ngrok
```

**Mac:**
```bash
brew install ngrok/ngrok/ngrok
```

**Linux:**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

#### Paso 2: Autenticar ngrok

```bash
# Obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken tu_token_de_ngrok
```

#### Paso 3: Crear Túnel

```bash
# En una terminal nueva (deja el servidor corriendo en otra)
ngrok http 3000
```

Deberías ver algo como:

```
ngrok

Session Status                online
Account                       tu-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

Copia la URL de "Forwarding" (ej. `https://abc123.ngrok-free.app`)

#### Paso 4: Actualizar BOT_URL

Actualiza tu `.env`:

```env
BOT_URL=https://abc123.ngrok-free.app
WEB_APP_URL=https://abc123.ngrok-free.app
WEBAPP_URL=https://abc123.ngrok-free.app
EPAYCO_RESPONSE_URL=https://abc123.ngrok-free.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://abc123.ngrok-free.app/epayco/confirmation
```

**⚠️ Importante:** Reinicia tu servidor después de cambiar el `.env`

#### Paso 5: Configurar Webhook de Telegram

```bash
# Reemplaza <TOKEN> con tu token de bot
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://abc123.ngrok-free.app/webhook"

# Verificar
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

#### Paso 6: Configurar Mini App en BotFather

1. Abre Telegram y busca **@BotFather**
2. Envía el comando: `/mybots`
3. Selecciona tu bot
4. Selecciona "Bot Settings" → "Menu Button"
5. Ingresa la URL del Mini App:
   ```
   https://abc123.ngrok-free.app
   ```
6. Ingresa el texto del botón: "Open Mini App" (o similar)

#### Paso 7: Probar en Telegram

1. Abre tu bot en Telegram
2. Haz clic en el botón del menú (junto al campo de texto)
3. El Mini App debería abrirse

### Opción 2: Usando Telegram Web (Solo para UI Testing)

Si solo quieres probar la interfaz sin funcionalidad de bot:

1. Abre tu navegador
2. Visita: `http://localhost:3000`
3. Prueba la interfaz manualmente

**⚠️ Limitaciones:**
- No tendrás datos de usuario de Telegram
- Webhooks no funcionarán
- Pagos no funcionarán completamente

---

## Probar Funcionalidades

### 1. Probar Interfaz del Mini App

#### Página de Perfil
```
http://localhost:3000
```

Verifica:
- [ ] La página carga sin errores
- [ ] Los estilos se aplican correctamente
- [ ] No hay errores en la consola del navegador

#### API de Perfil
```bash
# Obtener perfil de usuario
curl http://localhost:3000/api/profile/123456789
```

### 2. Probar Sistema de Planes

#### Listar Planes
```bash
curl http://localhost:3000/api/plans
```

Deberías ver los planes configurados en JSON.

#### Crear Link de Pago
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123456789",
    "planId": "silver"
  }'
```

### 3. Probar ePayco

#### Endpoint de Debug
```bash
# Navegador
http://localhost:3000/debug/test-payment

# Terminal
curl http://localhost:3000/debug/test-payment | json_pp
```

Deberías ver:
```json
{
  "success": true,
  "message": "✓ All ePayco integration checks passed!",
  "diagnostics": {
    "environment": "test",
    "credentials": {
      "EPAYCO_PUBLIC_KEY": "✓ Configured",
      "EPAYCO_PRIVATE_KEY": "✓ Configured",
      "EPAYCO_P_CUST_ID": "✓ Configured",
      "EPAYCO_P_KEY": "✓ Configured"
    }
  }
}
```

#### Probar Flujo Completo de Pago

1. Obtén un link de pago del debug endpoint
2. Abre el link en tu navegador
3. Usa una tarjeta de prueba:
   ```
   Número: 4575623182290326
   CVV: 123
   Vence: 12/2025
   ```
4. Completa el pago
5. Verifica que el webhook se recibe en tu consola

### 4. Probar Bot de Telegram

En Telegram, envía estos comandos a tu bot:

```
/start       - Iniciar bot
/help        - Mostrar ayuda
/profile     - Ver perfil
/subscribe   - Ver planes
/admin       - Panel admin (si eres admin)
```

Verifica que el bot responde correctamente a cada comando.

### 5. Probar Mapa de Usuarios

Si tienes la funcionalidad de mapa:

1. Abre el Mini App
2. Ve a la sección de Mapa
3. Permite acceso a ubicación
4. Verifica que se muestren usuarios cercanos

---

## Debugging y Herramientas

### Consola del Navegador

Abre las DevTools (F12) y revisa:

#### Console Tab
Busca errores de JavaScript:
```javascript
// Errores comunes:
❌ Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ Uncaught TypeError: Cannot read property 'x' of undefined
❌ 401 Unauthorized
```

#### Network Tab
Verifica las peticiones HTTP:
- Estados 200 = OK
- Estados 400-499 = Error del cliente
- Estados 500-599 = Error del servidor

#### Application Tab
Revisa:
- LocalStorage
- SessionStorage
- Cookies

### Logs del Servidor

En la terminal donde corre tu servidor, busca:

```bash
# Logs exitosos:
✓ Firebase initialized successfully
✓ ePayco credentials validated
✓ Web server running on port 3000

# Logs de peticiones:
[INFO] API: Profile fetched for user 123456789
[INFO] API: Payment link created successfully

# Errores:
[ERROR] Missing ePayco credentials
[ERROR] Firebase connection failed
```

### Herramientas de Testing

#### 1. Postman o Insomnia

Para probar API endpoints:

1. Descarga Postman: https://www.postman.com/
2. Importa esta colección:

```json
{
  "info": {
    "name": "Mini App API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/profile/123456789"
      }
    },
    {
      "name": "List Plans",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/plans"
      }
    },
    {
      "name": "Debug ePayco",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/debug/test-payment"
      }
    }
  ]
}
```

#### 2. ngrok Web Interface

Visita `http://127.0.0.1:4040` para ver:
- Todas las peticiones HTTP
- Request/Response details
- Replay requests

#### 3. Telegram Web Version

Usa Telegram Web para debugging más fácil:
```
https://web.telegram.org/
```

Puedes abrir DevTools mientras usas el Mini App.

### Testing Automatizado

#### Ejecutar Todos los Tests
```bash
# Tests de ePayco
node test-epayco.js

# Tests unitarios (si existen)
npm test

# Tests de linting
npm run lint
```

---

## Solución de Problemas

### El Servidor No Inicia

**Error: `EADDRINUSE: address already in use`**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**Error: `Cannot find module`**

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### El Mini App No Carga en Telegram

**Problema: Error de SSL/HTTPS**
- Telegram requiere HTTPS para Mini Apps
- Solución: Usa ngrok o despliega en un servidor con HTTPS

**Problema: URL incorrecta**
- Verifica la URL en BotFather
- Debe ser la URL de ngrok o tu servidor público

**Problema: Bot no responde**
- Verifica webhook con:
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
  ```
- Debe mostrar tu URL correcta

### Los Pagos No Funcionan

**Problema: "Missing ePayco credentials"**
```bash
# Verificar .env
node -e "console.log(process.env.EPAYCO_PUBLIC_KEY)"

# Debe mostrar tu public key, no undefined
```

**Problema: Webhook no se recibe**
```bash
# Verificar endpoint
curl http://localhost:3000/epayco/health

# Debe retornar: {"status":"ok"}
```

**Problema: Transacción rechazada**
- Verifica que uses tarjetas de prueba correctas
- Verifica que `EPAYCO_TEST_MODE=true`

### Firebase Errors

**Error: "Firebase credentials invalid"**
```bash
# Verificar formato del JSON
node -e "JSON.parse(process.env.FIREBASE_CREDENTIALS)"

# No debe mostrar error de sintaxis
```

**Error: "PERMISSION_DENIED"**
- Revisa las reglas de seguridad en Firebase Console
- Verifica que la colección existe

---

## Testing Avanzado

### Testing de Carga

Simula múltiples usuarios:

```bash
# Instalar Artillery
npm install -g artillery

# Crear archivo de test: load-test.yml
artillery quick --count 10 --num 100 http://localhost:3000
```

### Testing de Integración

Prueba el flujo completo:

```javascript
// test-integration.js
const axios = require('axios');

async function testCompleteFlow() {
  // 1. Obtener planes
  const plans = await axios.get('http://localhost:3000/api/plans');
  console.log('✓ Plans loaded:', plans.data.plans.length);

  // 2. Crear pago
  const payment = await axios.post('http://localhost:3000/api/payment/create', {
    userId: '123456789',
    planId: plans.data.plans[0].id
  });
  console.log('✓ Payment created:', payment.data.reference);

  // 3. Verificar perfil
  const profile = await axios.get('http://localhost:3000/api/profile/123456789');
  console.log('✓ Profile loaded:', profile.data.user.username);
}

testCompleteFlow().catch(console.error);
```

Ejecutar:
```bash
node test-integration.js
```

### Testing de Seguridad

Verifica seguridad básica:

```bash
# Probar sin autenticación
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"999","planId":"hack"}'

# Debe retornar 401 Unauthorized

# Probar SQL injection (no debería funcionar)
curl 'http://localhost:3000/api/profile/123;DROP TABLE users'

# Debe retornar 400 Bad Request
```

---

## Checklist de Testing Local

Antes de considerar las pruebas locales completas:

### Configuración
- [ ] `.env` configurado correctamente
- [ ] Dependencias instaladas (`npm install`)
- [ ] Tests automáticos pasan (`node test-epayco.js`)

### Servidor
- [ ] Servidor inicia sin errores (`npm start`)
- [ ] Puerto 3000 disponible
- [ ] Página principal carga en navegador

### API Endpoints
- [ ] `/api/plans` retorna planes
- [ ] `/api/profile/:userId` retorna perfil
- [ ] `/debug/test-payment` muestra diagnósticos
- [ ] `/epayco/health` retorna OK

### Telegram
- [ ] Bot responde a `/start`
- [ ] Mini App abre desde Telegram
- [ ] Comandos funcionan correctamente

### Pagos (con ngrok)
- [ ] Link de pago se crea
- [ ] Checkout de ePayco abre
- [ ] Pago con tarjeta de prueba funciona
- [ ] Webhook se recibe

### Base de Datos
- [ ] Conexión a Firebase exitosa
- [ ] Datos se guardan correctamente
- [ ] Datos se leen correctamente

---

## Recursos Adicionales

### Documentación
- **Telegram Mini Apps:** https://core.telegram.org/bots/webapps
- **ngrok:** https://ngrok.com/docs
- **Firebase:** https://firebase.google.com/docs
- **ePayco:** https://docs.epayco.co/

### Herramientas
- **Postman:** https://www.postman.com/
- **ngrok:** https://ngrok.com/
- **VSCode:** https://code.visualstudio.com/
- **Chrome DevTools:** F12 en Chrome

### Comandos de Referencia Rápida

```bash
# Iniciar servidor
npm start

# Tests
node test-epayco.js

# ngrok
ngrok http 3000

# Ver logs
# (En la terminal donde corre el servidor)

# Reiniciar
# Ctrl+C y luego npm start

# Verificar puerto
netstat -ano | findstr :3000  # Windows
lsof -i:3000  # Mac/Linux
```

---

## Siguientes Pasos

Después de probar localmente:

1. ✅ Lee `docs/DESPLIEGUE_PRODUCCION.md` para desplegar
2. ✅ Configura monitoreo y alertas
3. ✅ Documenta cualquier issue encontrado
4. ✅ Prepara para ambiente de producción

**¡Listo para probar tu Mini App localmente!** 🧪
