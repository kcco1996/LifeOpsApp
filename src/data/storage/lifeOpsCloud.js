// src/data/storage/lifeOpsCloud.js
import { db } from "../../utils/firebase";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const refFor = (uid) => doc(db, "users", uid, "lifeOps", "state");

// --- write cooldown ---
let cloudWriteDisabledUntil = 0;
let lastCloudWriteError = null;

// --- debounce + dedupe ---
let saveTimer = null;
let pendingUid = null;
let pendingState = null;
let lastSavedHashByUid = new Map();

// -------------------- Stable hashing (dedupe) --------------------
function stableStringify(value) {
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

export function resetCloudSaveQueue() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pendingUid = null;
  pendingState = null;
}

export async function migrateLocalToCloud(uid, localState) {
  if (!uid) throw new Error("Missing uid");

  const payload = localState ?? {};
  await setDoc(
    refFor(uid),
    {
      ...payload,
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const { updatedAt, migratedAt, ...rest } = payload;
  lastSavedHashByUid.set(uid, hashState(rest));
}

export function saveCloudState(uid, state, { delayMs = 800 } = {}) {
  if (!uid) return;

  if (Date.now() < cloudWriteDisabledUntil) return;

  const nextHash = hashState(state);
  const lastHash = lastSavedHashByUid.get(uid);
  if (lastHash && lastHash === nextHash) return;

  pendingUid = uid;
  pendingState = state;

  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    saveTimer = null;

    if (!pendingUid || Date.now() < cloudWriteDisabledUntil) return;

    const writeUid = pendingUid;
    const writeState = pendingState;

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

  return onSnapshot(refFor(uid), (snap) => {
    if (!snap.exists()) return;

    // ignore local echo
    if (snap.metadata.hasPendingWrites) return;

    const data = snap.data();
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
