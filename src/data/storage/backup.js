// src/data/storage/backup.js
import { loadAppData, saveAppData } from "./localStorage";
import { getDailyHistory, setDailyHistory } from "./historyDaily";

/**
 * Backup format:
 * {
 *   meta: { app, version, createdAt },
 *   appState: {...},
 *   dailyHistory: [...]
 * }
 */

const BACKUP_APP = "life-ops";
const BACKUP_VERSION = 1;

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function makeBackupObject() {
  const appState = loadAppData() ?? {};
  const dailyHistory = getDailyHistory() ?? [];

  return {
    meta: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
    },
    appState,
    dailyHistory,
  };
}

export function exportBackupToFile() {
  const backup = makeBackupObject();
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  downloadTextFile(`life-ops-backup-${stamp}.json`, JSON.stringify(backup, null, 2));
}

export function validateBackupObject(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, error: "Backup file is not valid JSON." };

  const meta = obj.meta;
  if (!meta || typeof meta !== "object") return { ok: false, error: "Missing meta section." };
  if (meta.app !== BACKUP_APP) return { ok: false, error: "This backup is not for Life Ops." };

  // allow future versions but warn
  if (typeof meta.version !== "number") return { ok: false, error: "Missing backup version." };

  const appState = obj.appState;
  const dailyHistory = obj.dailyHistory;

  if (appState && typeof appState !== "object") {
    return { ok: false, error: "appState must be an object." };
  }
  if (dailyHistory && !Array.isArray(dailyHistory)) {
    return { ok: false, error: "dailyHistory must be an array." };
  }

  return { ok: true };
}

export async function importBackupFromFile(file) {
  const text = await file.text();
  const parsed = safeParseJSON(text);

  const v = validateBackupObject(parsed);
  if (!v.ok) throw new Error(v.error);

  // Restore local stores through your existing helpers
  saveAppData(parsed.appState ?? {});
  setDailyHistory(Array.isArray(parsed.dailyHistory) ? parsed.dailyHistory : []);

  // Reload so Home rehydrates cleanly and cloud logic doesn’t fight it
  window.location.reload();
}

export function resetAllLocalData() {
  saveAppData({});
  setDailyHistory([]);
  window.location.reload();
}
