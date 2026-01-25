export default function SupportSheet({
  open,
  onClose,
  status,
  plan,
  canEdit,
  onEditPlan,
}) {
  if (!open) return null;

  const title =
    status === "green"
      ? "Maintain plan"
      : status === "amber"
      ? "Adjust plan"
      : "Red day support";

  const helper =
    status === "green"
      ? "Keep routines steady. Small wins are enough."
      : status === "amber"
      ? "Make small adjustments to protect energy."
      : "You’re not alone. Keep it safe and simple.";

  return (
    <div className="fixed inset-0 z-100" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="absolute left-0 right-0 bottom-20 rounded-t-2xl border border-white/10 bg-bg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold opacity-90">{title}</div>
            <div className="text-xs opacity-70 mt-0.5">{helper}</div>
          </div>

          <button
            className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-card2 p-3">
            <div className="text-xs opacity-70 mb-2">Your plan</div>
            <div className="text-sm whitespace-pre-wrap opacity-90">
              {plan || "No plan set yet."}
            </div>
          </div>

          <button
            className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40"
            disabled={!canEdit}
            onClick={onEditPlan}
          >
            {plan ? "Edit plan" : "Add plan"}
          </button>

          {status === "red" && (
            <div className="space-y-2">
              <button className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90">
                Call support (placeholder)
              </button>
              <button className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90">
                Text support (placeholder)
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="text-xs opacity-60">
              Past days are view-only.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
