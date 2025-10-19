# Investigación de Neynar - Templates y Recursos

## 📚 Resumen Ejecutivo

Neynar es una plataforma que facilita la construcción de aplicaciones sobre **Farcaster** (un protocolo social descentralizado). Ofrece SDKs, componentes React listos para usar, y APIs completas para crear redes sociales.

---

## 🎯 Recursos Disponibles

### 1. SDKs Oficiales

#### Frontend: `@neynar/react` v1.2.5
**Instalación:**
```bash
npm install @neynar/react
```

**Componentes React disponibles:**

| Componente | Descripción | Uso |
|------------|-------------|-----|
| `NeynarCastCard` | Muestra un post individual (cast) | Feed de posts |
| `NeynarFeedList` | Lista de posts con filtros | Feed principal |
| `NeynarAuthButton` | Botón de login con Farcaster | Autenticación |
| `NeynarUserDropdown` | Buscador de usuarios | Menciones, búsqueda |
| `NeynarConversationList` | Hilos de conversación | Comentarios |
| `NeynarFrameCard` | Frames de Farcaster | Contenido interactivo |

#### Backend: `@neynar/nodejs-sdk` v3.34.0
**Instalación:**
```bash
npm install @neynar/nodejs-sdk
```

**Funcionalidades:**
- Feed API (obtener posts)
- User Profiles (perfiles de usuarios)
- Authentication (validación de usuarios)
- Webhooks (eventos en tiempo real)
- Like & Recast (interacciones)
- Search (búsqueda de usuarios/contenido)

---

## 💡 Implementación para PNPtv

### Enfoque Híbrido Recomendado

**Opción 1: Usar Neynar como complemento (RECOMENDADO)**
- Sistema principal: Base de datos propia (Firebase) para posts de PNPtv
- Neynar: Autenticación Web3 opcional y cross-posting a Farcaster
- Ventaja: Control total de datos, opción de descentralización

**Opción 2: Usar solo Neynar**
- Todo basado en Farcaster
- Ventaja: Rápido de implementar
- Desventaja: Depende totalmente de Farcaster

**DECISIÓN RECOMENDADA:** Opción 1 - Sistema híbrido

---

## 📝 Ejemplos de Código

### 1. NeynarFeedList - Feed Principal

```typescript
// components/feed/MainFeed.tsx
import { NeynarFeedList } from "@neynar/react";

export function MainFeed({ userId }: { userId: string }) {
  return (
    <div className="feed-container">
      <h2>Feed Principal</h2>

      {/* Feed de usuarios específicos */}
      <NeynarFeedList
        feedType="filter"
        filterType="fids"
        fids={userId}
        viewerFid={Number(userId)}
        withRecasts={true}
        limit={20}
      />
    </div>
  );
}
```

### 2. NeynarCastCard - Post Individual

```typescript
// components/posts/PostCard.tsx
import { NeynarCastCard } from "@neynar/react";

export function PostCard({
  postUrl,
  viewerFid
}: {
  postUrl: string;
  viewerFid: number;
}) {
  return (
    <NeynarCastCard
      type="url"
      identifier={postUrl}
      viewerFid={viewerFid}
    />
  );
}
```

### 3. Backend - Fetch Feed API

```typescript
// lib/neynar-server.ts
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { FeedType, FilterType } from "@neynar/nodejs-sdk/build/api";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

const neynarClient = new NeynarAPIClient(config);

// Obtener feed de un usuario
export async function getUserFeed(fid: number, limit: number = 20) {
  try {
    const feed = await neynarClient.fetchFeed({
      feedType: FeedType.Following,
      fid,
      withRecasts: true,
      limit,
      viewerFid: fid
    });

    return feed;
  } catch (error) {
    console.error('Error fetching feed:', error);
    throw error;
  }
}

// Obtener feed por filtros
export async function getFilteredFeed(fids: string[], limit: number = 20) {
  try {
    const feed = await neynarClient.fetchFeed({
      feedType: FeedType.Filter,
      filterType: FilterType.Fids,
      fids: fids.join(','),
      limit
    });

    return feed;
  } catch (error) {
    console.error('Error fetching filtered feed:', error);
    throw error;
  }
}

// Obtener trending global
export async function getTrendingFeed(limit: number = 20) {
  try {
    const feed = await neynarClient.fetchFeed({
      feedType: FeedType.Filter,
      filterType: FilterType.GlobalTrending,
      limit
    });

    return feed;
  } catch (error) {
    console.error('Error fetching trending feed:', error);
    throw error;
  }
}
```

### 4. Authentication - Sign In With Neynar (SIWN)

```typescript
// components/auth/NeynarAuth.tsx
import { NeynarAuthButton } from "@neynar/react";

export function NeynarAuth() {
  const handleSuccess = (user: any) => {
    console.log('Authenticated user:', user);
    // Guardar en base de datos
    // Crear sesión
  };

  return (
    <div className="auth-container">
      <h2>Login con Farcaster (Web3)</h2>

      <NeynarAuthButton
        label="Sign in with Farcaster"
        variant="farcaster"
        onSuccess={handleSuccess}
      />
    </div>
  );
}
```

### 5. User Profile - Obtener datos de usuario

```typescript
// lib/neynar-users.ts
export async function getUserProfile(fid: number) {
  try {
    const user = await neynarClient.fetchBulkUsers([fid]);

    return {
      fid: user.users[0].fid,
      username: user.users[0].username,
      displayName: user.users[0].display_name,
      pfp: user.users[0].pfp_url,
      bio: user.users[0].profile.bio.text,
      followers: user.users[0].follower_count,
      following: user.users[0].following_count,
      verifications: user.users[0].verifications
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}
```

---

## 🏗️ Arquitectura Propuesta para PNPtv

### Sistema Híbrido: Firebase + Neynar

```
┌─────────────────────────────────────────────────────────┐
│                   PNPtv Web App                         │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Sistema Principal   │        │   Neynar (Opcional)  │
│  (Firebase/Firestore)│        │   (Farcaster)        │
└──────────────────────┘        └──────────────────────┘
           │                               │
    ┌──────┴──────┐                 ┌──────┴──────┐
    │             │                 │             │
    ▼             ▼                 ▼             ▼
┌────────┐  ┌────────┐      ┌────────┐  ┌────────┐
│ Posts  │  │ Users  │      │  Feed  │  │  Auth  │
│ PNPtv  │  │ PNPtv  │      │ Web3   │  │  Web3  │
└────────┘  └────────┘      └────────┘  └────────┘
```

### Flujo de Datos:

1. **Posts en PNPtv (Firebase):**
   - Usuario crea post → Se guarda en Firestore
   - Opcionalmente → Cross-post a Farcaster vía Neynar

2. **Autenticación:**
   - Principal: Telegram Login Widget
   - Opcional: Sign In With Neynar (SIWN) para usuarios Web3

3. **Feed:**
   - Feed principal: Posts de Firebase (PNPtv)
   - Feed Web3: Posts de Farcaster vía Neynar (opcional)

---

## 📦 Estructura de Firestore (Extendida con Neynar)

```javascript
// Colección: users
{
  userId: string,                    // ID de Telegram
  username: string,
  displayName: string,
  photoUrl: string,
  bio: string,
  location: { text: string, coordinates: {...} },

  // Integración Neynar (opcional)
  farcaster: {
    fid: number,                     // Farcaster ID
    username: string,
    signer: string,
    connected: boolean,
    lastSync: timestamp
  },

  socialStats: {
    posts: number,
    followers: number,
    following: number
  },

  membership: {
    tier: "free" | "prime" | "premium",
    expiresAt: timestamp
  }
}

// Colección: posts
{
  postId: string,
  userId: string,
  content: string,
  mediaUrls: string[],
  location: {...},
  likes: number,
  comments: number,
  createdAt: timestamp,
  visibility: "public" | "prime" | "nearby",

  // Cross-posting Farcaster (opcional)
  farcaster: {
    castHash: string,                // Hash del cast en Farcaster
    url: string,
    synced: boolean,
    syncedAt: timestamp
  }
}
```

---

## 🔧 Setup e Instalación

### 1. Instalar Dependencias

```bash
# React components
npm install @neynar/react

# Backend SDK
npm install @neynar/nodejs-sdk

# Types
npm install --save-dev @types/node
```

### 2. Configurar Variables de Entorno

```env
# .env
NEYNAR_API_KEY=your_neynar_api_key_here
NEYNAR_CLIENT_ID=your_client_id_here
```

### 3. Obtener API Key

1. Ir a: https://neynar.com/
2. Crear cuenta
3. Crear un proyecto
4. Copiar API Key desde el dashboard

---

## 🚀 Starter Kit Oficial

**GitHub:** https://github.com/neynarxyz/nsk

El Neynar Starter Kit (NSK) incluye:
- Setup básico con Next.js
- Autenticación con Farcaster
- Ejemplos de componentes
- Configuración de webhooks
- Templates de feed y perfiles

**Clonar e instalar:**
```bash
git clone https://github.com/neynarxyz/nsk.git
cd nsk
npm install
npm run dev
```

---

## 📚 Recursos Adicionales

### Documentación Oficial
- **Docs principales:** https://docs.neynar.com/
- **API Reference:** https://docs.neynar.com/reference/
- **React SDK:** https://github.com/neynarxyz/react
- **Node.js SDK:** https://github.com/neynarxyz/nodejs-sdk

### Tutoriales
- **Crear Farcaster Client:** https://docs.neynar.com/docs/how-to-create-a-client
- **Feed API:** https://docs.neynar.com/docs/how-to-use-the-feed-api-1
- **SIWN React:** https://docs.neynar.com/docs/react-implementation
- **Webhooks:** https://docs.neynar.com/docs/how-to-create-webhooks-on-the-go-using-the-sdk

### Storybook
- Probar componentes: https://react.neynar.com/storybook (componentes interactivos)

---

## ✅ Recomendaciones para PNPtv

### ¿Qué usar de Neynar?

| Funcionalidad | Usar Neynar | Usar Firebase | Razón |
|---------------|-------------|---------------|--------|
| **Posts principales** | ❌ | ✅ | Control total de datos |
| **Autenticación Telegram** | ❌ | ✅ | Ya implementado |
| **Autenticación Web3** | ✅ | ❌ | Experiencia de Neynar superior |
| **Feed Nearby** | ❌ | ✅ | Requiere geolocalización custom |
| **Feed PRIME** | ❌ | ✅ | Contenido exclusivo de PNPtv |
| **Cross-posting Web3** | ✅ | ❌ | Publicar también en Farcaster |
| **Descubrimiento social** | ✅ | ❌ | Usuarios de Farcaster |

### Implementación Gradual (Recomendada)

**Fase 1 - MVP (Sin Neynar):**
1. Implementar sistema básico con Firebase
2. Telegram Login Widget
3. Feed de posts propios
4. Perfiles de usuario
5. Daimo Pay para suscripciones

**Fase 2 - Integración Web3 (Con Neynar):**
1. Agregar SIWN como opción de login
2. Cross-posting a Farcaster (opcional)
3. Feed híbrido (PNPtv + Farcaster)
4. Perfil Web3 vinculado

**Ventajas de este enfoque:**
- ✅ No dependes de Farcaster para lanzar
- ✅ Mantienes control de tus datos
- ✅ Puedes agregar Web3 cuando quieras
- ✅ Mejor para usuarios no-crypto

---

## 🎯 Decisión Arquitectónica

### Propuesta Final

**Sistema Principal:** Firebase + Telegram Login
**Web3 Opcional:** Neynar (SIWN + cross-posting)

**Beneficios:**
1. Lanzamiento rápido sin depender de Farcaster
2. Control total de datos y contenido
3. Opción de Web3 para usuarios avanzados
4. Mejor experiencia para usuarios de Telegram
5. Monetización con Daimo Pay independiente de Farcaster

**¿Te parece bien este enfoque?**

---

## 📊 Comparación de Opciones

| Aspecto | Solo Firebase | Solo Neynar | Híbrido (Recomendado) |
|---------|---------------|-------------|----------------------|
| **Tiempo de dev** | ⭐⭐⭐ Medio | ⭐⭐⭐⭐ Rápido | ⭐⭐ Más lento |
| **Control de datos** | ⭐⭐⭐⭐⭐ Total | ⭐⭐ Limitado | ⭐⭐⭐⭐ Alto |
| **Web3 features** | ❌ No | ⭐⭐⭐⭐⭐ Sí | ⭐⭐⭐⭐ Sí |
| **Escalabilidad** | ⭐⭐⭐⭐ Alta | ⭐⭐⭐ Media | ⭐⭐⭐⭐ Alta |
| **Costo** | ⭐⭐⭐ Bajo-Medio | ⭐⭐ Medio | ⭐⭐ Medio |
| **Flexibilidad** | ⭐⭐⭐⭐⭐ Total | ⭐⭐ Limitada | ⭐⭐⭐⭐ Alta |

---

## 🔜 Próximos Pasos

1. **Decidir enfoque:** Solo Firebase, Solo Neynar, o Híbrido
2. **Si Híbrido (recomendado):**
   - Empezar con MVP sin Neynar
   - Agregar Neynar en Fase 2
3. **Si incluye Neynar desde el inicio:**
   - Crear cuenta en Neynar.com
   - Obtener API Key
   - Instalar SDKs
   - Probar componentes en local

**¿Qué prefieres? Responde:**
- **A:** MVP sin Neynar (más rápido, menos dependencias)
- **B:** Con Neynar desde el inicio (más features Web3)
- **C:** Híbrido gradual (recomendado)
