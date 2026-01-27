// src/data/storage/lifeOpsCloud.js
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const refFor = (uid) => doc(db, "users", uid, "lifeOps", "state");

// --- simple write cooldown (per tab) ---
let cloudWriteDisabledUntil = 0; // ms timestamp
let lastCloudWriteError = null;

// --- debounce + dedupe (per tab) ---
let saveTimer = null;
let pendingUid = null;
let pendingState = null;
let lastSavedHashByUid = new Map();

// stable-ish hash (good enough for client-side dedupe)
function hashState(state) {
  // Avoid hashing serverTimestamp / functions
  try {
    return JSON.stringify(state, Object.keys(state).sort());
  } catch {
    // If state contains non-serializable stuff, fall back to a time-based hash
    return String(Date.now());
  }
}

export async function loadCloudState(uid) {
  const snap = await getDoc(refFor(uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Debounced + deduped save.
 * Call this as often as you want; it will write at most ~1 per delay window,
 * and only when the data has changed since last successful save.
 */
export function saveCloudState(uid, state, { delayMs = 800 } = {}) {
  // If we recently hit quota, don't keep hammering Firestore.
  if (Date.now() < cloudWriteDisabledUntil) return;

  const nextHash = hashState(state);
  const lastHash = lastSavedHashByUid.get(uid);

  // If unchanged vs last successful save, skip completely.
  if (lastHash && lastHash === nextHash) return;

  // Queue latest payload
  pendingUid = uid;
  pendingState = state;

  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    saveTimer = null;

    // Re-check cooldown at write time
    if (!pendingUid || Date.now() < cloudWriteDisabledUntil) return;

    const writeUid = pendingUid;
    const writeState = pendingState;

    // Dedupe again (in case multiple calls happened)
    const writeHash = hashState(writeState);
    const prevHash = lastSavedHashByUid.get(writeUid);
    if (prevHash && prevHash === writeHash) return;

    try {
      await setDoc(
        refFor(writeUid),
        { ...writeState, updatedAt: serverTimestamp() },
        { merge: true }
      );
      lastCloudWriteError = null;
      lastSavedHashByUid.set(writeUid, writeHash);
    } catch (err) {
      lastCloudWriteError = err;

      const code = err?.code || "";
      if (code === "resource-exhausted") {
        cloudWriteDisabledUntil = Date.now() + 60_000;
        return;
      }
      if (code === "unavailable" || code === "deadline-exceeded") {
        cloudWriteDisabledUntil = Date.now() + 15_000;
        return;
      }
      throw err;
    }
  }, delayMs);
}

export function subscribeCloudState(uid, onChange) {
  return onSnapshot(
    refFor(uid),
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) return;

      // Ignore “local echo”
      if (snap.metadata.hasPendingWrites) return;

      const data = snap.data();

      // Seed lastSavedHash so we don't immediately write back what we just read
      const h = hashState(data);
      lastSavedHashByUid.set(uid, h);

      onChange(data);
    }
  );
}

export function getCloudWriteStatus() {
  return {
    disabledUntil: cloudWriteDisabledUntil,
    lastError: lastCloudWriteError,
  };
}
