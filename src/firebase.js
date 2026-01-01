// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 1. Import Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxbhA24_nP7xR6TxcNaNbgSvHU7uU9aus",
  authDomain: "kisan-sahayak-aaafa.firebaseapp.com",
  projectId: "kisan-sahayak-aaafa",
  storageBucket: "kisan-sahayak-aaafa.firebasestorage.app",
  messagingSenderId: "570364924406",
  appId: "1:570364924406:web:a264cfa481bd478186b7d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools we need for the rest of the app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app); // 2. Export Storage