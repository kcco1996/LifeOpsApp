import { useMemo } from "react";

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
}

function formatShort(key) {
  const d = keyToDate(key);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function findNextDayOfType({
  fromKey,
  targetType,
  dayTypeByDate,
  defaultDayTypeFor,
  lookaheadDays = 60,
}) {
  // Search from tomorrow onwards
  for (let i = 1; i <= lookaheadDays; i++) {
    const k = addDays(fromKey, i);
    const t = dayTypeByDate?.[k] ?? (defaultDayTypeFor ? defaultDayTypeFor(k) : "");
    if (t === targetType) return k;
  }
  return null;
}

function MiniCard({ title, subtitle, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl border border-white/10 bg-card2 p-3 text-left",
        "hover:opacity-90 active:opacity-80 disabled:opacity-60",
      ].join(" ")}
    >
      <div className="text-xs font-semibold opacity-80">{title}</div>
      <div className="mt-1 text-sm font-semibold">{subtitle}</div>
    </button>
  );
}

export default function NextUpCard({
  todayKey,
  dayTypeByDate,
  defaultDayTypeFor,
  onSelectDay,
}) {
  const nextOffice = useMemo(
    () =>
      findNextDayOfType({
        fromKey: todayKey,
        targetType: "Office day",
        dayTypeByDate,
        defaultDayTypeFor,
      }),
    [todayKey, dayTypeByDate, defaultDayTypeFor]
  );

  const nextUni = useMemo(
    () =>
      findNextDayOfType({
        fromKey: todayKey,
        targetType: "Uni day",
        dayTypeByDate,
        defaultDayTypeFor,
      }),
    [todayKey, dayTypeByDate, defaultDayTypeFor]
  );

  const nextGroundhop = useMemo(
    () =>
      findNextDayOfType({
        fromKey: todayKey,
        targetType: "Groundhop day",
        dayTypeByDate,
        defaultDayTypeFor,
      }),
    [todayKey, dayTypeByDate, defaultDayTypeFor]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Next up</div>
        <div className="text-xs opacity-60">from {todayKey}</div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <MiniCard
          title="Next Office day"
          subtitle={nextOffice ? `${formatShort(nextOffice)} • ${nextOffice}` : "None found (next 60 days)"}
          disabled={!nextOffice}
          onClick={() => nextOffice && onSelectDay?.(nextOffice)}
        />

        <MiniCard
          title="Next Uni day"
          subtitle={nextUni ? `${formatShort(nextUni)} • ${nextUni}` : "None found (next 60 days)"}
          disabled={!nextUni}
          onClick={() => nextUni && onSelectDay?.(nextUni)}
        />

        <MiniCard
          title="Next Groundhop day"
          subtitle={nextGroundhop ? `${formatShort(nextGroundhop)} • ${nextGroundhop}` : "None found (next 60 days)"}
          disabled={!nextGroundhop}
          onClick={() => nextGroundhop && onSelectDay?.(nextGroundhop)}
        />
      </div>
    </div>
  );
}
