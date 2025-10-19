# 🚀 Guía de Instalación - PNPtv WebApp

## Requisitos Previos

- ✅ Node.js 18+ instalado
- ✅ npm 9+ instalado
- ✅ Git instalado
- ✅ Telegram Bot ya configurado (actual)
- ✅ Firebase/Firestore funcionando (actual)
- ✅ Cuenta Heroku/Hostinger para deployment

---

## 📦 Instalación Local

### Paso 1: Instalar Dependencias del Proyecto Principal

```bash
# En el directorio raíz del proyecto
cd C:\Users\carlo\Documents\Bots

# Instalar/actualizar dependencias
npm install
```

Esto instalará las nuevas dependencias agregadas:
- `zustand` (state management)
- `date-fns` (manejo de fechas)
- `jsonwebtoken` (JWT para auth)
- `tailwindcss` (estilos)
- `autoprefixer` + `postcss` (CSS processing)

### Paso 2: Instalar Dependencias de la WebApp

```bash
# Entrar al directorio de la webapp
cd src/webapp

# Instalar dependencias específicas de la webapp
npm install
```

### Paso 3: Configurar Variables de Entorno

#### Opción A: Archivo .env en raíz (Compartido)

Agregar estas nuevas variables al `.env` existente en la raíz:

```env
# JWT para WebApp
JWT_SECRET=tu_secret_aqui_minimo_32_caracteres_aleatorios

# WebApp URL
WEBAPP_URL=http://localhost:3001
NEXT_PUBLIC_WEBAPP_URL=http://localhost:3001

# Bot Username (para Telegram Widget)
TELEGRAM_BOT_USERNAME=PNPtvBot  # Reemplaza con tu bot
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=PNPtvBot

# Asegurate de tener estas ya configuradas:
BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
NEXT_PUBLIC_BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com

TELEGRAM_BOT_TOKEN=tu_token_actual
FIREBASE_CREDENTIALS=tu_firebase_actual

DAIMO_API_KEY=tu_daimo_key_actual
NEXT_PUBLIC_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
NEXT_PUBLIC_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
```

#### Opción B: Archivo .env.local en src/webapp (Solo webapp)

```bash
# Crear archivo de variables locales
cd src/webapp
cp .env.example .env.local

# Editar .env.local con tus credenciales
```

### Paso 4: Generar JWT Secret Fuerte

```bash
# En Node.js console o terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y úsalo como `JWT_SECRET` en tu `.env`.

---

## 🏃 Ejecutar en Desarrollo

### Opción 1: Solo la WebApp

```bash
# Desde la raíz del proyecto
npm run dev:webapp

# O desde src/webapp
cd src/webapp
npm run dev
```

La webapp estará disponible en: **http://localhost:3001**

### Opción 2: Bot + WebApp juntos

**Terminal 1 - Bot de Telegram:**
```bash
npm run dev
```

**Terminal 2 - WebApp:**
```bash
npm run dev:webapp
```

---

## 🏗️ Build para Producción

### Build todo (Bot + WebApp)

```bash
npm run build
```

### Build solo WebApp

```bash
npm run build:webapp

# O desde src/webapp
cd src/webapp
npm run build
```

### Ejecutar build de producción localmente

```bash
npm run start:webapp

# O desde src/webapp
cd src/webapp
npm start
```

---

## 🔍 Verificar Instalación

### 1. Verificar que Next.js funciona

```bash
cd src/webapp
npm run dev
```

Abre: http://localhost:3001

Deberías ver la landing page con:
- Logo 💎 PNPtv
- Hero section "Connect, Share, and Discover"
- 6 feature cards
- Botones "Start Exploring" y "Open in Telegram"

### 2. Verificar página de login

Visita: http://localhost:3001/login

Deberías ver:
- Logo de PNPtv
- "Sign in with Telegram" title
- Telegram Login Widget (botón azul de Telegram)
- 3 benefit cards (Secure, Fast, No Passwords)

### 3. Verificar que el widget de Telegram carga

Inspecciona la consola del navegador (F12). No debería haber errores.

El botón de Telegram debería verse así:
```
[Login with Telegram logo]
```

---

## 🐛 Troubleshooting

### Error: "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# En webapp también
cd src/webapp
rm -rf node_modules package-lock.json
npm install
```

### Error: "Cannot find module '@/...'

Verificar que `tsconfig.json` en `src/webapp` tiene los paths correctos:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

### Error: Telegram Widget no carga

1. Verifica que `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` esté configurado
2. Verifica que el bot existe en Telegram
3. Abre la consola del navegador para ver errores de JavaScript
4. Verifica que el script de Telegram se carga:
   ```
   https://telegram.org/js/telegram-widget.js?22
   ```

### Error: "Invalid hook call"

Esto sucede si:
1. Tienes múltiples versiones de React instaladas
2. Componentes client/server mezclados incorrectamente

Solución:
```bash
# Asegurar una sola versión de React
npm dedupe react react-dom

cd src/webapp
npm dedupe react react-dom
```

### Error: Tailwind styles no aplican

1. Verificar que `globals.css` se importa en `layout.tsx`
2. Verificar que `tailwind.config.js` apunta a los archivos correctos
3. Reiniciar el servidor de desarrollo

---

## ✅ Checklist de Instalación

- [ ] Node.js 18+ instalado
- [ ] Dependencias del proyecto principal instaladas (`npm install`)
- [ ] Dependencias de webapp instaladas (`cd src/webapp && npm install`)
- [ ] Variables de entorno configuradas (`.env` o `.env.local`)
- [ ] `JWT_SECRET` generado y configurado
- [ ] `TELEGRAM_BOT_USERNAME` configurado
- [ ] WebApp ejecutándose en http://localhost:3001
- [ ] Landing page visible
- [ ] Login page visible
- [ ] Telegram Widget cargando correctamente
- [ ] Sin errores en consola del navegador

---

## 📝 Próximos Pasos Después de Instalar

### 1. Crear Endpoints de Autenticación Backend

Necesitas crear estos archivos:

**a) Validación de Telegram**
```
src/webapp/app/api/auth/telegram/route.ts
```

**b) Obtener usuario actual**
```
src/webapp/app/api/auth/me/route.ts
```

**c) Utilidades JWT**
```
src/webapp/lib/jwt.ts
```

### 2. Probar el Flujo de Login

1. Ir a http://localhost:3001/login
2. Click en "Login with Telegram"
3. Autorizar en Telegram
4. Verificar que redirige a `/feed` (cuando esté implementado)

### 3. Implementar Sistema de Posts

Ver `PROGRESO_WEBAPP.md` para los siguientes pasos.

---

## 🌍 Deployment en Producción

### Opción 1: Hostinger VPS (Recomendado)

Ver archivo `PLAN_DE_DESARROLLO.md` sección "Fase 5 - Deployment"

Requisitos:
- Docker instalado
- Nginx instalado
- SSL con Let's Encrypt
- Variables de entorno en producción

### Opción 2: Heroku (Actual para el bot)

```bash
# Agregar al Procfile existente
web: cd src/webapp && npm start
worker: node src/bot/index.js
```

### Opción 3: Vercel (Solo para webapp)

```bash
# Desde src/webapp
npx vercel
```

Configurar variables de entorno en Vercel dashboard.

---

## 📚 Recursos Adicionales

- **Plan de desarrollo completo:** `PLAN_DE_DESARROLLO.md`
- **Progreso actual:** `PROGRESO_WEBAPP.md`
- **Investigación Neynar:** `NEYNAR_RESEARCH.md`
- **Documentación webapp:** `src/webapp/README.md`
- **Next.js Docs:** https://nextjs.org/docs
- **Telegram Login Widget:** https://core.telegram.org/widgets/login

---

## 🆘 Obtener Ayuda

Si encuentras problemas:

1. Verifica la consola del navegador (F12) para errores de JavaScript
2. Verifica la terminal para errores de Node.js
3. Revisa que todas las variables de entorno estén configuradas
4. Verifica que el bot de Telegram esté funcionando
5. Revisa los logs de Firebase/Firestore

---

**Última actualización:** 2025-10-18
**Versión:** 1.0.0
**Estado:** 🟢 Listo para desarrollo
