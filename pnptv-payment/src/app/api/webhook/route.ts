import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin SDK only if credentials are available
let firebaseInitialized = false;
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    firebaseInitialized = true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const verifySignature = (payload: string, signature: string | null) => {
  if (!signature || !process.env.WEBHOOK_SECRET) return false;
  
  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
};

const rateLimiter = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record) {
    rateLimiter.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimiter.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (record.count >= MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
};

export async function POST(req: NextRequest) {
  try {
    // Check Firebase initialization
    if (!firebaseInitialized) {
      console.warn('Firebase not initialized - webhook processing skipped');
      return new Response(JSON.stringify({
        success: false,
        error: 'Service not configured'
      }), { status: 503 });
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Too many requests'
      }), { status: 429 });
    }

    // Verify webhook signature
    const signature = req.headers.get('x-daimo-signature');
    const body = await req.text();
    
    if (!verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid signature'
      }), { status: 401 });
    }

    const data = JSON.parse(body);
    
    // Validate required fields
    const { userId, amount, status, transactionId } = data;
    
    if (!userId || !amount || !status || !transactionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), { status: 400 });
    }

    // Validate amount format and range
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid amount'
      }), { status: 400 });
    }

    // Update subscription in Firestore with additional metadata
    const db = admin.firestore();
    await db.collection('subscriptions').doc(userId).set({
      amount: numericAmount,
      status,
      transactionId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        processingTime: Date.now(),
        environment: process.env.NODE_ENV
      }
    }, { merge: true });

    // Log successful transaction
    console.log(`Successfully processed payment for user ${userId}, transaction ${transactionId}`);

    return new Response(JSON.stringify({
      success: true,
      transactionId
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
}