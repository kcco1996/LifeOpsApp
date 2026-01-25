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

function startOfWeekMonday(dayKey) {
  const d = keyToDate(dayKey);
  // JS: 0 Sun, 1 Mon ... 6 Sat
  const jsDow = d.getDay();
  const offsetToMonday = (jsDow + 6) % 7; // Mon->0, Tue->1 ... Sun->6
  d.setDate(d.getDate() - offsetToMonday);
  return dateToKey(d);
}

function addDays(dayKey, n) {
  const d = keyToDate(dayKey);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
}

function shortDowFromKey(key) {
  const d = keyToDate(key);
  return d.toLocaleDateString("en-GB", { weekday: "short" }); // Mon, Tue...
}

function statusDotClass(status) {
  if (status === "green") return "bg-green";
  if (status === "red") return "bg-red";
  return "bg-amber";
}

export default function ThisWeekCard({
  selectedKey,
  todayKey,
  statusByDate,
  dayTypeByDate,
  defaultDayTypeFor,
  onSelectDay,
}) {
  const weekStart = useMemo(() => startOfWeekMonday(selectedKey), [selectedKey]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">This week</div>
        <div className="text-xs opacity-60">{weekStart} → {addDays(weekStart, 6)}</div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((k) => {
          const status = statusByDate?.[k] ?? "amber";
          const isToday = k === todayKey;
          const isSelected = k === selectedKey;

          const dayType = dayTypeByDate?.[k] ?? (defaultDayTypeFor ? defaultDayTypeFor(k) : "");
          const typeShort =
            dayType === "Office day" ? "Office" :
            dayType === "Uni day" ? "Uni" :
            dayType === "Remote work day" ? "Remote" :
            dayType === "Groundhop day" ? "Match" :
            dayType === "Rest day" ? "Rest" :
            (dayType || "").split(" ")[0];

          return (
            <button
              key={k}
              onClick={() => onSelectDay?.(k)}
              className={[
                "rounded-xl bg-card2 p-2 text-left hover:opacity-90 active:opacity-80",
                isSelected ? "ring-2 ring-purple/70" : "",
              ].join(" ")}
              title={`${k} • ${dayType} • ${status}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-80">{shortDowFromKey(k)}</div>
                <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(status)}`} />
              </div>

              <div className="mt-1 text-xs opacity-70 truncate">{typeShort}</div>

              {isToday && (
                <div className="mt-1 text-[10px] font-semibold opacity-90">Today</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
