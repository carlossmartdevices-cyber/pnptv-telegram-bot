# Guía Rápida de Inicio

**¿Primera vez con el proyecto? Esta guía te llevará de 0 a funcionando en menos de 30 minutos.**

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Prerequisitos

Asegúrate de tener instalado:
- Node.js v16+ ([Descargar](https://nodejs.org/))
- Git ([Descargar](https://git-scm.com/))

### 2. Clonar e Instalar

```bash
# Clonar proyecto
git clone https://github.com/tu-usuario/Bots.git
cd Bots

# Instalar dependencias
npm install
```

### 3. Configurar Variables Básicas

```bash
# Copiar archivo de ejemplo
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux
```

Edita `.env` con tus credenciales mínimas:

```env
# Bot de Telegram (obligatorio)
TELEGRAM_TOKEN=tu_token_aqui

# Firebase (obligatorio)
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CREDENTIALS={"type":"service_account",...}

# ePayco - Modo Prueba (obligatorio)
EPAYCO_PUBLIC_KEY=tu_public_key
EPAYCO_PRIVATE_KEY=tu_private_key
EPAYCO_P_CUST_ID=tu_customer_id
EPAYCO_P_KEY=tu_p_key
EPAYCO_TEST_MODE=true

# Local
BOT_URL=http://localhost:3000
```

### 4. Probar y Ejecutar

```bash
# Verificar configuración
node test-epayco.js

# Si todo está OK, iniciar
npm start
```

✅ **¡Listo!** Tu bot está corriendo en `http://localhost:3000`

---

## 📚 Siguientes Pasos

### Para Testing Local Completo
👉 Lee: [`docs/PRUEBAS_LOCALES_MINIAPP.md`](PRUEBAS_LOCALES_MINIAPP.md)

### Para Configurar ePayco Detalladamente
👉 Lee: [`docs/CONFIGURACION_EPAYCO.md`](CONFIGURACION_EPAYCO.md)

### Para Desplegar en Producción
👉 Lee: [`docs/DESPLIEGUE_PRODUCCION.md`](DESPLIEGUE_PRODUCCION.md)

---

## 🔑 Obtener Credenciales

### Telegram Bot Token

1. Abre Telegram y busca **@BotFather**
2. Envía `/newbot`
3. Sigue las instrucciones
4. Copia el token que te dan

### Firebase Credentials

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea/selecciona tu proyecto
3. Configuración → Cuentas de servicio
4. "Generar nueva clave privada"
5. Copia el JSON completo (en una sola línea para el `.env`)

### ePayco Credentials

1. Crea cuenta en [ePayco Dashboard](https://dashboard.epayco.co/)
2. Ve a Configuración → API Keys
3. **IMPORTANTE:** Selecciona ambiente de **PRUEBAS**
4. Copia estas 4 credenciales:
   - Public Key
   - Private Key
   - P_CUST_ID
   - P_KEY

---

## 🧪 Verificación Rápida

### Test 1: Configuración
```bash
node test-epayco.js
```
✅ Esperado: "8/8 tests passed"

### Test 2: Servidor
```bash
npm start
# Abre: http://localhost:3000
```
✅ Esperado: Página del Mini App carga

### Test 3: ePayco
```
http://localhost:3000/debug/test-payment
```
✅ Esperado: JSON con `"success": true`

### Test 4: Bot (Opcional)
```bash
# Configura webhook primero (requiere URL pública)
# Ver: docs/PRUEBAS_LOCALES_MINIAPP.md
```

---

## 📁 Estructura del Proyecto

```
Bots/
├── src/
│   ├── bot/              # Lógica del bot de Telegram
│   ├── config/           # Configuraciones (Firebase, ePayco)
│   ├── services/         # Servicios (planes, perfiles)
│   ├── utils/            # Utilidades
│   └── web/              # Servidor web y Mini App
│       ├── public/       # Archivos estáticos del Mini App
│       └── routes/       # Rutas de API
├── docs/                 # 📚 Documentación completa
├── test-epayco.js        # 🧪 Tests automatizados
├── .env                  # 🔐 Variables de entorno (NO commitar)
├── .env.example          # 📝 Plantilla de .env
├── package.json          # 📦 Dependencias
└── README.md             # 📖 Documentación principal
```

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm start                 # Iniciar servidor
npm run dev              # Modo desarrollo (con auto-reload)
npm test                 # Ejecutar tests

# Testing
node test-epayco.js      # Tests de ePayco
npm run lint             # Verificar código

# Despliegue (después de configurar Railway/Heroku)
git push origin main     # Railway auto-deploys
git push heroku main     # Heroku
```

---

## 📝 Variables de Entorno Esenciales

| Variable | Descripción | ¿Dónde obtenerla? |
|----------|-------------|-------------------|
| `TELEGRAM_TOKEN` | Token del bot | @BotFather en Telegram |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase | Firebase Console |
| `FIREBASE_CREDENTIALS` | JSON de credenciales | Firebase → Cuentas de servicio |
| `EPAYCO_PUBLIC_KEY` | Llave pública ePayco | ePayco Dashboard |
| `EPAYCO_PRIVATE_KEY` | Llave privada ePayco | ePayco Dashboard |
| `EPAYCO_P_CUST_ID` | ID de cliente ePayco | ePayco Dashboard |
| `EPAYCO_P_KEY` | Llave P ePayco | ePayco Dashboard |
| `EPAYCO_TEST_MODE` | Modo de prueba | `true` para testing |
| `BOT_URL` | URL pública del bot | Tu dominio o ngrok |

---

## 🐛 Problemas Comunes

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Missing ePayco credentials"
- Verifica que todas las variables `EPAYCO_*` estén en `.env`
- No uses comillas alrededor de los valores
- Reinicia el servidor después de editar `.env`

### "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### "Firebase connection failed"
- Verifica que `FIREBASE_CREDENTIALS` sea JSON válido
- Asegúrate de que esté en una sola línea
- Verifica que el proyecto existe en Firebase Console

### "Bot doesn't respond"
- Para testing local necesitas ngrok o servidor público
- Ver: `docs/PRUEBAS_LOCALES_MINIAPP.md`

---

## 📖 Documentación Completa

### Configuración Detallada
- **ePayco:** [`docs/CONFIGURACION_EPAYCO.md`](CONFIGURACION_EPAYCO.md)
  - Cómo obtener credenciales paso a paso
  - Configurar webhooks
  - Modo prueba vs producción

### Testing y Desarrollo
- **Pruebas Locales:** [`docs/PRUEBAS_LOCALES_MINIAPP.md`](PRUEBAS_LOCALES_MINIAPP.md)
  - Configurar entorno de desarrollo
  - Usar ngrok para testing local
  - Debugging y herramientas

### Despliegue
- **Producción:** [`docs/DESPLIEGUE_PRODUCCION.md`](DESPLIEGUE_PRODUCCION.md)
  - Desplegar en Railway (recomendado)
  - Desplegar en Heroku
  - Monitoreo y mantenimiento

### Referencias Rápidas
- **Quick Reference:** `EPAYCO_QUICK_REFERENCE.md`
  - Comandos útiles
  - Código de ejemplo
  - Troubleshooting rápido

---

## 🎯 Flujo de Trabajo Recomendado

### Para Desarrolladores Nuevos

1. **Día 1: Setup Local**
   - ✅ Seguir esta guía rápida
   - ✅ Ejecutar `npm install`
   - ✅ Configurar `.env` básico
   - ✅ Correr `npm start` exitosamente

2. **Día 2: Testing Local**
   - ✅ Leer `docs/PRUEBAS_LOCALES_MINIAPP.md`
   - ✅ Configurar ngrok
   - ✅ Probar bot en Telegram
   - ✅ Hacer un pago de prueba

3. **Día 3: ePayco**
   - ✅ Leer `docs/CONFIGURACION_EPAYCO.md`
   - ✅ Entender webhooks
   - ✅ Probar flujo completo de pago

4. **Día 4: Despliegue**
   - ✅ Leer `docs/DESPLIEGUE_PRODUCCION.md`
   - ✅ Crear cuenta en Railway
   - ✅ Desplegar versión de prueba

5. **Día 5: Producción**
   - ✅ Obtener credenciales de producción
   - ✅ Cambiar a modo producción
   - ✅ Hacer transacción real pequeña
   - ✅ Configurar monitoreo

### Para Testing Rápido

**¿Solo quieres probar que funciona?**

```bash
# 1. Instalar
npm install

# 2. Copiar .env.example a .env
copy .env.example .env

# 3. Agregar credenciales mínimas a .env

# 4. Test
node test-epayco.js

# 5. Start
npm start

# 6. Abrir navegador
# http://localhost:3000/debug/test-payment
```

---

## 🆘 Obtener Ayuda

### Documentación Interna
1. **Primero:** Lee las guías en `docs/`
2. **Segundo:** Revisa `TROUBLESHOOTING.md` si existe
3. **Tercero:** Busca en los logs: `railway logs` o `heroku logs --tail`

### Recursos Externos
- **Telegram Bots:** https://core.telegram.org/bots
- **Firebase:** https://firebase.google.com/docs
- **ePayco:** https://docs.epayco.co/
- **Railway:** https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/

### Debugging
```bash
# Ver tests detallados
node test-epayco.js

# Ver logs del servidor
npm start
# (los logs aparecen en la misma terminal)

# Probar endpoint específico
curl http://localhost:3000/epayco/health
```

---

## ✅ Checklist de Inicio

Antes de continuar con desarrollo:

### Configuración Básica
- [ ] Node.js instalado (v16+)
- [ ] Proyecto clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` creado
- [ ] Credenciales básicas agregadas

### Tests Iniciales
- [ ] `node test-epayco.js` pasa (8/8)
- [ ] `npm start` inicia sin errores
- [ ] `http://localhost:3000` carga en navegador
- [ ] `/debug/test-payment` muestra diagnósticos

### Siguiente Nivel
- [ ] Bot responde en Telegram (requiere ngrok)
- [ ] Pago de prueba funciona
- [ ] Webhook se recibe
- [ ] Listo para leer documentación avanzada

---

## 📈 Próximos Pasos Sugeridos

### Ahora que tienes lo básico funcionando:

1. **Explora la UI**
   - Abre `http://localhost:3000` en tu navegador
   - Revisa los archivos en `src/web/public/`
   - Modifica estilos y ve los cambios

2. **Entiende el Flujo de Pagos**
   - Lee `src/config/epayco.js`
   - Revisa `src/web/epaycoWebhook.js`
   - Entiende cómo se procesan los pagos

3. **Aprende el Bot**
   - Revisa `src/bot/index.js`
   - Mira los handlers en `src/bot/handlers/`
   - Prueba comandos en Telegram

4. **Profundiza en la Arquitectura**
   - Lee `src/services/` para lógica de negocio
   - Revisa `src/utils/` para utilidades
   - Entiende la estructura de Firebase

5. **Prepara para Producción**
   - Lee `docs/DESPLIEGUE_PRODUCCION.md`
   - Configura cuenta en Railway
   - Obtén credenciales de producción

---

## 🎓 Recursos de Aprendizaje

### Para Beginners
- **Node.js Basics:** https://nodejs.org/en/docs/guides/
- **Express.js:** https://expressjs.com/en/starter/basic-routing.html
- **Telegram Bots 101:** https://core.telegram.org/bots/tutorial

### Para Developers
- **Telegram Mini Apps:** https://core.telegram.org/bots/webapps
- **Firebase Firestore:** https://firebase.google.com/docs/firestore
- **ePayco API:** https://docs.epayco.co/

### Para DevOps
- **Railway Guide:** https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/
- **Heroku Guide:** https://devcenter.heroku.com/
- **Monitoring:** https://betterstack.com/

---

## 💡 Tips y Mejores Prácticas

### Seguridad
- ✅ NUNCA commitees el archivo `.env`
- ✅ Usa modo de prueba (`EPAYCO_TEST_MODE=true`) para desarrollo
- ✅ Cambia a producción solo cuando estés listo
- ✅ Mantén credenciales de producción separadas

### Desarrollo
- ✅ Usa `npm run dev` para auto-reload
- ✅ Revisa logs constantemente
- ✅ Ejecuta tests antes de commitear
- ✅ Documenta cambios importantes

### Testing
- ✅ Prueba localmente primero
- ✅ Usa tarjetas de prueba de ePayco
- ✅ Verifica webhooks funcionan
- ✅ Haz un pago real pequeño antes de lanzar

### Despliegue
- ✅ Despliega primero a staging
- ✅ Monitorea logs después del deploy
- ✅ Ten un plan de rollback
- ✅ Comunica a usuarios sobre mantenimiento

---

## 📞 Contacto y Soporte

### Issues del Proyecto
- GitHub Issues: [tu-repo]/issues
- Documentación: Carpeta `docs/`

### Soporte de Plataformas
- **Telegram:** https://telegram.org/support
- **Firebase:** https://firebase.google.com/support
- **ePayco:** https://epayco.co/contacto
- **Railway:** https://railway.app/help

---

**¡Bienvenido al proyecto! 🎉**

Comienza con esta guía y avanza a tu ritmo. La documentación completa está disponible en la carpeta `docs/` cuando la necesites.

**Happy coding!** 💻
