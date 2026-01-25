export default function WeeklyFocusCard({
  title = "This week",
  weekLabel,
  priorities,
  niceToDo,
  canEdit,
  onChangePriorities,
  onChangeNiceToDo,
}) {
  function update(list, idx, value) {
    const next = [...list];
    next[idx] = value;
    return next;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold opacity-90">{title}</div>
        {weekLabel && <div className="text-xs opacity-60">{weekLabel}</div>}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Priorities */}
        <div className="rounded-2xl bg-card2 p-3 space-y-2">
          <div className="text-xs font-semibold opacity-80">This week’s priorities</div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <input
                key={`p-${i}`}
                className="w-full rounded-xl bg-bg/40 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/20"
                placeholder={`Priority ${i + 1}`}
                value={priorities?.[i] ?? ""}
                disabled={!canEdit}
                onChange={(e) => onChangePriorities(update(priorities, i, e.target.value))}
              />
            ))}
          </div>
        </div>

        {/* Nice to do */}
        <div className="rounded-2xl bg-card2 p-3 space-y-2">
          <div className="text-xs font-semibold opacity-80">Nice to do (if energy)</div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <input
                key={`n-${i}`}
                className="w-full rounded-xl bg-bg/40 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/20"
                placeholder={`Nice to do ${i + 1}`}
                value={niceToDo?.[i] ?? ""}
                disabled={!canEdit}
                onChange={(e) => onChangeNiceToDo(update(niceToDo, i, e.target.value))}
              />
            ))}
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="text-xs opacity-60">
          View only for past dates.
        </div>
      )}
    </div>
  );
}
