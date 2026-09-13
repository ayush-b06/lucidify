// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBa5YQ3oTaNIJl3co6Wcl9-Lo07ARBMiY",
  authDomain: "lucidify-playground.firebaseapp.com",
  projectId: "lucidify-playground",
  storageBucket: "lucidify-playground.firebasestorage.app",
  messagingSenderId: "646276606956",
  appId: "1:646276606956:web:1915a9443e1195b937aec9",
  measurementId: "G-CGYEJ51JDB"
};

// Initialize Firebase
// The demo project has no live Firebase resources. Opt in only for local tests.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const app = initializeApp(useEmulators ? {
  apiKey: 'demo-lucidify', authDomain: 'localhost', projectId: 'demo-lucidify',
} : firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
if (useEmulators && typeof window !== 'undefined') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };