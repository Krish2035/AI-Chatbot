import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, Auth } from 'firebase/auth';

// Loaded strictly from environment variables without hardcoded secrets
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Lazy safe instance references (SSR and Next.js static prerendering safe)
let firebaseAppInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  // Never initialize Firebase on the server or during static prerendering
  if (typeof window === 'undefined') return null;
  
  // If no API key is provided in environment variables, skip initialization gracefully
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '') {
    return null;
  }

  if (!firebaseAppInstance) {
    try {
      firebaseAppInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (err) {
      console.warn('Firebase app initialization skipped:', err);
    }
  }
  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '') return null;

  if (!authInstance) {
    const app = getFirebaseApp();
    if (app) {
      try {
        authInstance = getAuth(app);
      } catch (err) {
        console.warn('Firebase getAuth skipped:', err);
      }
    }
  }
  return authInstance;
}

/**
 * Triggers Google OAuth sign-in popup using Firebase
 */
export async function signInWithGoogle() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '') {
    throw new Error('Google Sign-In is unavailable: NEXT_PUBLIC_FIREBASE_API_KEY is not configured in environment variables.');
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase authentication could not be initialized.');
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
