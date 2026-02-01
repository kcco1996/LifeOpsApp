// src/pages/Settings/Settings.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  exportLocalStorageSnapshot,
  importLocalStorageSnapshot,
  downloadJSON,
  readJSONFile,
  clearLifeOpsLocalKeys,
} from "../../data/storage/backup";

const DEFAULT_PREFS_KEY = "lifeops:settings:prefs";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(DEFAULT_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(DEFAULT_PREFS_KEY, JSON.stringify(prefs));
}

export default function Settings() {
  const { user } = useAuth(); // assumes your hook returns user
  const [prefs, setPrefs] = useState(loadPrefs());
  const [restoreMode, setRestoreMode] = useState("replace"); // replace | merge
  const [msg, setMsg] = useState("");

  const signedInLabel = useMemo(() => {
    if (!user) return "Signed out";
    return `Signed in as ${user.email ?? "unknown"}`;
  }, [user]);

  function updatePref(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  async function handleDownloadBackup() {
    setMsg("");
    const snapshot = exportLocalStorageSnapshot();
    downloadJSON(snapshot, `life-ops-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg("Backup downloaded.");
  }

  async function handleRestoreBackup(e) {
    setMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJSONFile(file);
      importLocalStorageSnapshot(json, { mode: restoreMode });
      setMsg("Backup restored. Refreshing…");
      // easiest, safest way to rehydrate UI everywhere:
      window.location.reload();
    } catch (err) {
      setMsg(err?.message ?? "Could not restore backup.");
    } finally {
      e.target.value = ""; // allow re-upload same file
    }
  }

  function handleClearLocal() {
    const ok = confirm(
      "This will delete ALL Life Ops data stored on this device (local). Are you sure?"
    );
    if (!ok) return;
    clearLifeOpsLocalKeys();
    setMsg("Local Life Ops data cleared. Refreshing…");
    window.location.reload();
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h1>Settings</h1>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Account</h2>
        <p>{signedInLabel}</p>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Preferences</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!prefs.compactMode}
              onChange={(e) => updatePref("compactMode", e.target.checked)}
            />
            Compact layout
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!prefs.hideUpcoming}
              onChange={(e) => updatePref("hideUpcoming", e.target.checked)}
            />
            Hide “Upcoming” panel
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!prefs.hideStatus}
              onChange={(e) => updatePref("hideStatus", e.target.checked)}
            />
            Hide “Status” panel
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            Default traffic light:
            <select
              value={prefs.defaultTraffic ?? "none"}
              onChange={(e) => updatePref("defaultTraffic", e.target.value)}
            >
              <option value="none">No default</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </label>
        </div>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Backup & Restore</h2>
        <p>Download a full backup of your Life Ops data on this device, or restore from a file.</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={handleDownloadBackup}>Download Backup (.json)</button>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Restore mode:
            <select value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
              <option value="replace">Replace (recommended)</option>
              <option value="merge">Merge</option>
            </select>
          </label>

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span style={{ whiteSpace: "nowrap" }}>Restore backup:</span>
            <input type="file" accept="application/json" onChange={handleRestoreBackup} />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={handleClearLocal}>Clear Local Life Ops Data</button>
        </div>

        {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}
      </section>
    </div>
  );
}
