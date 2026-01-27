// src/data/storage/lifeOpsCloud.js
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const refFor = (uid) => doc(db, "users", uid, "lifeOps", "state");

export async function loadCloudState(uid) {
  const snap = await getDoc(refFor(uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudState(uid, state) {
  await setDoc(refFor(uid), { ...state, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeCloudState(uid, onChange) {
  // includeMetadataChanges lets us see pending writes; we then ignore them
  return onSnapshot(
    refFor(uid),
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) return;

      // ✅ Ignore the “local echo” snapshot that causes bouncing
      if (snap.metadata.hasPendingWrites) return;

      onChange(snap.data());
    }
  );
}
