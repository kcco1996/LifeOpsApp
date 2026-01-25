import { useEffect, useState } from "react";

const PRESETS = [
  "Office day",
  "Uni day",
  "Remote work day",
  "Groundhop day",
  "Rest day",
];

export default function DayTypeEditorSheet({
  open,
  onClose,
  value,
  canEdit,
  onSave,
}) {
  const [selected, setSelected] = useState(value || "");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    setSelected(value || "");
    setCustom("");
  }, [value, open]);

  if (!open) return null;

  const isPreset = PRESETS.includes(selected);
  const finalValue = (isPreset ? selected : (custom || selected)).trim();

  function save() {
    if (!canEdit) return;
    onSave(finalValue);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-2xl border border-white/10 bg-bg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">Day type</div>
          <button
            className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {!canEdit ? (
          <div className="mt-3 text-sm opacity-80">
            View only for past days.
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {PRESETS.map((label) => {
                const active = selected === label;
                return (
                  <button
                    key={label}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:opacity-90 ${
                      active ? "bg-purple/25" : "bg-card2"
                    }`}
                    onClick={() => setSelected(label)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <div className="text-xs opacity-70 mb-2">Custom (optional)</div>
              <input
                value={custom}
                onChange={(e) => {
                  setSelected(""); // indicate custom
                  setCustom(e.target.value);
                }}
                placeholder="e.g. Family day / Travel day"
                className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
              />
              <div className="mt-2 text-xs opacity-60">
                Tip: presets are easiest, but custom is there if you need it.
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                onClick={save}
                disabled={!finalValue}
              >
                Save
              </button>
              <button
                className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
