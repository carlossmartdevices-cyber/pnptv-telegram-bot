# 🚀 Pasos Rápidos - Testing de Autenticación

## ✅ Completado

1. ✅ JWT Secret generado y configurado
2. ✅ Variables de entorno agregadas al `.env`
3. ✅ Instalación de dependencias en progreso...

---

## 📝 IMPORTANTE: Username del Bot

He configurado `TELEGRAM_BOT_USERNAME=PNPtvBot` en el `.env`.

**¿Este es el username correcto de tu bot?**

Si NO es correcto:
1. Abre Telegram
2. Busca tu bot
3. El username aparece como `@TuBotUsername`
4. Edita `.env` y cambia `PNPtvBot` por tu username real (sin el @)

---

## 🔄 Próximos Pasos

### 1. Esperar que termine la instalación (en progreso)

### 2. Ejecutar la webapp
```bash
cd src/webapp
npm run dev
```

### 3. Abrir en navegador
http://localhost:3001

### 4. Probar Landing Page
- Debe mostrar logo 💎 PNPtv
- Títulos y features visibles
- Sin errores en consola (F12)

### 5. Ir a Login
Click en "Get Started" o visitar: http://localhost:3001/login

### 6. Probar Login con Telegram

**ANTES de hacer click en el botón:**
- Asegúrate de tener Telegram abierto (Desktop o Web)
- Asegúrate de haber iniciado tu bot (`/start`)
- Completa el onboarding si no lo has hecho

**Hacer click en "Log in with Telegram":**
- Se abrirá popup de Telegram
- Click en "Accept"
- Popup se cierra
- Consola muestra: "Authentication successful!"
- Redirige a `/feed` (404 es normal por ahora)

### 7. Verificar Autenticación

Abre DevTools (F12) → Application → Local Storage:
- `authToken`: debe tener un token JWT
- `user`: debe tener tus datos

En Console ejecuta:
```javascript
const token = localStorage.getItem('authToken')
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => console.log(data))
```

Debe retornar tus datos de usuario.

---

## 🐛 Troubleshooting Rápido

### Error: "User not found"
→ No has iniciado el bot en Telegram
→ Solución: Abre Telegram → busca tu bot → `/start`

### Error: Widget de Telegram no carga
→ Username incorrecto en `.env`
→ Verifica `TELEGRAM_BOT_USERNAME` en el `.env`

### Error: "Invalid authentication hash"
→ `TELEGRAM_BOT_TOKEN` incorrecto
→ Verifica en el `.env`

### Puerto 3001 ocupado
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

# O usa otro puerto
npm run dev -- -p 3002
```

---

## 📚 Documentación Completa

Para tests detallados ver: `TESTING.md`
- 8 tests completos
- Debugging avanzado
- Todos los escenarios

---

## ✨ Si Todo Funciona

Verás:
✅ Landing page perfecta
✅ Login page con widget de Telegram
✅ Login exitoso
✅ Token guardado
✅ `/api/auth/me` retorna datos

**¡Sistema de autenticación funcionando!** 🎉

Siguiente paso: Implementar Feed y Posts

---

**Estado Actual:** Instalando dependencias...
**Siguiente:** Ejecutar webapp y probar
