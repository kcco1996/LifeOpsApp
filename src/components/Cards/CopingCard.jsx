import BaseCard from "./BaseCard";

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-card2 px-2.5 py-1 text-xs opacity-90">
      {children}
    </span>
  );
}

export default function CopingCard({
  status,
  canEdit,
  onPrimaryAction,
  onReduceScreen,
}) {
  const title =
    status === "green"
      ? "MAINTAIN"
      : status === "amber"
      ? "ADJUST"
      : "SUPPORT";

  const intro =
    status === "green"
      ? "Keep it steady. Small wins are enough."
      : status === "amber"
      ? "A few adjustments can protect your energy."
      : "Let’s make things safe and simple.";

  const suggestions =
    status === "green"
      ? [
          "Do one small task first",
          "Keep routines predictable",
          "Plan a short break",
        ]
      : status === "amber"
      ? [
          "Lower expectations (reduce load)",
          "Prepare one stress point",
          "Add a decompression break",
        ]
      : [
          "Headphones + quiet space",
          "Short grounding (30–60s)",
          "Ask for help sooner",
        ];

  const primaryLabel =
    status === "red" ? "Open Brain in Hand" : "Pick a gentle action";

  return (
    <BaseCard title="COPING" icon="🧩" right={title}>
      <div className="space-y-3">
        <div className="text-sm opacity-80">{intro}</div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Pill key={s}>{s}</Pill>
          ))}
        </div>

        <div className="space-y-2">
          <button
            className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40"
            disabled={!canEdit}
            onClick={onPrimaryAction}
          >
            {primaryLabel}
          </button>

          {status === "red" && (
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40"
                disabled={!canEdit}
                onClick={onReduceScreen}
              >
                Reduce screen
              </button>

              <button
                className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40"
                disabled={!canEdit}
                onClick={() => {
                  // simple safe default action for now
                  if (navigator?.vibrate) navigator.vibrate(30);
                }}
              >
                30s reset
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="text-xs opacity-60">Past days are view-only.</div>
          )}
        </div>
      </div>
    </BaseCard>
  );
}
