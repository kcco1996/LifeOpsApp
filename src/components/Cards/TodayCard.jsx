import { useEffect, useMemo, useState } from "react";
import BaseCard from "./BaseCard";

function todayKey() {
  // Local date key, e.g. 2026-01-22
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

    export default function TodayCard({ dateKey, tasks, onChangeTasks, readOnly = false }) {
  const [draft, setDraft] = useState(tasks ?? []);
  const [isEditing, setIsEditing] = useState(false);

  // Keep draft synced if parent loads data
  useEffect(() => setDraft(tasks ?? []), [tasks]);

  const canSave = useMemo(() => {
    const trimmed = draft.map(t => (t || "").trim()).filter(Boolean);
    return trimmed.length > 0;
  }, [draft]);

  useEffect(() => {
  if (readOnly && isEditing) {
    setIsEditing(false);
    setDraft(tasks ?? []);
  }
}, [readOnly, isEditing, tasks]);

  function startEdit() {
    setIsEditing(true);
  }

  function cancelEdit() {
    setDraft(tasks ?? []);
    setIsEditing(false);
  }

  function save() {
    const trimmed = draft.map(t => (t || "").trim()).filter(Boolean).slice(0, 5);
    onChangeTasks(trimmed);
    setIsEditing(false);
  }

  function updateRow(i, value) {
    setDraft(prev => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  function addRow() {
    setDraft(prev => [...prev, ""]);
  }

  function removeRow(i) {
    setDraft(prev => prev.filter((_, idx) => idx !== i));
  }

const right = readOnly ? "View only" : (isEditing ? "Editing" : "Tap to edit");

  return (
    <BaseCard
      title="TODAY"
      right={right}
      icon="✅"
    >
      {!isEditing ? (
        <div className="space-y-3">
          {(!tasks || tasks.length === 0) ? (
            <p className="text-sm opacity-75">
              No tasks yet. Keep it small — 1–3 is perfect.
            </p>
          ) : (
            <ul className="space-y-2 text-sm opacity-90">
              {tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-lavender/60" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}

         <button
  className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50"
  onClick={startEdit}
  disabled={readOnly}
>
  {readOnly ? "View only" : "Edit today"}
</button>

          <div className="text-xs opacity-50">
            Saved per day: {dateKey}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {draft.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={t}
                  onChange={(e) => updateRow(i, e.target.value)}
                  placeholder={`Task ${i + 1}`}
                  className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                />
                <button
                  className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
                  onClick={() => removeRow(i)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
            onClick={addRow}
          >
            + Add task
          </button>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
              onClick={save}
              disabled={!canSave}
            >
              Save
            </button>
            <button
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>

          <p className="text-xs opacity-60">
            Keep it gentle. Aim for 1–3 tasks.
          </p>
        </div>
      )}
    </BaseCard>
  );
}
