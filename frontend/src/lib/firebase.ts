import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, Auth } from 'firebase/auth';

// Safely loaded from environment variables with valid fallbacks to prevent Vercel SSR build failures
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDNaDUQzmlDvuSbMrI824jVY8le8gJLXRI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ai-chatbot-571b5.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ai-chatbot-571b5',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ai-chatbot-571b5.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '834699301736',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:834699301736:web:cfbd18d3122f1c6177bcdd',
};

// Lazy safe instance references (SSR and Next.js static prerendering safe)
let firebaseAppInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseAppInstance) {
    try {
      firebaseAppInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (err) {
      console.warn('Firebase app initialization skipped during build/SSR:', err);
    }
  }
  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!authInstance) {
    const app = getFirebaseApp();
    if (app) {
      try {
        authInstance = getAuth(app);
      } catch (err) {
        console.warn('Firebase getAuth skipped during build/SSR:', err);
      }
    }
  }
  return authInstance;
}

/**
 * Triggers Google OAuth sign-in popup using Firebase
 */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase authentication is not initialized. Please ensure client-side execution.');
  }

  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0],
    photoURL: user.photoURL,
    idToken,
  };
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (auth) {
    return fbSignOut(auth);
  }
}

export default getFirebaseApp;
