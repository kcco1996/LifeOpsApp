// src/data/storage/lifeOpsCloud.js
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const refFor = (uid) => doc(db, "users", uid, "lifeOps", "state");

export async function loadCloudState(uid) {
  const snap = await getDoc(refFor(uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudState(uid, state) {
  await setDoc(
    refFor(uid),
    { ...state, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeCloudState(uid, onChange) {
  return onSnapshot(refFor(uid), (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  });
}