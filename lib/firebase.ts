import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyA25eSTcyZIkB9hno6wPQT7vdFUYnIFCkQ",
  authDomain: "studyjapan-db.firebaseapp.com",
  projectId: "studyjapan-db",
  storageBucket: "studyjapan-db.firebasestorage.app",
  messagingSenderId: "106802150143",
  appId: "1:106802150143:web:965887c12fb5b7316daaca",
  measurementId: "G-1RF6N24KJW",
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}
