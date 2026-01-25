import { useEffect, useState } from "react";

export default function PlanEditorSheet({
  open,
  onClose,
  title = "Edit plan",
  value,
  canEdit,
  onSave,
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="absolute left-0 right-0 bottom-20 rounded-t-2xl border border-white/10 bg-bg p-4 pb-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">{title}</div>

          <button
            className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <textarea
            className="min-h-[140px] w-full resize-none rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!canEdit}
            placeholder="Write short, practical steps. Keep it gentle."
          />

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40"
              disabled={!canEdit}
              onClick={() => {
                onSave((draft || "").trim());
                onClose();
              }}
            >
              Save
            </button>

            <button
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          {!canEdit && (
            <div className="text-xs opacity-60">Past days are view-only.</div>
          )}
        </div>
      </div>
    </div>
  );
}
