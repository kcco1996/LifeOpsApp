// src/pages/Support/Support.jsx
import { useEffect, useState } from "react";
import { exportBackupToFile } from "../../data/storage/backup";
import { getSupportProfile, setSupportProfile } from "../../data/storage/supportProfile";

const TEMPLATES = {
  green: `Keep momentum:
- Start with 1 easy task
- Take breaks before you need them
- Stop after the win`,
  amber: `Protect energy:
- Reduce tasks to the smallest version
- Headphones / quiet space
- One support message if needed`,
  red: `Safety + simplicity:
- Reduce stimulation (dim screen / headphones)
- Drink water + sit comfortably
- Do the smallest safe step (or rest)`,
};

export default function Support() {
  const [profile, setProfile] = useState(() => getSupportProfile());
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    setSupportProfile(profile);
    setSavedTick(true);
    const id = setTimeout(() => setSavedTick(false), 800);
    return () => clearTimeout(id);
  }, [profile]);

  function updateTrusted(i, field, val) {
    setProfile((p) => {
      const list = Array.isArray(p.trustedPeople) ? p.trustedPeople.slice() : [];
      while (list.length < 3) list.push({ name: "", method: "", notes: "" });
      list[i] = { ...(list[i] ?? {}), [field]: val };
      return { ...(p ?? {}), trustedPeople: list };
    });
  }

  return (
    <div className="max-w-md p-4 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-purple">Support</h1>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Quick templates</div>
        <div className="text-xs opacity-60">Copy/paste into your Green/Amber/Red plan.</div>

        <div className="space-y-2">
          {Object.entries(TEMPLATES).map(([k, txt]) => (
            <button
              key={k}
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 text-left"
              onClick={() => {
                navigator.clipboard?.writeText(txt);
                alert(`Copied ${k.toUpperCase()} template ✅`);
              }}
            >
              Copy {k.toUpperCase()} template
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Trusted people</div>
        <div className="text-xs opacity-60">Local-only. Keep it short.</div>

        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-card2 p-3 space-y-2">
              <input
                value={profile?.trustedPeople?.[i]?.name ?? ""}
                onChange={(e) => updateTrusted(i, "name", e.target.value)}
                placeholder={`Person ${i + 1} name`}
                className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
              />
              <input
                value={profile?.trustedPeople?.[i]?.method ?? ""}
                onChange={(e) => updateTrusted(i, "method", e.target.value)}
                placeholder="How to reach them (text/call/etc)"
                className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
              />
              <input
                value={profile?.trustedPeople?.[i]?.notes ?? ""}
                onChange={(e) => updateTrusted(i, "notes", e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
              />
            </div>
          ))}
        </div>

        {savedTick && <div className="text-xs opacity-60">Saved ✓</div>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
        <div className="text-sm font-semibold opacity-90">Early warning signs</div>
        <textarea
          value={profile?.earlyWarningSigns ?? ""}
          onChange={(e) => setProfile((p) => ({ ...(p ?? {}), earlyWarningSigns: e.target.value }))}
          placeholder="e.g., tight chest, irritability, shutdown signs..."
          className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
        />

        <div className="text-sm font-semibold opacity-90">What helps</div>
        <textarea
          value={profile?.whatHelps ?? ""}
          onChange={(e) => setProfile((p) => ({ ...(p ?? {}), whatHelps: e.target.value }))}
          placeholder="e.g., headphones, dim light, short walk..."
          className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
        />

        <div className="text-sm font-semibold opacity-90">Grounding kit</div>
        <textarea
          value={profile?.groundingKit ?? ""}
          onChange={(e) => setProfile((p) => ({ ...(p ?? {}), groundingKit: e.target.value }))}
          placeholder="e.g., water, snack, gum, fidget..."
          className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="text-sm font-semibold opacity-90">Data safety</div>
        <button
          className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
          onClick={exportBackupToFile}
        >
          Export backup (.json)
        </button>
      </div>
    </div>
  );
}
