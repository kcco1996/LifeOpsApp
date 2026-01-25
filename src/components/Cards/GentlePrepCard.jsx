import BaseCard from "./BaseCard";

export default function GentlePrepCard({
  suggestion,
  canEdit,
  done,
  onDone,
  onUndo,
}) {
  const right = done ? "Done ✅" : "For tomorrow";

  return (
    <BaseCard title="GENTLE PREP" icon="🧳" right={right}>
      <div className="space-y-3">
        <p className="text-sm opacity-85 whitespace-pre-wrap">
          {suggestion || "No suggestion right now."}
        </p>

        {!done ? (
          <button
            className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40"
            disabled={!canEdit}
            onClick={onDone}
          >
            Mark as done
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={onUndo}
              disabled={!canEdit}
            >
              Undo
            </button>
            <div className="flex-1 rounded-xl bg-purple/20 px-3 py-2 text-sm text-center opacity-90">
              You’re set.
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
