import { useMemo } from "react";

// -------- Date helpers (local time) --------
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

function addDaysToDate(d, delta) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function formatShort(key) {
  const d = keyToDate(key);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function dotClass(status) {
  if (status === "green") return "bg-green";
  if (status === "amber") return "bg-amber";
  return "bg-red";
}

export default function WeekAtAGlanceCard({
  selectedKey,
  onSelectKey,
  statusByDate,
  dayTypeByDate,
  defaultDayTypeFor,
}) {
  const days = useMemo(() => {
    const d = keyToDate(selectedKey);
    const dow = d.getDay(); // 0 Sun ... 6 Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow; // shift back to Monday
    const monday = addDaysToDate(d, mondayOffset);

    // Monday..Sunday (7)
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDaysToDate(monday, i);
      const key = dateToKey(dayDate);
      const status = statusByDate?.[key] ?? "amber";
      const type = dayTypeByDate?.[key] ?? defaultDayTypeFor(key);
      return { key, status, type };
    });
  }, [selectedKey, statusByDate, dayTypeByDate, defaultDayTypeFor]);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="text-sm font-semibold opacity-90">This week at a glance</div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const isSelected = d.key === selectedKey;

          return (
            <button
              key={d.key}
              type="button"
              className={`rounded-xl px-2 py-2 text-left text-xs hover:opacity-90 active:opacity-80 ${
                isSelected ? "bg-purple/25" : "bg-card2"
              }`}
              onClick={() => onSelectKey(d.key)}
              title={`${labels[i]} ${formatShort(d.key)} • ${d.type}`}
            >
              <div className="flex items-center justify-between">
                <div className="opacity-80">{labels[i]}</div>
                <span className={`h-2 w-2 rounded-full ${dotClass(d.status)}`} />
              </div>

              <div className="mt-1 text-[10px] opacity-70">{formatShort(d.key)}</div>
              <div className="mt-1 line-clamp-2 text-[10px] opacity-80">{d.type}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] opacity-60">
        Tip: click a day to jump there. Dot = status (green/amber/red).
      </div>
    </div>
  );
}
