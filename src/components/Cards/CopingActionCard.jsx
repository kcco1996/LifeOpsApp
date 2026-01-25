import BaseCard from "./BaseCard";

export default function CopingActionCard({
  status,
  suggestion,
  picked,
  done,
  canEdit,
  onPick,
  onDone,
  onUndo,
}) {
  // We’ll mostly show this on amber/red
  const show = status === "amber" || status === "red";
  if (!show) return null;

  const text = (picked || suggestion || "").trim();

  return (
    <BaseCard title="COPING ACTION" icon="🧩" right={done ? "Done ✅" : "1 tap"}>
      <div className="space-y-3">
        <div className="text-sm opacity-85">
          {text || "Pick one small coping action."}
        </div>

        {canEdit && !done && (
          <div className="space-y-2">
            <button
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => onPick(text)}
            >
              Use this suggestion
            </button>

            <button
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => {
                const next = window.prompt("Your coping action (short):", text);
                if (next != null) onPick(next);
              }}
            >
              Write my own
            </button>

            <button
              className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40"
              disabled={!text}
              onClick={onDone}
            >
              Mark done
            </button>
          </div>
        )}

        {done && (
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-40"
              disabled={!canEdit}
              onClick={onUndo}
            >
              Undo
            </button>
            <div className="flex-1 rounded-xl bg-purple/20 px-3 py-2 text-sm text-center opacity-90">
              Nice. Keep it gentle.
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="text-xs opacity-60">
            Past day (view only).
          </div>
        )}
      </div>
    </BaseCard>
  );
}
