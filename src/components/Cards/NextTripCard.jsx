export default function NextTripCard({ canEdit, value, onChange, onClear }) {
  const v = value ?? { title: "", date: "", location: "", notes: "" };

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold opacity-90">Next trip</div>

        <button
          className="rounded-xl bg-card2 px-3 py-2 text-xs hover:opacity-90 active:opacity-80 disabled:opacity-50"
          disabled={!canEdit}
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <input
          value={v.title}
          disabled={!canEdit}
          onChange={(e) => onChange({ ...v, title: e.target.value })}
          placeholder="Trip name (e.g., Vienna weekend)"
          className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
        />

        <div className="flex gap-2">
          <input
            value={v.date}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...v, date: e.target.value })}
            placeholder="Date (e.g., 2026-02-12)"
            className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
          <input
            value={v.location}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...v, location: e.target.value })}
            placeholder="Location"
            className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>

        <textarea
          value={v.notes}
          disabled={!canEdit}
          onChange={(e) => onChange({ ...v, notes: e.target.value })}
          placeholder="Notes (hotel, travel time, key things to do)"
          className="w-full min-h-[84px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
        />

        {!canEdit && <div className="text-xs opacity-60">View-only for past days.</div>}
      </div>
    </div>
  );
}
