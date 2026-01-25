import BaseCard from "./BaseCard";

export default function CheckInCard({ status, onSetStatus, canEdit }) {
  const label =
    status === "green" ? "Green" : status === "amber" ? "Amber" : "Red";

  const helper =
    status === "green"
      ? "Steady day. Keep routines simple."
      : status === "amber"
      ? "Some support might help today."
      : "Let’s make today safe and small.";

  return (
    <BaseCard title="CHECK-IN" icon="🚦" right={canEdit ? "Today" : "Past"}>
      <div className="space-y-3">
        <div className="text-sm opacity-85">
          Status: <span className="font-semibold">{label}</span>
        </div>

        <div className="text-sm opacity-75">{helper}</div>

        <div className="flex gap-2">
          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40 ${
              status === "green" ? "bg-purple font-semibold" : "bg-card2"
            }`}
            onClick={() => onSetStatus("green")}
            disabled={!canEdit}
          >
            🟢 Green
          </button>

          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40 ${
              status === "amber" ? "bg-purple font-semibold" : "bg-card2"
            }`}
            onClick={() => onSetStatus("amber")}
            disabled={!canEdit}
          >
            🟡 Amber
          </button>

          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40 ${
              status === "red" ? "bg-purple font-semibold" : "bg-card2"
            }`}
            onClick={() => onSetStatus("red")}
            disabled={!canEdit}
          >
            🔴 Red
          </button>
        </div>

        {!canEdit && (
          <div className="text-xs opacity-60">Past days are view-only.</div>
        )}
      </div>
    </BaseCard>
  );
}
