// src/utils/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // your config...
};

let app;
let db;
let auth;

export function getFirebase() {
  if (!app) app = initializeApp(firebaseConfig);
  if (!db) db = getFirestore(app);
  if (!auth) auth = getAuth(app);

  return { app, db, auth };
}

export const dbProxy = new Proxy(
  {},
  {
    get(_t, prop) {
      return getFirebase().db[prop];
    },
  }
);

export const authProxy = new Proxy(
  {},
  {
    get(_t, prop) {
      return getFirebase().auth[prop];
    },
  }
);
