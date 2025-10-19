import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let app: App
let db: Firestore

/**
 * Initialize Firebase Admin SDK for webapp
 * Reuses existing initialization if available
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    // Already initialized (probably by the bot)
    app = getApps()[0]
    db = getFirestore(app)
    return { app, db }
  }

  // Initialize new instance
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase configuration. Check environment variables.')
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })

  db = getFirestore(app)

  console.log('Firebase initialized for webapp')

  return { app, db }
}

// Export singleton instances
export function getFirebaseAdmin() {
  if (!app || !db) {
    return initializeFirebase()
  }
  return { app, db }
}

export { db, app }
