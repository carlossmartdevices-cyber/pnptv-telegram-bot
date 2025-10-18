# Solución: Error de Firebase Credentials en Railway

## Problema

```
Error parsing FIREBASE_CREDENTIALS: Unterminated string in JSON at position 155
```

Esto ocurre cuando `FIREBASE_CREDENTIALS` está mal formateado en Railway.

---

## Solución Rápida

### Método 1: Copiar JSON en una sola línea (RECOMENDADO)

1. **Obtén tus credenciales de Firebase:**
   - Ve a Firebase Console: https://console.firebase.google.com/
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Descarga el archivo JSON

2. **Convierte a una sola línea:**

   **Opción A: Usar herramienta online**
   - Ve a: https://jsonformatter.org/json-minifier
   - Pega tu JSON completo
   - Click "Minify"
   - Copia el resultado (todo en una línea)

   **Opción B: Usar comando (Linux/macOS)**
   ```bash
   cat firebase-credentials.json | jq -c
   ```

   **Opción C: Usar Node.js**
   ```bash
   node -e "console.log(JSON.stringify(require('./firebase-credentials.json')))"
   ```

   **Opción D: Usar PowerShell (Windows)**
   ```powershell
   $json = Get-Content firebase-credentials.json | ConvertFrom-Json
   $json | ConvertTo-Json -Compress
   ```

3. **Configurar en Railway:**

   **Desde CLI:**
   ```bash
   railway variables set FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-email@project.iam.gserviceaccount.com",...}'
   ```

   **Desde Dashboard:**
   ```bash
   railway open
   ```
   - Ve a **Settings → Variables**
   - Click **+ New Variable**
   - Name: `FIREBASE_CREDENTIALS`
   - Value: Pega el JSON minificado (una sola línea)
   - Click **Add**

---

### Método 2: Base64 Encode (Alternativa)

Si Railway sigue teniendo problemas con caracteres especiales:

1. **Codificar a Base64:**

   **Linux/macOS:**
   ```bash
   cat firebase-credentials.json | base64 -w 0
   ```

   **Windows (PowerShell):**
   ```powershell
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content firebase-credentials.json -Raw)))
   ```

   **Node.js:**
   ```bash
   node -e "console.log(Buffer.from(require('fs').readFileSync('firebase-credentials.json')).toString('base64'))"
   ```

2. **Configurar en Railway:**
   ```bash
   railway variables set FIREBASE_CREDENTIALS='<BASE64_STRING_AQUI>'
   ```

El código ahora detecta automáticamente si está en Base64 y lo decodifica.

---

## Verificación

### 1. Check que las variables estén configuradas

```bash
railway variables
```

Debe mostrar:
```
FIREBASE_CREDENTIALS = {"type":"service_account"...  (truncated)
FIREBASE_PROJECT_ID = your-project-id
TELEGRAM_BOT_TOKEN = 1234567890:ABCD...
```

### 2. Deploy y verificar logs

```bash
railway up
railway logs
```

**Logs esperados (exitosos):**
```
Iniciando Firebase...
FIREBASE_CREDENTIALS length: 1234 chars
First 200 chars: {"type":"service_account","project_id":"your-project"...
✅ Using Firebase credentials from environment variable
   Project ID: your-project-id
   Client Email: your-service-account@project.iam.gserviceaccount.com
✅ Firebase ha sido inicializado correctamente.
```

**Si ves esto, funciona! ✅**

---

## Variables de Entorno Necesarias

### Mínimo requerido:

```bash
# Railway CLI
railway variables set TELEGRAM_BOT_TOKEN="your_bot_token"
railway variables set FIREBASE_CREDENTIALS='{"type":"service_account",...}'
railway variables set FIREBASE_PROJECT_ID="your-project-id"
railway variables set NODE_ENV="production"
```

### Opcional pero recomendado:

```bash
railway variables set BOT_URL="https://your-service.railway.app"
railway variables set WEBHOOK_URL="https://your-service.railway.app"
railway variables set ADMIN_IDS="your_telegram_id"
railway variables set EPAYCO_PUBLIC_KEY="xxx"
railway variables set EPAYCO_PRIVATE_KEY="xxx"
railway variables set EPAYCO_TEST_MODE="true"
```

---

## Troubleshooting

### Error: "Unterminated string in JSON"

**Causa:** JSON tiene saltos de línea sin escapar o está truncado.

**Solución:**
1. Minificar JSON (remover todos los saltos de línea)
2. O usar Base64 encoding

### Error: "Missing required fields"

**Causa:** El JSON no tiene todos los campos necesarios.

**Verificar que el JSON tenga:**
- `type`
- `project_id`
- `private_key`
- `client_email`

**Ejemplo de JSON válido minificado:**
```json
{"type":"service_account","project_id":"my-project","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@my-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40my-project.iam.gserviceaccount.com"}
```

### Error: "FIREBASE_CREDENTIALS length: 155 chars"

**Causa:** El JSON está truncado (cortado).

**Solución:**
1. Verificar que copiaste TODO el JSON completo
2. El JSON completo suele tener ~1200-2500 caracteres
3. Volver a copiar desde Firebase Console

### Error: "private_key is not valid"

**Causa:** El `private_key` no está correctamente formateado.

**Verificar:**
- Debe incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Los saltos de línea en el `private_key` deben ser `\n` (escapados)

**Correcto:**
```json
"private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**Incorrecto:**
```json
"private_key":"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBg...
-----END PRIVATE KEY-----"
```

---

## Script de Ayuda

Guarda este script como `prepare-firebase-env.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Lee el archivo de credenciales
const credentialsPath = process.argv[2] || './firebase-credentials.json';

if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ File not found: ${credentialsPath}`);
  console.log('Usage: node prepare-firebase-env.js <path-to-credentials.json>');
  process.exit(1);
}

const credentials = require(path.resolve(credentialsPath));

// Validar campos requeridos
const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !credentials[field]);

if (missingFields.length > 0) {
  console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
  process.exit(1);
}

// Minificar JSON
const minified = JSON.stringify(credentials);

// Base64 encode
const base64 = Buffer.from(minified).toString('base64');

console.log('\n✅ Firebase credentials prepared!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 METHOD 1: Minified JSON (RECOMMENDED)\n');
console.log('Copy this value to Railway:\n');
console.log(minified);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 METHOD 2: Base64 Encoded (Alternative)\n');
console.log('Copy this value to Railway:\n');
console.log(base64);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📝 Railway CLI Commands:\n');
console.log(`railway variables set FIREBASE_CREDENTIALS='${minified.substring(0, 50)}...'`);
console.log('\nOr from dashboard:');
console.log('  railway open');
console.log('  Settings → Variables → Add Variable');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Length:', minified.length, 'chars');
console.log('✅ Project ID:', credentials.project_id);
console.log('✅ Client Email:', credentials.client_email);
console.log('');
```

**Uso:**
```bash
node prepare-firebase-env.js ./path/to/firebase-credentials.json
```

---

## Comandos Railway para actualizar variables

```bash
# Ver variables actuales
railway variables

# Actualizar FIREBASE_CREDENTIALS (método minified)
railway variables set FIREBASE_CREDENTIALS='<MINIFIED_JSON_HERE>'

# Verificar que se guardó correctamente
railway variables get FIREBASE_CREDENTIALS

# Redeploy después de actualizar variables
railway up

# Ver logs para confirmar
railway logs
```

---

## Checklist Final

Antes de hacer deploy, verificar:

- [ ] `FIREBASE_CREDENTIALS` está configurado en Railway
- [ ] El JSON es válido (probado en https://jsonlint.com/)
- [ ] El JSON está en UNA SOLA LÍNEA (sin saltos de línea)
- [ ] El JSON tiene más de 1000 caracteres (no está truncado)
- [ ] `FIREBASE_PROJECT_ID` está configurado
- [ ] `TELEGRAM_BOT_TOKEN` está configurado
- [ ] `NODE_ENV=production` está configurado

```bash
# Verificar todo de una vez
railway variables | grep -E "FIREBASE|TELEGRAM|NODE_ENV"
```

---

## Resultado Esperado

Después de configurar correctamente:

```bash
railway up
railway logs
```

**Deberías ver:**
```
Iniciando Firebase...
FIREBASE_CREDENTIALS length: 1234 chars
First 200 chars: {"type":"service_account","project_id":"my-project"...
✅ Using Firebase credentials from environment variable
   Project ID: my-project-123456
   Client Email: firebase-adminsdk-xxx@my-project.iam.gserviceaccount.com
✅ Firebase ha sido inicializado correctamente.
🚀 PNPtv Bot Server Started
   - Environment: production
   - Host: 0.0.0.0
   - Port: 3000
   - Health Check: http://localhost:3000/health
   - Bot Username: @PNPtvbot
```

**¡Listo! El bot está corriendo. ✅**

---

## Soporte

Si sigues teniendo problemas:

1. Ejecuta el script `prepare-firebase-env.js` para generar el formato correcto
2. Verifica los logs con `railway logs`
3. Consulta esta guía de troubleshooting
4. Verifica que el JSON sea válido en https://jsonlint.com/

---

**Última actualización:** 2025-10-17
