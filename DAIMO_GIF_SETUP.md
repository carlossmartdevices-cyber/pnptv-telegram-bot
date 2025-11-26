# 🎬 Cómo Agregar GIF al Menú de Daimo Pay

## ✅ Cambios Aplicados

### Texto Mejorado con Emojis
Se actualizó el mensaje de planes de Daimo con más emojis para hacerlo más atractivo:

**Inglés:**
```
💎 Subscription Plans - Daimo Pay

🌟 Become a member of PNPtv PRIME and enjoy the best amateur content — Latino men smoking and slamming on Telegram.

🔥 What you'll get:

🎬 Dozens of full-length adult videos featuring Santino and his boys
👥 Access to our exclusive Telegram members group
📍 Connect with other members in your area using our geolocation tool

💰 Pay with USDC (stablecoin) from:
✅ Coinbase, Binance, exchanges
✅ Venmo, Cash App, Zelle
✅ Revolut, Wise
✅ Any crypto wallet

🔒 Secure blockchain payment
⚡ Instant automatic activation
🌐 Ultra-low fees (Base Network)
```

**Español:** (Versión equivalente con todos los emojis)

---

## 🎥 Agregar GIF al Menú

### Paso 1: Consigue la URL del GIF

Puedes usar GIFs de:
- **Giphy**: https://giphy.com (Copia el enlace directo del GIF)
- **Tenor**: https://tenor.com
- **Tu propio servidor**: Sube un GIF a tu hosting
- **Telegram File ID**: Si ya enviaste el GIF en Telegram, usa el file_id

### Paso 2: Editar el Código

En el archivo: `/root/bot 1/src/bot/handlers/daimoPayHandler.js`

**Busca estas líneas (alrededor de la línea 115):**
```javascript
// Send GIF/Animation first (optional - you can set a GIF URL here)
const gifUrl = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXN5bWJ5cDN5dGN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cA/giphy.gif"; // Replace with your GIF URL

// Uncomment the next 3 lines to send a GIF before the plans
// await ctx.replyWithAnimation(gifUrl, {
//   caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
// });
```

**Cambia a:**
```javascript
// Send GIF/Animation first
const gifUrl = "TU_URL_DE_GIF_AQUI"; // Pega la URL de tu GIF

await ctx.replyWithAnimation(gifUrl, {
  caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
});
```

### Paso 3: Desplegar

```bash
cp /root/bot\ 1/src/bot/handlers/daimoPayHandler.js /var/www/telegram-bot/src/bot/handlers/daimoPayHandler.js
pm2 restart pnptv-bot
```

---

## 📝 Ejemplos de URLs de GIF

### Opción 1: Usar Giphy
1. Busca tu GIF en https://giphy.com
2. Click derecho en el GIF → "Copy Link"
3. Ejemplo: `https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif`

### Opción 2: Usar File ID de Telegram
Si ya tienes un GIF en Telegram:
```javascript
const gifFileId = "CgACAgQAAxkBAAIC..."; // File ID del GIF
await ctx.replyWithAnimation(gifFileId, {
  caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
});
```

### Opción 3: Subir tu propio GIF
```javascript
// Usando un archivo local
await ctx.replyWithAnimation({ source: '/path/to/your/animation.gif' }, {
  caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
});
```

---

## ✨ Resultado Final

Cuando el usuario acceda al menú de Daimo:
1. **Primero**: Se envía el GIF con caption "💎 ¡Bienvenido a PNPtv PRIME!"
2. **Después**: Se envía el mensaje de texto con todos los planes y botones

---

## 🔧 Personalización Adicional

### Cambiar el Caption del GIF
Edita esta línea:
```javascript
caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
```

### Agregar más configuraciones
```javascript
await ctx.replyWithAnimation(gifUrl, {
  caption: "💎 ¡Bienvenido a PNPtv PRIME!",
  parse_mode: "Markdown",
  duration: 5,  // Duración en segundos (opcional)
  width: 500,   // Ancho (opcional)
  height: 500   // Alto (opcional)
});
```

---

## 📍 Ubicación del Código

**Archivo**: `src/bot/handlers/daimoPayHandler.js`
**Función**: `showDaimoPlans(ctx)`
**Líneas**: ~103-120

---

## ⚠️ Notas Importantes

1. El GIF debe ser un archivo `.gif` o `.mp4` válido
2. Telegram tiene un límite de 10MB para GIFs
3. URLs deben ser accesibles públicamente (HTTPS preferido)
4. Si usas File ID, el bot debe haber visto ese archivo antes

---

## 🎯 Estado Actual

- ✅ Texto mejorado con emojis aplicado
- ✅ Código para GIF preparado (comentado)
- ⏳ Pendiente: Agregar URL del GIF y descomentar código
