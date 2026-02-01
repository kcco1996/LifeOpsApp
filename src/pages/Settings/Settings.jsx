// src/pages/Settings/Settings.jsx
import { useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

import { exportBackupToFile, importBackupFromFile, resetAllLocalData } from "../../data/storage/backup";
import { loadAppData } from "../../data/storage/localStorage";

import { migrateLocalToCloud, getCloudWriteStatus } from "../../data/storage/lifeOpsCloud";

export default function Settings() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [importErr, setImportErr] = useState("");
  const [importOk, setImportOk] = useState("");
  const cloudStatus = getCloudWriteStatus();

  const isWhitelisted = user?.email === "kcco1996@gmail.com";

  return (
    <div className="max-w-md p-4 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-purple">Settings</h1>
      <div className="text-xs opacity-60">Life Ops • Build: 2026-01-27-A</div>

      {/* Account */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Account</div>
        {user ? (
          <>
            <div className="text-sm opacity-80">Signed in as</div>
            <div className="text-sm font-semibold">{user.email}</div>
            <div className="text-xs opacity-60">Sync: enabled</div>
          </>
        ) : (
          <>
            <div className="text-sm opacity-80">Not signed in</div>
            <div className="text-xs opacity-60">Saving locally on this device.</div>
          </>
        )}
      </div>

      {/* Data tools */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Data</div>
        <div className="text-xs opacity-70">
          Backup includes: Home data + Daily History timeline. You can restore on any device.
        </div>

        <button
          className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
          onClick={exportBackupToFile}
        >
          Export backup (.json)
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            setImportErr("");
            setImportOk("");
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await importBackupFromFile(file);
              // importBackupFromFile reloads the page
            } catch (err) {
              setImportErr(err?.message || "Import failed.");
            } finally {
              e.target.value = "";
            }
          }}
        />

        <button
          className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
          onClick={() => fileRef.current?.click()}
        >
          Import backup (.json)
        </button>

        {importErr && <div className="text-xs text-red-300">{importErr}</div>}
        {importOk && <div className="text-xs text-green-300">{importOk}</div>}

        <button
          className="w-full rounded-xl bg-red px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
          onClick={() => {
            const ok = confirm("Reset ALL local Life Ops data on this device? This cannot be undone.");
            if (!ok) return;
            resetAllLocalData();
          }}
        >
          Reset local data
        </button>

        <div className="text-xs opacity-60">
          Tip: Export a backup before big changes.
        </div>
      </div>

      {/* Sync tools */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Sync (Firebase)</div>

        {!user ? (
          <div className="text-sm opacity-70">Sign in to enable sync.</div>
        ) : (
          <>
            <div className="text-xs opacity-70">
              Cloud writes may temporarily pause after quota/network errors.
            </div>

            <div className="rounded-xl bg-card2 p-3 text-xs opacity-80">
              <div>
                Write disabled until:{" "}
                <b>
                  {cloudStatus.disabledUntil && cloudStatus.disabledUntil > Date.now()
                    ? new Date(cloudStatus.disabledUntil).toLocaleTimeString()
                    : "not disabled"}
                </b>
              </div>
              <div className="mt-1">
                Last error: <b>{cloudStatus.lastError?.code || "none"}</b>
              </div>
            </div>

            {isWhitelisted && (
              <button
                className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
                onClick={async () => {
                  const local = loadAppData() ?? {};
                  await migrateLocalToCloud(user.uid, local);
                  alert("Migrated local data to Firebase ✅");
                }}
              >
                Migrate local → Firebase (admin)
              </button>
            )}

            {!isWhitelisted && (
              <div className="text-xs opacity-60">
                Migration is restricted to the admin account.
              </div>
            )}
          </>
        )}
      </div>

      {/* About */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">About</div>
        <div className="text-xs opacity-70">
          Life Ops is designed for quick daily stability: status, coping, tiny tasks, and gentle planning.
        </div>
      </div>
    </div>
  );
}
