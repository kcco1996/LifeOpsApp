// src/components/Cards/WeeklyStructureCard.jsx
export default function WeeklyStructureCard({ dayType }) {
  const rows = [
    { day: "Mon", label: "Office day" },
    { day: "Tue", label: "Uni day" },
    { day: "Wed", label: "Remote work day" },
    { day: "Thu", label: "Remote work day" },
    { day: "Fri", label: "Remote work day" },
    { day: "Sat", label: "Groundhop day" },
    { day: "Sun", label: "Rest day" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Weekly structure</div>
        <div className="text-xs opacity-60">Your default week</div>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          const isTodayType = r.label === dayType;

          return (
            <div
              key={`${r.day}-${r.label}`}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                isTodayType ? "bg-purple/25 border border-purple/30" : "bg-card2"
              }`}
            >
              <div className="opacity-80">{r.day}</div>
              <div className="font-medium">{r.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs opacity-60">
        Highlight is based on your current <span className="font-semibold">day type</span>.
      </div>
    </div>
  );
}
