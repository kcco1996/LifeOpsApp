import React from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function StatusCard({
  value,
  canEdit,
  onChange,
  title = "STATUS",
  subtitle = "Quick check",
}) {
  // Expect value like: { energy: 2, focus: 2, stress: 3 }
  const v = value ?? { energy: 2, focus: 2, stress: 3 };

  function setField(field, next) {
    const num = clamp(Number(next), 1, 5);
    onChange?.({ ...v, [field]: num });
  }

  const rows = [
    { key: "energy", label: "Energy" },
    { key: "focus", label: "Focus" },
    { key: "stress", label: "Stress" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">{title}</div>
        <div className="text-xs opacity-60">{subtitle}</div>
      </div>

      <div className="mt-3 space-y-4">
        {rows.map((r) => {
          const num = v[r.key] ?? 2;

          return (
            <div key={r.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">{r.label}</div>
                <div className="text-sm opacity-70">
                  {num}/5
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={num}
                disabled={!canEdit}
                onChange={(e) => setField(r.key, e.target.value)}
                className="w-full accent-purple disabled:opacity-60"
              />
            </div>
          );
        })}

        {!canEdit && (
          <div className="text-xs opacity-60">
            Quick check is view-only for past days.
          </div>
        )}
      </div>
    </div>
  );
}
