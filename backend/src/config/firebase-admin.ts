import admin, { ServiceAccount } from 'firebase-admin';
import { ENV_VARS } from './envVars.js';
import logger from './logger.js';

interface FirebaseTokenInfo {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  provider: string;
}

let firebaseAdmin: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * This is used to verify Firebase tokens from the frontend
 */
export const initializeFirebaseAdmin = (): admin.app.App | null => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.app();
      logger.info('Firebase Admin already initialized');
      return firebaseAdmin;
    }

    // Initialize with service account credentials from environment variables
    if (ENV_VARS.FIREBASE_PROJECT_ID && ENV_VARS.FIREBASE_CLIENT_EMAIL && ENV_VARS.FIREBASE_PRIVATE_KEY) {
      const privateKey = ENV_VARS.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      // Validate private key format
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        throw new Error('Invalid private key format. Key must contain BEGIN/END markers.');
      }
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: ENV_VARS.FIREBASE_PROJECT_ID,
          clientEmail: ENV_VARS.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        } as ServiceAccount),
      });
      logger.info('✅ Firebase Admin initialized successfully');
    } else {
      logger.warn('⚠️  Firebase Admin not initialized - missing credentials (OAuth will not work)');
      return null;
    }

    return firebaseAdmin;
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Failed to initialize Firebase Admin:', err.message);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user info
 */
export const verifyFirebaseToken = async (idToken: string): Promise<FirebaseTokenInfo> => {
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin is not initialized');
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    emailVerified: decodedToken.email_verified,
    name: decodedToken.name,
    picture: decodedToken.picture,
    provider: decodedToken.firebase.sign_in_provider,
  };
};

// Initialize on import
initializeFirebaseAdmin();

export default firebaseAdmin;

