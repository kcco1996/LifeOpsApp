// src/utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtse4bJY8v6jm48O5kD77KeFVjEVSnyCA",
  authDomain: "lifeops-95978.firebaseapp.com",
  projectId: "lifeops-95978",
  storageBucket: "lifeops-95978.firebasestorage.app",
  messagingSenderId: "81691339428",
  appId: "1:81691339428:web:9722857815dda3e7971431",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const db = getFirestore(app);

// Offline cache (optional). If multiple tabs open, persistence may fail — safe to ignore.
enableIndexedDbPersistence(db).catch(() => {});
