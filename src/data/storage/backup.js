// src/data/storage/backup.js
const APP_PREFIX = "lifeops:";

/**
 * Export ONLY this app's localStorage keys.
 * Safe even if user has other apps on same domain.
 */
export function exportLocalStorageSnapshot() {
  const keys = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(APP_PREFIX)) {
      keys[k] = localStorage.getItem(k);
    }
  }

  return {
    meta: {
      app: "life-ops",
      version: 1,
      exportedAt: new Date().toISOString(),
      scope: "localStorage",
      prefix: APP_PREFIX,
    },
    local: { keys },
  };
}

/**
 * Restore a snapshot into localStorage.
 * options:
 *  - mode: "replace" (default) clears existing app keys first
 *          "merge" keeps existing keys and overwrites only included ones
 */
export function importLocalStorageSnapshot(snapshot, options = { mode: "replace" }) {
  if (!snapshot?.meta?.app || snapshot.meta.app !== "life-ops") {
    throw new Error("This backup file is not for Life Ops.");
  }
  if (!snapshot?.local?.keys || typeof snapshot.local.keys !== "object") {
    throw new Error("Backup file is missing local keys.");
  }

  const mode = options?.mode ?? "replace";

  if (mode === "replace") {
    // Clear existing Life Ops keys first
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(APP_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  // Write backup keys
  for (const [k, v] of Object.entries(snapshot.local.keys)) {
    if (!k.startsWith(APP_PREFIX)) continue; // safety
    localStorage.setItem(k, v);
  }

  return true;
}

/**
 * Utility: download an object as a .json file
 */
export function downloadJSON(obj, filename = "life-ops-backup.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Utility: read a JSON file from an <input type="file" />
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("Invalid JSON file."));
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Optional helper: clear all Life Ops local keys (useful in Settings).
 */
export function clearLifeOpsLocalKeys() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(APP_PREFIX)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
