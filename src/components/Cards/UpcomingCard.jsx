import { useEffect, useMemo, useState } from "react";
import { loadAppData, saveAppData } from "../../data/storage/localStorage";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toDateInputValue(date) {
  // yyyy-mm-dd
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

export default function UpcomingCard() {
  const [items, setItems] = useState([]);

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("General");
  const [title, setTitle] = useState("");
  const [dateKey, setDateKey] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState("");

  // load
  useEffect(() => {
    const saved = loadAppData();
    if (Array.isArray(saved?.upcomingItems)) setItems(saved.upcomingItems);
  }, []);

  // save
  useEffect(() => {
    saveAppData({ upcomingItems: items });
  }, [items]);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => (a.dateKey || "").localeCompare(b.dateKey || ""));
    return copy;
  }, [items]);

  function resetForm() {
    setType("General");
    setTitle("");
    setDateKey(toDateInputValue(new Date()));
    setNotes("");
  }

  function addItem() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const newItem = {
      id: uid(),
      type: (type || "General").trim(),
      title: cleanTitle,
      dateKey: dateKey || "",
      notes: (notes || "").trim(),
      done: false,
    };

    setItems((prev) => [newItem, ...prev]);
    resetForm();
    setAdding(false);
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold opacity-90">UPCOMING</div>
          <div className="text-xs opacity-60">Trips, matches, uni deadlines, anything.</div>
        </div>

        <button
          className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Close" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mt-3 space-y-2 rounded-2xl bg-card2 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
            >
              <option>General</option>
              <option>Match</option>
              <option>Trip</option>
              <option>Uni</option>
              <option>Work</option>
            </select>

            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
            />
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. West Ham away / Austria trip / Assignment due)"
            className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — ticket info, hotel, deadline details, etc."
            rows={3}
            className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
          />

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
              onClick={addItem}
            >
              Save
            </button>
            <button
              className="flex-1 rounded-xl bg-bg px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-sm opacity-70">No upcoming items yet.</div>
        ) : (
          sorted.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl bg-card2 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {it.title}
                  </div>
                  <div className="text-xs opacity-70">
                    {it.type} {it.dateKey ? `• ${prettyDate(it.dateKey)} (${it.dateKey})` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl bg-bg px-3 py-2 text-xs hover:opacity-90"
                    onClick={() => updateItem(it.id, { done: !it.done })}
                  >
                    {it.done ? "Undo" : "Done"}
                  </button>

                  <button
                    className="rounded-xl bg-bg px-3 py-2 text-xs hover:opacity-90"
                    onClick={() => removeItem(it.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* editable fields */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={it.type}
                  onChange={(e) => updateItem(it.id, { type: e.target.value })}
                  className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
                >
                  <option>General</option>
                  <option>Match</option>
                  <option>Trip</option>
                  <option>Uni</option>
                  <option>Work</option>
                </select>

                <input
                  type="date"
                  value={it.dateKey || ""}
                  onChange={(e) => updateItem(it.id, { dateKey: e.target.value })}
                  className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
                />
              </div>

              <input
                value={it.title}
                onChange={(e) => updateItem(it.id, { title: e.target.value })}
                className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
              />

              <textarea
                value={it.notes || ""}
                onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                rows={2}
                placeholder="Notes"
                className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none"
              />

              {it.done && (
                <div className="text-xs opacity-60">
                  Marked done ✅ (still saved)
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
