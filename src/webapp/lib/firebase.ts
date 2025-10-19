import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let app: App
let db: Firestore

interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

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

  // Parse Firebase credentials
  let serviceAccount: ServiceAccount

  const rawFirebaseCredentials = process.env.FIREBASE_CREDENTIALS

  if (rawFirebaseCredentials) {
    // Use FIREBASE_CREDENTIALS (production/Heroku)
    try {
      let normalizedCredentials = rawFirebaseCredentials.trim()

      // Remove surrounding quotes
      normalizedCredentials = normalizedCredentials.replace(/^['"]+|['"]+$/g, '')

      // Handle escaped characters
      normalizedCredentials = normalizedCredentials
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')

      // Try to parse JSON
      try {
        serviceAccount = JSON.parse(normalizedCredentials)
      } catch (parseError) {
        // Try with normalized newlines
        const newlineNormalized = normalizedCredentials.replace(/\r?\n/g, '\\n')
        serviceAccount = JSON.parse(newlineNormalized)
      }

      // Ensure private_key has proper newlines
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
      }

      console.log('Using Firebase credentials from FIREBASE_CREDENTIALS env var')
    } catch (error) {
      console.error('Error parsing FIREBASE_CREDENTIALS:', error)
      throw new Error('Invalid FIREBASE_CREDENTIALS format')
    }
  } else {
    // Fallback to individual environment variables or file
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (projectId && clientEmail && privateKey) {
      // Use individual env vars
      serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
      } as ServiceAccount

      console.log('Using Firebase credentials from individual env vars')
    } else {
      throw new Error(
        'Missing Firebase configuration. Set FIREBASE_CREDENTIALS or individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
      )
    }
  }

  // Initialize Firebase
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
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
