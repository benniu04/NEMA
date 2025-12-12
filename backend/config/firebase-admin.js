import admin from 'firebase-admin';
import { ENV_VARS } from './envVars.js';
import logger from './logger.js';

let firebaseAdmin = null;

/**
 * Initialize Firebase Admin SDK
 * This is used to verify Firebase tokens from the frontend
 */
export const initializeFirebaseAdmin = () => {
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
        }),
      });
      logger.info('✅ Firebase Admin initialized successfully');
    } else {
      logger.warn('⚠️  Firebase Admin not initialized - missing credentials (OAuth will not work)');
      return null;
    }

    return firebaseAdmin;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Admin:', error.message);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} Decoded token with user info
 */
export const verifyFirebaseToken = async (idToken) => {
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
