// src/data/storage/lifeOpsCloud.js
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const refFor = (uid) => doc(db, "users", uid, "lifeOps", "state");

// --- simple write cooldown (per tab) ---
let cloudWriteDisabledUntil = 0;      // ms timestamp
let lastCloudWriteError = null;

export async function loadCloudState(uid) {
  const snap = await getDoc(refFor(uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudState(uid, state) {
  // If we recently hit quota, don't keep hammering Firestore.
  if (Date.now() < cloudWriteDisabledUntil) return;

  try {
    await setDoc(
      refFor(uid),
      { ...state, updatedAt: serverTimestamp() },
      { merge: true }
    );
    lastCloudWriteError = null;
  } catch (err) {
    lastCloudWriteError = err;

    const code = err?.code || "";
    // Firestore quota / throttling
    if (code === "resource-exhausted") {
      // Stop cloud writes for 60 seconds (still saves locally in your Home.jsx)
      cloudWriteDisabledUntil = Date.now() + 60_000;
      return;
    }

    // Brave/adblock/etc can sometimes block the streaming endpoint
    // (you've seen net::ERR_BLOCKED_BY_CLIENT before)
    // Don't hard-crash the app; just skip cloud saves briefly.
    if (code === "unavailable" || code === "deadline-exceeded") {
      cloudWriteDisabledUntil = Date.now() + 15_000;
      return;
    }

    // Anything else: rethrow so you see it during dev
    throw err;
  }
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

// Optional: if you want to show a tiny UI warning later
export function getCloudWriteStatus() {
  return {
    disabledUntil: cloudWriteDisabledUntil,
    lastError: lastCloudWriteError,
  };
}
