// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtse4bJY8v6jm48O5kD77KeFVjEVSnyCA",
  authDomain: "lifeops-95978.firebaseapp.com",
  projectId: "lifeops-95978",
  storageBucket: "lifeops-95978.firebasestorage.app",
  messagingSenderId: "81691339428",
  appId: "1:81691339428:web:9722857815dda3e7971431",
};

// ✅ avoids double-init (important with Vite/PWA/HMR)
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// ✅ modern persistence (replaces enableIndexedDbPersistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
