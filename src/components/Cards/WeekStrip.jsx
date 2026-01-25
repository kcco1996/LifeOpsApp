import BaseCard from "./BaseCard";

function dotClass(status) {
  if (status === "green") return "bg-green";
  if (status === "red") return "bg-red";
  return "bg-amber";
}

export default function WeekStrip({
  title = "THIS WEEK",
  weekKeys,
  selectedKey,
  statusByDate,
  dayTypeForKey,
  prepDoneByDate,
  onSelect,
}) {
  return (
    <BaseCard title={title} icon="🗓️" right="Tap a day">
      <div className="grid grid-cols-7 gap-2">
        {weekKeys.map((k) => {
          const d = new Date(k);
          const label = new Date(k).toLocaleDateString("en-GB", { weekday: "short" });
          const status = statusByDate[k] ?? "amber";
          const isSelected = k === selectedKey;
          const dayType = dayTypeForKey(k);
          const done = !!prepDoneByDate?.[k];

          return (
            <button
              key={k}
              className={`rounded-xl px-2 py-2 text-left text-xs hover:opacity-90 active:opacity-80 ${
                isSelected ? "bg-purple/25" : "bg-card2"
              }`}
              onClick={() => onSelect(k)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{label}</span>
                <span className={`h-2 w-2 rounded-full ${dotClass(status)}`} />
              </div>

              <div className="mt-1 opacity-70 truncate">{dayType}</div>

              {done && <div className="mt-1 text-[10px] opacity-70">✓ prep</div>}
            </button>
          );
        })}
      </div>
    </BaseCard>
  );
}