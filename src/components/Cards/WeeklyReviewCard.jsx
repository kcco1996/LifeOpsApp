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

function safeText(v) {
  return typeof v === "string" ? v : "";
}

export default function WeeklyReviewCard({
  selectedKey,
  canEdit,
  weeklyReviewByWeekKey,
  setWeeklyReviewByWeekKey,
}) {
  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const block = weeklyReviewByWeekKey?.[weekKey] ?? {
    wentWell: "",
    drainedMe: "",
    changeNextWeek: "",
    winProudOf: "",
  };

  function setField(field, value) {
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? {
        wentWell: "",
        drainedMe: "",
        changeNextWeek: "",
        winProudOf: "",
      };

      return {
        ...safePrev,
        [weekKey]: {
          ...cur,
          [field]: value,
        },
      };
    });
  }

  function clearReview() {
    if (!canEdit) return;
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      return {
        ...safePrev,
        [weekKey]: {
          wentWell: "",
          drainedMe: "",
          changeNextWeek: "",
          winProudOf: "",
        },
      };
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Weekly review</div>
        <div className="flex items-center gap-2">
          <div className="text-xs opacity-60">{weekKey}</div>
          <button
            className="rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
            disabled={!canEdit}
            onClick={clearReview}
            title="Clear this week's review"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold opacity-70">What went well</div>
          <textarea
            value={safeText(block.wentWell)}
            disabled={!canEdit}
            onChange={(e) => setField("wentWell", e.target.value)}
            placeholder="A couple of sentences is enough."
            className="w-full min-h-[84px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold opacity-70">What drained me</div>
          <textarea
            value={safeText(block.drainedMe)}
            disabled={!canEdit}
            onChange={(e) => setField("drainedMe", e.target.value)}
            placeholder="What cost the most energy?"
            className="w-full min-h-[84px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold opacity-70">One thing I’ll change next week</div>
          <textarea
            value={safeText(block.changeNextWeek)}
            disabled={!canEdit}
            onChange={(e) => setField("changeNextWeek", e.target.value)}
            placeholder="Keep it tiny and practical."
            className="w-full min-h-[72px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold opacity-70">One win I’m proud of</div>
          <textarea
            value={safeText(block.winProudOf)}
            disabled={!canEdit}
            onChange={(e) => setField("winProudOf", e.target.value)}
            placeholder="Even small wins count."
            className="w-full min-h-[72px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>

        {!canEdit && (
          <div className="text-xs opacity-60">Weekly review is view-only for past days.</div>
        )}
      </div>
    </div>
  );
}
