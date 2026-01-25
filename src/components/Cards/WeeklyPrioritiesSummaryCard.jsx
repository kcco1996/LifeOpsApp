import { useMemo } from "react";

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ISO week key: "YYYY-Www"
function isoWeekKeyFromDate(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1..7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

function isoWeekKeyFromDayKey(dayKey) {
  return isoWeekKeyFromDate(keyToDate(dayKey));
}

function firstNonEmpty(arr, n) {
  return (Array.isArray(arr) ? arr : [])
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .slice(0, n);
}

export default function WeeklyPrioritiesSummaryCard({ selectedKey, weeklyByWeekKey }) {
  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const block = weeklyByWeekKey?.[weekKey] ?? { priorities: [], nice: [] };
  const topPriorities = firstNonEmpty(block.priorities, 3);
  const topNice = firstNonEmpty(block.nice, 2);

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">This week</div>
        <div className="text-xs opacity-60">{weekKey}</div>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="text-xs font-semibold opacity-70">Top priorities</div>

          {topPriorities.length === 0 ? (
            <div className="mt-1 text-sm opacity-70">No priorities yet — add a couple below.</div>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {topPriorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span className="opacity-90">{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold opacity-70">Nice if energy</div>

          {topNice.length === 0 ? (
            <div className="mt-1 text-sm opacity-60">Optional extras go here.</div>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {topNice.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="opacity-80">{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
