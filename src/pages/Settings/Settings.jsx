import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

import {
  exportBackupToFile,
  importBackupFromFile,
  resetAllLocalData,
} from "../../data/storage/backup";

import { loadAppData, saveAppData } from "../../data/storage/localStorage";
import {
  migrateLocalToCloud,
  getCloudWriteStatus,
  saveCloudState,
} from "../../data/storage/lifeOpsCloud";

export default function Settings() {
  const { user, authLoading } = useAuth();
  const fileRef = useRef(null);
  const [importErr, setImportErr] = useState("");
  const cloudStatus = getCloudWriteStatus();

  const isWhitelisted = user?.email === "kcco1996@gmail.com";

  // ---------------- Preferences State ----------------
  const [prefs, setPrefs] = useState({
    guardrail: "",
    commuteChecklist: ["Headphones", "Water", "Exit plan", "One calm breath", "", ""],
  });

  const [hydrated, setHydrated] = useState(false);

  // Load prefs on mount
  useEffect(() => {
    if (authLoading) return;
    const saved = loadAppData() ?? {};
    if (saved?.prefs) {
      setPrefs((p) => ({ ...p, ...saved.prefs }));
    }
    setHydrated(true);
  }, [authLoading]);

  // Save prefs (local + cloud)
  useEffect(() => {
    if (!hydrated) return;

    const id = setTimeout(() => {
      const current = loadAppData() ?? {};
      const next = { ...current, prefs };

      saveAppData(next);

      if (user && !authLoading) {
        saveCloudState(user.uid, next);
      }
    }, 350);

    return () => clearTimeout(id);
  }, [prefs, hydrated, user, authLoading]);

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

      {/* Preferences */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Preferences</div>

        <div className="space-y-1">
          <div className="text-xs font-semibold opacity-70">Today’s guardrail</div>
          <div className="text-xs opacity-60">One rule for today (shown on Home).</div>
          <textarea
            value={prefs.guardrail}
            onChange={(e) => setPrefs((p) => ({ ...p, guardrail: e.target.value }))}
            placeholder="e.g., No extra tasks after 7pm."
            className="w-full min-h-[80px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-70">Commute protection checklist</div>
          <div className="text-xs opacity-60">Shown when Office day + Amber.</div>

          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              value={prefs.commuteChecklist?.[i] ?? ""}
              onChange={(e) =>
                setPrefs((p) => {
                  const list = Array.isArray(p.commuteChecklist)
                    ? p.commuteChecklist.slice(0, 6)
                    : [];
                  while (list.length < 6) list.push("");
                  list[i] = e.target.value;
                  return { ...p, commuteChecklist: list };
                })
              }
              placeholder={`Item ${i + 1}`}
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
            />
          ))}
        </div>
      </div>

      {/* Data tools */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Data</div>
        <div className="text-xs opacity-70">
          Backup includes: Home data + Daily History timeline.
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
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await importBackupFromFile(file);
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

        <button
          className="w-full rounded-xl bg-red px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
          onClick={() => {
            if (confirm("Reset ALL local Life Ops data?")) {
              resetAllLocalData();
            }
          }}
        >
          Reset local data
        </button>
      </div>

      {/* Sync tools */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Sync (Firebase)</div>

        {!user ? (
          <div className="text-sm opacity-70">Sign in to enable sync.</div>
        ) : (
          <>
            <div className="text-xs opacity-70">
              Cloud writes may pause after quota/network errors.
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
          </>
        )}
      </div>
    </div>
  );
}
