// src/components/Cards/WeeklyTop3Card.jsx
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

export default function WeeklyTop3Card({ selectedKey, weeklyByWeekKey }) {
  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const top3 = useMemo(() => {
    const block = weeklyByWeekKey?.[weekKey] ?? { priorities: [] };
    const priorities = Array.isArray(block.priorities) ? block.priorities : [];

    return priorities
      .map((x) => (x ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [weeklyByWeekKey, weekKey]);

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">This week’s Top 3</div>
        <div className="text-xs opacity-60">{weekKey}</div>
      </div>

      <div className="mt-3 space-y-2">
        {top3.length === 0 ? (
          <div className="text-sm opacity-70">
            Add priorities below and your Top 3 will appear here.
          </div>
        ) : (
          top3.map((t, i) => (
            <div key={t + i} className="rounded-xl bg-card2 px-3 py-2 text-sm">
              <span className="opacity-70 mr-2">{i + 1}.</span>
              <span className="font-medium">{t}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
