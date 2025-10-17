# Guía Completa de Configuración de ePayco

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Obtener Credenciales de ePayco](#obtener-credenciales-de-epayco)
3. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
4. [Verificar la Configuración](#verificar-la-configuración)
5. [Configurar Webhooks](#configurar-webhooks)
6. [Probar la Integración](#probar-la-integración)
7. [Modo de Prueba vs Producción](#modo-de-prueba-vs-producción)
8. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ Una cuenta en ePayco (https://dashboard.epayco.co/)
- ✅ Acceso al panel de control de ePayco
- ✅ Tu aplicación desplegada con una URL pública (para webhooks)
- ✅ Acceso al archivo `.env` de tu proyecto

---

## Obtener Credenciales de ePayco

### Paso 1: Ingresar al Dashboard de ePayco

1. Visita https://dashboard.epayco.co/
2. Inicia sesión con tus credenciales
3. Navega a **Configuración** → **API Keys**

### Paso 2: Obtener las Credenciales

Necesitas obtener **4 credenciales principales**:

#### 1. **Public Key (Llave Pública)**
- También conocida como: `Public Key`, `API Key`
- Se usa para: Inicializar el SDK de ePayco
- Ejemplo: `881ddf8418549218fe2f227458f2f59c`
- Ubicación en el dashboard: Sección "API Keys" → "Public Key"

#### 2. **Private Key (Llave Privada)**
- También conocida como: `Private Key`, `API Secret`
- Se usa para: Autenticación de API del backend
- Ejemplo: `80174d93a6f8d760f5cca2b2cc6ee48b`
- Ubicación en el dashboard: Sección "API Keys" → "Private Key"
- ⚠️ **IMPORTANTE**: Nunca compartas esta clave públicamente

#### 3. **P_CUST_ID (ID de Cliente)**
- También conocida como: `Customer ID`, `Merchant ID`
- Se usa para: Identificar tu cuenta de comercio
- Ejemplo: `1555482`
- Ubicación en el dashboard: Sección "API Keys" → "P_CUST_ID_CLIENTE"

#### 4. **P_KEY (Llave P)**
- También conocida como: `P_KEY`, `Merchant Key`
- Se usa para: Firma de transacciones
- Ejemplo: `e76ae8e9551df6e3b353434c4de34ef2dafa41bf`
- Ubicación en el dashboard: Sección "API Keys" → "P_KEY"

### Paso 3: Copiar las Credenciales

1. Haz clic en cada credencial para copiarla
2. Guárdalas en un lugar seguro (no las compartas)
3. Prepáralas para agregarlas al archivo `.env`

### 📸 Captura de Pantalla del Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                    API Keys - ePayco                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Public Key:          881ddf8418549218fe2f227458f2f59c │
│  Private Key:         ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │
│  P_CUST_ID_CLIENTE:   1555482                          │
│  P_KEY:               ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │
│                                                         │
│  Ambiente:            ○ Pruebas  ● Producción          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Configurar Variables de Entorno

### Paso 1: Ubicar el Archivo `.env`

El archivo `.env` debe estar en la raíz de tu proyecto:

```
Bots/
├── src/
├── docs/
├── .env          ← Aquí
├── .env.example
├── package.json
└── ...
```

### Paso 2: Abrir el Archivo `.env`

Si no existe, cópialo desde `.env.example`:

```bash
# En Windows PowerShell
copy .env.example .env

# En Mac/Linux
cp .env.example .env
```

### Paso 3: Agregar las Credenciales de ePayco

Abre `.env` y agrega/actualiza estas líneas:

```env
# ============================================
# Configuración de ePayco
# ============================================

# Credenciales de API
EPAYCO_PUBLIC_KEY=tu_public_key_aqui
EPAYCO_PRIVATE_KEY=tu_private_key_aqui
EPAYCO_P_CUST_ID=tu_customer_id_aqui
EPAYCO_P_KEY=tu_p_key_aqui

# Modo de operación
# true = Modo de prueba (no se cobran transacciones reales)
# false = Modo de producción (transacciones reales)
EPAYCO_TEST_MODE=true

# URL base de tu aplicación (requerido para webhooks)
BOT_URL=https://tu-app.railway.app

# URLs de webhook (opcional, se generan automáticamente desde BOT_URL)
EPAYCO_RESPONSE_URL=https://tu-app.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://tu-app.railway.app/epayco/confirmation
```

### Paso 4: Reemplazar los Valores de Ejemplo

**Antes:**
```env
EPAYCO_PUBLIC_KEY=tu_public_key_aqui
EPAYCO_PRIVATE_KEY=tu_private_key_aqui
EPAYCO_P_CUST_ID=tu_customer_id_aqui
EPAYCO_P_KEY=tu_p_key_aqui
BOT_URL=https://tu-app.railway.app
```

**Después (ejemplo):**
```env
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_CUST_ID=1555482
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
BOT_URL=https://pnptv-bot.railway.app
```

### 📝 Notas Importantes:

1. **No uses comillas** alrededor de los valores
2. **No dejes espacios** antes o después del `=`
3. **Reemplaza TODOS los valores** de ejemplo
4. **Verifica BOT_URL** apunte a tu aplicación desplegada

---

## Verificar la Configuración

### Método 1: Usando el Script de Prueba

Ejecuta el script de prueba automatizado:

```bash
node test-epayco.js
```

**Resultado esperado:**
```
============================================================
ePayco Integration Test Suite
============================================================

Test 1: Checking environment variables...
✓ EPAYCO_PUBLIC_KEY: Configured
✓ EPAYCO_PRIVATE_KEY: Configured
✓ EPAYCO_P_CUST_ID: Configured
✓ EPAYCO_P_KEY: Configured
✓ EPAYCO_TEST_MODE: Configured
✓ BOT_URL: Configured
✓ All required environment variables are configured

Test 2: Validating ePayco credentials...
✓ Credentials validation passed

...

============================================================
Test Summary
============================================================
✓ Tests Passed: 8
✓ All tests passed!
============================================================
```

### Método 2: Usando el Endpoint de Debug

1. Inicia tu servidor:
   ```bash
   npm start
   ```

2. Visita en tu navegador:
   ```
   http://localhost:3000/debug/test-payment
   ```

3. Verifica que veas:
   ```json
   {
     "success": true,
     "message": "✓ All ePayco integration checks passed!",
     "diagnostics": {
       "credentials": {
         "EPAYCO_PUBLIC_KEY": "✓ Configured",
         "EPAYCO_PRIVATE_KEY": "✓ Configured",
         "EPAYCO_P_CUST_ID": "✓ Configured",
         "EPAYCO_P_KEY": "✓ Configured"
       }
     }
   }
   ```

### Método 3: Verificación Manual Rápida

Ejecuta este comando:

```bash
node -e "require('./src/config/epayco'); console.log('✓ Configuración cargada correctamente')"
```

**Si ves errores:**

- ❌ `Missing ePayco credentials: EPAYCO_PUBLIC_KEY` → Falta la Public Key
- ❌ `Cannot find module` → Ejecuta `npm install` primero
- ❌ `EPAYCO_P_CUST_ID is not configured` → Revisa tu archivo `.env`

---

## Configurar Webhooks

Los webhooks permiten que ePayco notifique a tu aplicación cuando se completa un pago.

### Paso 1: Verificar BOT_URL

Asegúrate de que `BOT_URL` en tu `.env` sea la URL pública de tu aplicación:

```env
BOT_URL=https://tu-app.railway.app
```

⚠️ **Importante:**
- Debe ser HTTPS (no HTTP)
- Debe ser accesible públicamente
- No incluyas "/" al final

### Paso 2: URLs de Webhook Automáticas

Tu aplicación genera automáticamente estas URLs:

- **URL de Confirmación:** `https://tu-app.railway.app/epayco/confirmation`
- **URL de Respuesta:** `https://tu-app.railway.app/epayco/response`

### Paso 3: Configurar en el Dashboard de ePayco (Opcional)

1. Ve a https://dashboard.epayco.co/
2. Navega a **Configuración** → **Webhooks**
3. Agrega la URL de confirmación:
   ```
   https://tu-app.railway.app/epayco/confirmation
   ```
4. Selecciona los eventos: **Transacción Aprobada**
5. Guarda los cambios

### Paso 4: Probar Webhooks

```bash
# Probar endpoint de salud
curl https://tu-app.railway.app/epayco/health

# Resultado esperado:
# {"status":"ok","service":"epayco-webhook","timestamp":"..."}
```

---

## Probar la Integración

### Prueba Completa Paso a Paso

#### 1. Obtener un Link de Pago de Prueba

Visita el endpoint de debug:
```
https://tu-app.railway.app/debug/test-payment
```

Copia el `paymentUrl` del resultado.

#### 2. Abrir el Link de Pago

Abre el link en tu navegador. Verás la página de checkout de ePayco.

#### 3. Usar Tarjetas de Prueba

En **modo de prueba** (EPAYCO_TEST_MODE=true), usa estas tarjetas:

**Transacción Aprobada:**
```
Número:  4575 6231 8229 0326
CVV:     123
Vence:   Cualquier fecha futura (ej. 12/2025)
```

**Transacción Rechazada:**
```
Número:  4151 6115 2758 3283
CVV:     123
Vence:   Cualquier fecha futura
```

#### 4. Completar el Pago

1. Ingresa los datos de la tarjeta de prueba
2. Completa los datos del formulario
3. Haz clic en "Pagar"

#### 5. Verificar el Resultado

- Serás redirigido a la página de respuesta
- Deberías ver: "✅ ¡Pago Exitoso!"
- Revisa los logs de tu aplicación para ver el webhook

#### 6. Verificar la Membresía

Verifica que la membresía del usuario se haya activado:

```bash
# Ver logs
railway logs
# o
heroku logs --tail
```

Busca:
```
[WEBHOOK] Payment processed successfully
[WEBHOOK] Membership activated successfully
```

---

## Modo de Prueba vs Producción

### Modo de Prueba (Testing)

**Configuración:**
```env
EPAYCO_TEST_MODE=true
```

**Características:**
- ✅ No se procesan transacciones reales
- ✅ Usa tarjetas de prueba
- ✅ Perfecto para desarrollo
- ✅ Sin riesgo de cargos

**Credenciales:**
- Usa las credenciales de **ambiente de pruebas** de ePayco

### Modo de Producción (Production)

**Configuración:**
```env
EPAYCO_TEST_MODE=false
```

**Características:**
- ⚠️ Transacciones REALES
- ⚠️ Se cobran a tarjetas reales
- ⚠️ Solo para cuando estés listo para lanzar
- ✅ Ganancias reales

**Credenciales:**
- Usa las credenciales de **ambiente de producción** de ePayco
- Obtén credenciales diferentes para producción en el dashboard

### Checklist para Pasar a Producción

Antes de cambiar a producción, verifica:

- [ ] Todas las pruebas pasan exitosamente
- [ ] Webhooks funcionan correctamente
- [ ] Credenciales de producción obtenidas
- [ ] EPAYCO_TEST_MODE cambiado a `false`
- [ ] BOT_URL apunta a dominio de producción
- [ ] SSL/HTTPS habilitado
- [ ] Logs y monitoreo configurados
- [ ] Probado con transacción pequeña real

---

## Solución de Problemas

### Error: "Missing ePayco credentials"

**Síntomas:**
```
Error: Missing ePayco credentials: EPAYCO_PUBLIC_KEY, EPAYCO_P_KEY
```

**Soluciones:**
1. Verifica que `.env` existe en la raíz del proyecto
2. Verifica que todas las credenciales estén en `.env`
3. No uses comillas alrededor de los valores
4. Reinicia tu aplicación después de modificar `.env`

```bash
# Verificar rápido
node -e "console.log('PUBLIC_KEY:', process.env.EPAYCO_PUBLIC_KEY ? 'Configurado' : 'Falta')"
```

### Error: "Invalid payment parameters"

**Síntomas:**
```
Error: Missing required parameters: amount, userId
```

**Soluciones:**
1. Verifica que todos los parámetros requeridos estén presentes
2. Verifica que `amount` sea un número positivo
3. Verifica que `currency` sea "COP" o "USD"

### Error: "Payment link creation failed"

**Síntomas:**
- El link de pago no se crea
- Error de API de ePayco

**Soluciones:**
1. Verifica credenciales en https://dashboard.epayco.co/
2. Verifica que las credenciales correspondan al ambiente correcto (prueba/producción)
3. Revisa los logs detallados:
   ```bash
   railway logs
   ```
4. Usa el endpoint de debug para diagnóstico:
   ```
   /debug/test-payment
   ```

### Los Webhooks No Se Reciben

**Síntomas:**
- El pago se completa pero la membresía no se activa
- No hay logs de webhook

**Soluciones:**
1. Verifica que `BOT_URL` sea accesible públicamente
2. Verifica que `BOT_URL` use HTTPS
3. Prueba el endpoint manualmente:
   ```bash
   curl https://tu-app.railway.app/epayco/health
   ```
4. Verifica configuración en dashboard de ePayco
5. Revisa logs de ePayco en su dashboard

### Error: "EADDRINUSE" (Puerto en Uso)

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Soluciones:**

**Windows:**
```powershell
# Encontrar proceso usando puerto 3000
netstat -ano | findstr :3000

# Matar proceso (reemplaza PID)
taskkill /PID <numero_pid> /F
```

**Mac/Linux:**
```bash
# Encontrar y matar proceso
lsof -ti:3000 | xargs kill -9
```

### Credenciales Correctas Pero Sigue Fallando

**Soluciones:**
1. Verifica que las credenciales sean del ambiente correcto:
   - Pruebas: Credenciales de ambiente de pruebas
   - Producción: Credenciales de ambiente de producción
2. Verifica que `EPAYCO_TEST_MODE` coincida con las credenciales
3. Regenera las credenciales en el dashboard de ePayco
4. Limpia caché y reinicia:
   ```bash
   rm -rf node_modules
   npm install
   npm start
   ```

---

## Recursos Adicionales

### Documentación Oficial
- **Dashboard ePayco:** https://dashboard.epayco.co/
- **Documentación API:** https://docs.epayco.co/
- **Soporte ePayco:** https://epayco.co/contacto

### Archivos del Proyecto
- **Configuración ePayco:** `src/config/epayco.js`
- **Webhooks:** `src/web/epaycoWebhook.js`
- **Tests:** `test-epayco.js`
- **Variables de entorno:** `.env`

### Comandos Útiles

```bash
# Verificar configuración
node test-epayco.js

# Probar carga de config
node -e "require('./src/config/epayco'); console.log('✓ OK')"

# Iniciar servidor
npm start

# Ver logs (Railway)
railway logs

# Ver logs (Heroku)
heroku logs --tail
```

### Endpoints de Debug

- `/debug/test-payment` - Diagnóstico completo
- `/epayco/health` - Estado de webhooks
- `/api/plans` - Listar planes disponibles

---

## Siguientes Pasos

Después de completar esta configuración:

1. ✅ Lee `docs/DESPLIEGUE_PRODUCCION.md` para aprender a desplegar
2. ✅ Lee `docs/PRUEBAS_LOCALES_MINIAPP.md` para probar el Mini App
3. ✅ Consulta `EPAYCO_QUICK_REFERENCE.md` para referencia rápida

---

## Soporte

Si tienes problemas:

1. Ejecuta `node test-epayco.js` para diagnóstico
2. Visita `/debug/test-payment` para más detalles
3. Revisa los logs de tu aplicación
4. Consulta la documentación de ePayco
5. Contacta soporte de ePayco

**¡Listo! Tu integración con ePayco está configurada.** 🎉
