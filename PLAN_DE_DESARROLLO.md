# Plan de Acción - PNPtv Web App

## 🎯 Objetivo
Desarrollar una aplicación web completa (no Mini App de Telegram) que se pueda usar desde cualquier navegador, con integración opcional de Telegram para autenticación.

---

## 📋 Arquitectura Confirmada

```
Usuario (Navegador Web)
 │
 ▼
[Frontend Web App - React.js + TypeScript]
 │
 ├── Autenticación:
 │   ├── Telegram Login Widget (Principal)
 │   └── Neynar (Web3 opcional - Farcaster)
 │
 ├── [Backend API - Node.js/Express]
 │   ├── Firebase/Firestore (Base de datos actual)
 │   ├── Neynar API (Templates de redes sociales)
 │   ├── Daimo Pay API (Pagos crypto/fiat)
 │   └── Telegram Bot API (Sincronización)
 │
 └── [Hostinger VPS KVM]
     ├── Docker + Nginx
     ├── SSL Certificates
     └── Firewall
```

---

## 🚀 FASE 1: Planificación y Diseño (1-2 semanas)

### ✅ Tareas Completadas
- [x] Revisión del código actual
- [x] Análisis de integraciones existentes (Daimo Pay, Firebase, Telegram Bot)
- [x] Definición de arquitectura técnica

### 📝 Tareas Pendientes

#### 1.1 Investigación de Neynar Templates
**Objetivo:** Explorar y seleccionar templates de Neynar para la red social

**Acciones:**
- [ ] Revisar documentación de Neynar: https://docs.neynar.com/
- [ ] Explorar templates disponibles para redes sociales
- [ ] Identificar componentes reutilizables (feed, posts, perfiles)
- [ ] Planificar integración con Farcaster (opcional)

**Entregables:**
- Documento con templates seleccionados
- Plan de integración de Neynar

#### 1.2 Diseño de Base de Datos Extendida
**Objetivo:** Diseñar esquema para posts, feed, interacciones

**Firestore Collections:**
```javascript
// Colección: posts
{
  postId: string,
  userId: string,
  content: string,
  mediaUrls: string[],
  location: {
    text: string,
    coordinates: { lat: number, lon: number }
  },
  likes: number,
  comments: number,
  createdAt: timestamp,
  visibility: "public" | "prime" | "nearby"
}

// Colección: interactions
{
  userId: string,
  postId: string,
  type: "like" | "comment" | "share",
  createdAt: timestamp
}

// Colección: feed_cache
{
  userId: string,
  feedType: "main" | "nearby" | "prime",
  posts: postId[],
  lastUpdated: timestamp
}

// Extensión de users (ya existente)
{
  // ... campos actuales ...
  farcasterAddress: string (opcional),
  web3Verified: boolean,
  socialStats: {
    posts: number,
    followers: number,
    following: number
  }
}
```

#### 1.3 Arquitectura de Rutas Frontend
**Objetivo:** Definir estructura de páginas de la webapp

**Rutas Principales:**
```
/                       → Landing page (público)
/login                  → Login con Telegram Widget + Neynar
/feed                   → Feed principal (requiere auth)
/nearby                 → Posts cercanos (geolocalización)
/prime                  → Contenido premium (suscriptores)
/live                   → Transmisiones en vivo
/profile/:userId        → Perfil de usuario
/settings               → Configuración de cuenta
/subscribe              → Página de suscripciones (Daimo Pay)
/contact                → Contacto PNP
```

---

## 🚀 FASE 2: Desarrollo del Frontend Base (2 semanas)

### 2.1 Setup Inicial del Proyecto Web
**Stack Tecnológico:**
- Next.js 15 (ya instalado)
- React 19 + TypeScript
- TailwindCSS o ChakraUI para estilos
- React Query para estado del servidor
- Zustand para estado global

**Acciones:**
```bash
# Reorganizar estructura actual
src/
├── webapp/                    # Nueva webapp independiente
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (main)/
│   │   │   ├── feed/
│   │   │   ├── nearby/
│   │   │   ├── prime/
│   │   │   ├── live/
│   │   │   └── profile/
│   │   ├── api/              # API Routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── feed/
│   │   ├── posts/
│   │   ├── profile/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   └── types/
├── bot/                       # Bot de Telegram existente
├── payment-page/              # Mantener o migrar a webapp
└── config/
```

### 2.2 Implementar Telegram Login Widget
**Referencia:** https://core.telegram.org/widgets/login

**Componente de Login:**
```typescript
// components/auth/TelegramLogin.tsx
import { useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function TelegramLogin() {
  useEffect(() => {
    // Cargar script de Telegram Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'YOUR_BOT_USERNAME');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    document.getElementById('telegram-login-container')?.appendChild(script);

    // Función global para manejar respuesta
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      // Enviar al backend para validación
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      const data = await response.json();
      // Guardar token JWT
      localStorage.setItem('authToken', data.token);
    };
  }, []);

  return <div id="telegram-login-container" />;
}
```

### 2.3 Integrar Templates de Neynar
**Acciones:**
- [ ] Instalar SDK de Neynar: `npm install @neynar/nodejs-sdk`
- [ ] Configurar API keys de Neynar
- [ ] Adaptar templates de feed y posts
- [ ] Implementar autenticación opcional con Farcaster

**Componentes de Neynar:**
```typescript
// components/feed/FeedPost.tsx
// Usar template de Neynar para posts
// Adaptar a diseño de PNPtv

// components/profile/ProfileCard.tsx
// Usar template de Neynar para perfiles
```

---

## 🚀 FASE 3: Desarrollo del Backend (2 semanas)

### 3.1 Endpoints de Autenticación

**API Routes a Crear:**
```javascript
// src/webapp/app/api/auth/telegram/route.ts
import crypto from 'crypto';

export async function POST(request: Request) {
  const telegramData = await request.json();

  // 1. Validar hash de Telegram
  const isValid = validateTelegramAuth(telegramData, process.env.TELEGRAM_BOT_TOKEN);

  if (!isValid) {
    return Response.json({ error: 'Invalid authentication' }, { status: 401 });
  }

  // 2. Verificar si usuario existe en bot
  const userExists = await checkUserInBot(telegramData.id);

  if (!userExists) {
    return Response.json({
      error: 'Please start the bot first',
      botUrl: 'https://t.me/YOUR_BOT_USERNAME'
    }, { status: 403 });
  }

  // 3. Crear sesión y JWT
  const token = generateJWT({
    userId: telegramData.id,
    username: telegramData.username
  });

  // 4. Actualizar lastActive en Firestore
  await db.collection('users').doc(telegramData.id.toString()).update({
    lastActive: new Date(),
    lastLoginWeb: new Date()
  });

  return Response.json({
    success: true,
    token,
    user: telegramData
  });
}

function validateTelegramAuth(data: any, botToken: string): boolean {
  const { hash, ...userData } = data;

  const dataCheckString = Object.keys(userData)
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}
```

### 3.2 Endpoints del Feed
```javascript
// src/webapp/app/api/feed/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feedType = searchParams.get('type') || 'main';
  const limit = parseInt(searchParams.get('limit') || '20');
  const lastPostId = searchParams.get('lastPostId');

  // Obtener posts según tipo de feed
  let query = db.collection('posts')
    .where('visibility', '==', feedType)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (lastPostId) {
    const lastDoc = await db.collection('posts').doc(lastPostId).get();
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();
  const posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return Response.json({ posts });
}

// POST crear nuevo post
export async function POST(request: Request) {
  const { content, mediaUrls, location, visibility } = await request.json();
  const userId = getUserIdFromToken(request);

  const newPost = await db.collection('posts').add({
    userId,
    content,
    mediaUrls: mediaUrls || [],
    location,
    likes: 0,
    comments: 0,
    createdAt: new Date(),
    visibility
  });

  return Response.json({ success: true, postId: newPost.id });
}
```

### 3.3 Integración Neynar API
```javascript
// src/webapp/lib/neynar.ts
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

export async function getFarcasterFeed(fid: number) {
  const feed = await client.fetchFeedByFID(fid);
  return feed;
}

export async function publishToFarcaster(userId: string, content: string) {
  // Publicar también en Farcaster si usuario tiene conectado
  const user = await db.collection('users').doc(userId).get();

  if (user.data()?.farcasterAddress) {
    await client.publishCast({
      text: content,
      // ...
    });
  }
}
```

---

## 🚀 FASE 4: Funcionalidades Principales (2 semanas)

### 4.1 Sistema de Posts y Feed
**Componentes a Crear:**
- [ ] `PostComposer.tsx` - Crear posts con media
- [ ] `FeedList.tsx` - Lista de posts con scroll infinito
- [ ] `PostCard.tsx` - Card individual de post
- [ ] `LikeButton.tsx` - Sistema de likes
- [ ] `CommentSection.tsx` - Comentarios

### 4.2 Sistema de Perfiles
**Componentes:**
- [ ] `ProfileHeader.tsx`
- [ ] `ProfileStats.tsx`
- [ ] `ProfilePosts.tsx`
- [ ] `FollowButton.tsx`

### 4.3 Sección Nearby (Geolocalización)
**Tecnologías:**
- Geolocation API del navegador
- Firestore GeoQueries
- Mapbox o Google Maps

```typescript
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      }
    );
  }, []);

  return location;
}
```

### 4.4 Integración Daimo Pay
**Reutilizar código existente:**
- Migrar `src/payment-page` a la nueva webapp
- Adaptar flujo de suscripciones
- Integrar en página `/subscribe`

---

## 🚀 FASE 5: Deployment en Hostinger VPS (1 semana)

### 5.1 Configuración del Servidor
```bash
# SSH a Hostinger VPS
ssh root@your-vps-ip

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose

# Instalar Nginx
apt install nginx

# Configurar firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 5.2 Dockerfile para la App
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 5.3 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  webapp:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - FIREBASE_CREDENTIALS=${FIREBASE_CREDENTIALS}
      - NEYNAR_API_KEY=${NEYNAR_API_KEY}
      - DAIMO_API_KEY=${DAIMO_API_KEY}
    volumes:
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - webapp
```

### 5.4 Configuración Nginx
```nginx
# nginx.conf
server {
    listen 80;
    server_name pnptv.com www.pnptv.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pnptv.com www.pnptv.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://webapp:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.5 SSL con Let's Encrypt
```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx

# Obtener certificado
certbot --nginx -d pnptv.com -d www.pnptv.com

# Auto-renovación
certbot renew --dry-run
```

---

## 📊 CRONOGRAMA DETALLADO

| Fase | Duración | Semanas | Entregables |
|------|----------|---------|-------------|
| **Fase 1: Planificación** | 1-2 semanas | S1-S2 | Arquitectura, diseño DB, plan Neynar |
| **Fase 2: Frontend Base** | 2 semanas | S3-S4 | Login, estructura, templates Neynar |
| **Fase 3: Backend** | 2 semanas | S5-S6 | APIs auth, feed, posts, Neynar |
| **Fase 4: Funcionalidades** | 2 semanas | S7-S8 | Posts, perfiles, nearby, Daimo Pay |
| **Fase 5: Deployment** | 1 semana | S9 | VPS configurado, app en producción |
| **Fase 6: Testing** | 1 semana | S10 | Tests, optimización, fixes |

**Total: 8-10 semanas**

---

## 🎯 Próximos Pasos Inmediatos

### 1. Investigar Templates de Neynar (AHORA)
```bash
# Crear cuenta en Neynar
# https://neynar.com/

# Revisar documentación
# https://docs.neynar.com/

# Explorar templates disponibles
```

### 2. Reorganizar Estructura del Proyecto
```bash
# Crear nueva estructura webapp
mkdir -p src/webapp/app
mkdir -p src/webapp/components
mkdir -p src/webapp/lib

# Migrar payment-page a webapp
```

### 3. Configurar Variables de Entorno
```env
# Agregar a .env
NEYNAR_API_KEY=tu_api_key
WEBAPP_URL=https://pnptv.com
```

---

## 📚 Recursos Clave

- **Telegram Login Widget:** https://core.telegram.org/widgets/login
- **Neynar Docs:** https://docs.neynar.com/
- **Daimo Pay Docs:** https://docs.daimo.com/
- **Next.js 15:** https://nextjs.org/docs
- **Firestore Queries:** https://firebase.google.com/docs/firestore
- **Hostinger VPS:** Panel de control en Hostinger

---

## ✅ Checklist de Inicio

- [ ] Crear cuenta en Neynar y obtener API key
- [ ] Explorar templates de Neynar para redes sociales
- [ ] Decidir sobre diseño UI (TailwindCSS recomendado)
- [ ] Configurar dominio en Hostinger (pnptv.com)
- [ ] Planificar primer sprint de desarrollo

---

**¿Por dónde empezamos? Te sugiero:**

1. **Primero:** Investigar templates de Neynar y decidir cuáles usar
2. **Segundo:** Reorganizar estructura del proyecto
3. **Tercero:** Implementar Telegram Login Widget básico

¿Quieres que empiece con alguna fase específica?
