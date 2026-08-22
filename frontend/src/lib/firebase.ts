import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

// Values come from frontend/.env.local (see .env.example). They are public
// identifiers, not secrets — security is enforced by Firebase and the backend.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

const app = initializeApp({
  apiKey: firebaseConfig.apiKey ?? "missing-api-key",
  authDomain: firebaseConfig.authDomain ?? "missing.firebaseapp.com",
  projectId: firebaseConfig.projectId ?? "missing-project",
  appId: firebaseConfig.appId ?? "missing-app-id",
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
