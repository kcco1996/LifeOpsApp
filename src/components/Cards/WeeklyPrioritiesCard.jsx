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

function ensureSixRows(arr) {
  const base = Array.isArray(arr) ? arr.slice(0, 6) : [];
  while (base.length < 6) base.push("");
  return base;
}

function prevWeekKey(weekKey) {
  const [yPart, wPart] = weekKey.split("-W");
  let year = Number(yPart);
  let week = Number(wPart);

  week -= 1;
  if (week >= 1) return `${year}-W${String(week).padStart(2, "0")}`;

  // last ISO week of previous year (Dec 28 is always in last ISO week)
  const dec28 = new Date(Date.UTC(year - 1, 11, 28));
  return isoWeekKeyFromDate(dec28);
}

function nextWeekKey(weekKey) {
  const [yPart, wPart] = weekKey.split("-W");
  let year = Number(yPart);
  let week = Number(wPart);

  week += 1;

  // ISO last week of this year
  const dec28 = new Date(Date.UTC(year, 11, 28));
  const lastKeyThisYear = isoWeekKeyFromDate(dec28);
  const lastWeekNum = Number(lastKeyThisYear.split("-W")[1]);

  if (week <= lastWeekNum) return `${year}-W${String(week).padStart(2, "0")}`;
  return `${year + 1}-W01`;
}

function compactSix(arr) {
  return ensureSixRows(
    (Array.isArray(arr) ? arr : [])
      .map((x) => (x ?? "").trim())
      .filter(Boolean)
      .slice(0, 6)
  );
}

export default function WeeklyPrioritiesCard({
  selectedKey,
  canEdit,
  weeklyByWeekKey,
  setWeeklyByWeekKey,
}) {
  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const weeklyBlock = weeklyByWeekKey?.[weekKey] ?? { priorities: [], nice: [] };
  const weeklyPriorities = ensureSixRows(weeklyBlock.priorities);
  const weeklyNice = ensureSixRows(weeklyBlock.nice);

  function setWeeklyRow(kind, idx, value) {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { priorities: [], nice: [] };

      const nextArr = ensureSixRows(cur[kind]);
      nextArr[idx] = value;

      const nextBlock = { ...cur, [kind]: nextArr };
      return { ...safePrev, [weekKey]: nextBlock };
    });
  }

  function clearThisWeek() {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { priorities: [], nice: [] };

      return {
        ...safePrev,
        [weekKey]: {
          ...cur,
          priorities: ensureSixRows([]),
          nice: ensureSixRows([]),
        },
      };
    });
  }

  function copyLastWeek() {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const fromKey = prevWeekKey(weekKey);
      const fromBlock = safePrev[fromKey] ?? { priorities: [], nice: [] };

      const cur = safePrev[weekKey] ?? { priorities: [], nice: [] };

      return {
        ...safePrev,
        [weekKey]: {
          ...cur,
          priorities: ensureSixRows(fromBlock.priorities),
          nice: ensureSixRows(fromBlock.nice),
        },
      };
    });
  }

  function pushUnfinishedToNextWeek() {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const nxtKey = nextWeekKey(weekKey);

      const curBlock = safePrev[weekKey] ?? { priorities: [], nice: [] };
      const nxtBlock = safePrev[nxtKey] ?? { priorities: [], nice: [] };

      const curPriorities = compactSix(curBlock.priorities);

      const merged = compactSix([...(nxtBlock.priorities ?? []), ...curPriorities]);

      return {
        ...safePrev,
        [nxtKey]: { ...nxtBlock, priorities: merged },
      };
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Weekly priorities</div>
        <div className="text-xs opacity-60">{weekKey}</div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={!canEdit}
          onClick={copyLastWeek}
        >
          Copy last week
        </button>

        <button
          type="button"
          className="flex-1 rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={!canEdit}
          onClick={pushUnfinishedToNextWeek}
        >
          Push → next week
        </button>

        <button
          type="button"
          className="rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={!canEdit}
          onClick={clearThisWeek}
        >
          Clear
        </button>
      </div>

      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-70">This week’s priorities</div>
          <div className="space-y-2">
            {weeklyPriorities.map((v, i) => (
              <input
                key={`p-${i}`}
                value={v}
                disabled={!canEdit}
                onChange={(e) => setWeeklyRow("priorities", i, e.target.value)}
                placeholder={`Priority ${i + 1}`}
                className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-70">Nice to do (if energy)</div>
          <div className="space-y-2">
            {weeklyNice.map((v, i) => (
              <input
                key={`n-${i}`}
                value={v}
                disabled={!canEdit}
                onChange={(e) => setWeeklyRow("nice", i, e.target.value)}
                placeholder={`Nice to do ${i + 1}`}
                className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
              />
            ))}
          </div>
        </div>

        {!canEdit && (
          <div className="text-xs opacity-60">Weekly priorities are view-only for past days.</div>
        )}
      </div>
    </div>
  );
}
