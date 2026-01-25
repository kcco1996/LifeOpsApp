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

function ensureRows(arr, n) {
  const base = Array.isArray(arr) ? arr.slice(0, n) : [];
  while (base.length < n) base.push({ text: "", done: false });
  return base;
}

export default function WeeklyChecklistCard({
  selectedKey,
  canEdit,
  weeklyByWeekKey,
  setWeeklyByWeekKey,
  rows = 6,
}) {
  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const weeklyBlock = weeklyByWeekKey?.[weekKey] ?? {};
  const checklist = ensureRows(weeklyBlock.checklist, rows);

  function setChecklistRow(idx, patch) {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { priorities: [], nice: [], checklist: [] };

      const nextChecklist = ensureRows(cur.checklist, rows);
      nextChecklist[idx] = { ...nextChecklist[idx], ...patch };

      return {
        ...safePrev,
        [weekKey]: {
          ...cur,
          checklist: nextChecklist,
        },
      };
    });
  }

  function resetChecklist() {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { priorities: [], nice: [], checklist: [] };

      const cleared = ensureRows(cur.checklist, rows).map((r) => ({ ...r, done: false }));

      return {
        ...safePrev,
        [weekKey]: {
          ...cur,
          checklist: cleared,
        },
      };
    });
  }

  const doneCount = checklist.filter((r) => !!r.done && (r.text || "").trim().length > 0).length;
  const totalCount = checklist.filter((r) => (r.text || "").trim().length > 0).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Weekly checklist</div>
        <div className="text-xs opacity-60">{weekKey}</div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs opacity-70">
          {totalCount === 0 ? "Add a few small wins for the week." : `${doneCount}/${totalCount} done`}
        </div>

        <button
          className="rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={!canEdit}
          onClick={resetChecklist}
          title="Sets all ticks back to false (keeps the text)"
        >
          Reset ticks
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {checklist.map((row, i) => {
          const text = row.text ?? "";
          const done = !!row.done;
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-card2 px-3 py-2">
              <input
                type="checkbox"
                checked={done}
                disabled={!canEdit || text.trim().length === 0}
                onChange={(e) => setChecklistRow(i, { done: e.target.checked })}
              />

              <input
                value={text}
                disabled={!canEdit}
                onChange={(e) => setChecklistRow(i, { text: e.target.value })}
                placeholder={`Weekly task ${i + 1}`}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          );
        })}
      </div>

      {!canEdit && <div className="mt-2 text-xs opacity-60">Weekly checklist is view-only for past days.</div>}
    </div>
  );
}
