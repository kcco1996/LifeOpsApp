import { useEffect, useMemo, useState } from "react";
import { loadAppData, saveAppData } from "../../data/storage/localStorage";

// ---- helpers (same ISO week logic as Home) ----
function isoWeekKeyFromDate(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1..7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

function ensureRows(arr, n) {
  const base = Array.isArray(arr) ? arr.slice(0, n) : [];
  while (base.length < n) base.push("");
  return base;
}

export default function Review() {
  const today = new Date();
  const weekKey = useMemo(() => isoWeekKeyFromDate(today), []);

  const [weeklyReviewByWeekKey, setWeeklyReviewByWeekKey] = useState({});

  // Load
  useEffect(() => {
    const saved = loadAppData();
    if (saved?.weeklyReviewByWeekKey) setWeeklyReviewByWeekKey(saved.weeklyReviewByWeekKey);
  }, []);

  // Save
  useEffect(() => {
    saveAppData({ weeklyReviewByWeekKey });
  }, [weeklyReviewByWeekKey]);

  const block = weeklyReviewByWeekKey[weekKey] ?? {
    wins: [],
    drains: [],
    helps: [],
    tweak: "",
  };

  const wins = ensureRows(block.wins, 3);
  const drains = ensureRows(block.drains, 3);
  const helps = ensureRows(block.helps, 3);
  const tweak = block.tweak ?? "";

  function setRow(kind, idx, value) {
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { wins: [], drains: [], helps: [], tweak: "" };
      const nextArr = ensureRows(cur[kind], 3);
      nextArr[idx] = value;
      return { ...safePrev, [weekKey]: { ...cur, [kind]: nextArr } };
    });
  }

  function setTweak(value) {
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { wins: [], drains: [], helps: [], tweak: "" };
      return { ...safePrev, [weekKey]: { ...cur, tweak: value } };
    });
  }

  return (
    <div className="max-w-md p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple">Review</h1>
        <div className="mt-1 text-sm opacity-70">Week: {weekKey}</div>
      </div>

      {/* Wins */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="text-sm font-semibold opacity-90">This week’s wins</div>
        <div className="mt-3 space-y-2">
          {wins.map((v, i) => (
            <input
              key={`w-${i}`}
              value={v}
              onChange={(e) => setRow("wins", i, e.target.value)}
              placeholder={`Win ${i + 1}`}
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
            />
          ))}
        </div>
      </div>

      {/* Drains */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="text-sm font-semibold opacity-90">What drained me</div>
        <div className="mt-3 space-y-2">
          {drains.map((v, i) => (
            <input
              key={`d-${i}`}
              value={v}
              onChange={(e) => setRow("drains", i, e.target.value)}
              placeholder={`Drain ${i + 1}`}
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
            />
          ))}
        </div>
      </div>

      {/* Helps */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="text-sm font-semibold opacity-90">What helped</div>
        <div className="mt-3 space-y-2">
          {helps.map((v, i) => (
            <input
              key={`h-${i}`}
              value={v}
              onChange={(e) => setRow("helps", i, e.target.value)}
              placeholder={`Help ${i + 1}`}
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
            />
          ))}
        </div>
      </div>

      {/* One tweak */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="text-sm font-semibold opacity-90">One tweak for next week</div>
        <textarea
          value={tweak}
          onChange={(e) => setTweak(e.target.value)}
          placeholder="E.g., keep Monday evening completely empty after office day."
          rows={3}
          className="mt-3 w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
        />
      </div>
    </div>
  );
}
