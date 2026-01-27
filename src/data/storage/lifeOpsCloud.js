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

// -------------------- Stable hashing (dedupe) --------------------
// We ignore metadata keys that change every write (updatedAt, migratedAt).
// We also make Firestore Timestamp stable via toMillis().
function stableStringify(value) {
  // Firestore Timestamp -> stable primitive
  if (value && typeof value === "object" && typeof value.toMillis === "function") {
    return JSON.stringify({ __ts: value.toMillis() });
  }

  if (value === null || typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  const keys = Object.keys(value)
    .filter((k) => k !== "updatedAt" && k !== "migratedAt")
    .sort();

  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
    "}"
  );
}

function hashState(state) {
  try {
    return stableStringify(state);
  } catch {
    return String(Date.now());
  }
}

// -------------------- Public API --------------------
export async function loadCloudState(uid) {
  const snap = await getDoc(refFor(uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Debounced + deduped save.
 * Call this as often as you want; it will write at most ~1 per delay window,
 * and only when the data has changed since last successful save.
 */
export function resetCloudSaveQueue() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pendingUid = null;
  pendingState = null;
}

export async function migrateLocalToCloud(uid, localState) {
  if (!uid) throw new Error("Missing uid");

  await setDoc(
    refFor(uid),
    {
      ...(localState ?? {}),
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Seed hash (metadata ignored by hashState anyway, but keep consistent)
  const { updatedAt, migratedAt, ...rest } = localState ?? {};
  lastSavedHashByUid.set(uid, hashState(rest));
}

export function saveCloudState(uid, state, { delayMs = 800 } = {}) {
  if (!uid) return;

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
        { ...(writeState ?? {}), updatedAt: serverTimestamp() },
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
  if (!uid) return () => {};

  // NOTE: we don't need includeMetadataChanges:true if we already ignore hasPendingWrites.
  return onSnapshot(refFor(uid), (snap) => {
    if (!snap.exists()) return;

    // Ignore “local echo”
    if (snap.metadata.hasPendingWrites) return;

    const data = snap.data();

    // Seed lastSavedHash so we don't immediately write back what we just read.
    // Strip metadata keys so this matches hashing used for writes.
    const { updatedAt, migratedAt, ...rest } = data ?? {};
    lastSavedHashByUid.set(uid, hashState(rest));

    onChange(data);
  });
}

export function getCloudWriteStatus() {
  return {
    disabledUntil: cloudWriteDisabledUntil,
    lastError: lastCloudWriteError,
  };
}
