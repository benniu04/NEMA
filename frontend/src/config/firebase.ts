// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nema-e66af.firebaseapp.com",
  projectId: "nema-e66af",
  storageBucket: "nema-e66af.firebasestorage.app",
  messagingSenderId: "533333807122",
  appId: "1:533333807122:web:e62862391906246f3cc8cb",
  measurementId: "G-THNTK4B8HF"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const analytics: Analytics = getAnalytics(app);
const auth: Auth = getAuth(app);

export { app, analytics, auth };

