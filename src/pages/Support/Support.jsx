// src/pages/Support/Support.jsx
import { exportBackupToFile } from "../../data/storage/backup";

export default function Support() {
  return (
    <div className="max-w-md p-4 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-purple">Support</h1>

      {/* Quick help */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">How to use Life Ops</div>
        <ul className="text-sm opacity-80 list-disc pl-5 space-y-1">
          <li><b>Green</b>: keep momentum — pick one thing to maintain.</li>
          <li><b>Amber</b>: protect energy — reduce scope, pick a support.</li>
          <li><b>Red</b>: safety + simplicity — use Support, reduce screen, do the smallest safe step.</li>
        </ul>
        <div className="text-xs opacity-60">
          Your goal is stability, not perfection.
        </div>
      </div>

      {/* Red day support */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Red day mode</div>
        <div className="text-sm opacity-80">
          If you hit Red, the app keeps things simple. Use:
        </div>
        <ul className="text-sm opacity-80 list-disc pl-5 space-y-1">
          <li><b>Support</b> sheet</li>
          <li><b>Reduce screen</b> or <b>Bare</b> mode</li>
          <li>One tiny task only (or none)</li>
        </ul>
      </div>

      {/* Data & privacy */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Your data</div>
        <div className="text-sm opacity-80">
          - If not signed in: everything saves <b>locally</b> on this device.<br />
          - If signed in: your main state also syncs to <b>Firebase</b>.<br />
          - Daily History is stored locally (unless you later choose to sync it).
        </div>

        <button
          className="w-full mt-2 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
          onClick={exportBackupToFile}
        >
          Export backup (.json)
        </button>

        <div className="text-xs opacity-60">
          Tip: export a backup before major edits or refactors.
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Troubleshooting</div>

        <div className="text-sm opacity-80">
          <b>History page is empty</b><br />
          Use Home normally (change status / type a note) and wait ~1 second. Then return to History.
        </div>

        <div className="text-sm opacity-80">
          <b>Sync feels delayed</b><br />
          If Firebase hit quota/network issues, writes can pause briefly. Check Settings → Sync.
        </div>

        <div className="text-sm opacity-80">
          <b>I’m worried about losing data</b><br />
          Export a backup in Settings, then you can restore it anytime.
        </div>
      </div>

      {/* Safety note */}
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Safety note</div>
        <div className="text-sm opacity-80">
          Life Ops is not medical advice. If you feel unsafe or in danger, contact emergency services
          or a trusted person immediately.
        </div>
        <div className="text-xs opacity-60">
          UK: 999 (emergency) • 111 (non-emergency medical)
        </div>
      </div>
    </div>
  );
}
