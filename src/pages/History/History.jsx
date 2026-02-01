// src/pages/History/History.jsx
import React, { useMemo, useState } from "react";
import { getDailyHistory } from "../../data/storage/historyDaily";

function TrafficPill({ value }) {
  const label = value ? String(value).toUpperCase() : "—";
  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #ddd", fontSize: 12 }}>
      {label}
    </span>
  );
}

function Card({ children }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 12 }}>
      {children}
    </div>
  );
}

export default function History() {
  const [query, setQuery] = useState("");
  const [trafficFilter, setTrafficFilter] = useState("all"); // all | green | yellow | red
  const [expandedDay, setExpandedDay] = useState(null);

  const items = useMemo(() => getDailyHistory(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((x) => {
      if (trafficFilter !== "all" && String(x.trafficLight) !== trafficFilter) return false;
      if (!q) return true;

      const blob = [
        x.day,
        x.copingMethod,
        x.oneQuestion,
        x.gentlePrep,
        x.weeklyFocus,
        String(x.status ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [items, query, trafficFilter]);

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h1>Daily History</h1>
      <p style={{ marginTop: 6 }}>
        This shows your day-by-day pattern: traffic light, status, and what supported you.
      </p>

      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (e.g. 'walk', 'red', 'focus')"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 240 }}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Traffic:
            <select value={trafficFilter} onChange={(e) => setTrafficFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </label>

          <span style={{ fontSize: 13, opacity: 0.8 }}>
            Entries: {filtered.length}
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p>No history yet. Use the Home page normally and it will start appearing here.</p>
        </Card>
      ) : (
        filtered.map((x) => {
          const open = expandedDay === x.day;
          return (
            <Card key={x.day}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 16 }}>{x.day}</strong>
                    <TrafficPill value={x.trafficLight} />
                    <span style={{ fontSize: 13, opacity: 0.85 }}>
                      Status: <b>{x.status ?? "—"}</b>
                    </span>
                    {typeof x.todoTodayCount === "number" ? (
                      <span style={{ fontSize: 13, opacity: 0.85 }}>Today: <b>{x.todoTodayCount}</b></span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    {x.weeklyFocus ? <span>Focus: <b>{x.weeklyFocus}</b></span> : <span>Focus: —</span>}
                    {x.copingMethod ? <span> • Coping: <b>{x.copingMethod}</b></span> : null}
                  </div>
                </div>

                <button onClick={() => setExpandedDay(open ? null : x.day)}>
                  {open ? "Hide" : "Details"}
                </button>
              </div>

              {open ? (
                <div style={{ marginTop: 12, lineHeight: 1.55 }}>
                  <p><b>One question:</b> {x.oneQuestion || "—"}</p>
                  <p><b>Gentle prep:</b> {x.gentlePrep || "—"}</p>

                  <p><b>Weekly priorities:</b> {Array.isArray(x.weeklyPriorities) && x.weeklyPriorities.length
                    ? x.weeklyPriorities.join(", ")
                    : "—"}</p>

                  <p><b>Weekly checklist:</b> {Array.isArray(x.weeklyChecklist) && x.weeklyChecklist.length
                    ? x.weeklyChecklist.join(", ")
                    : "—"}</p>

                  <p style={{ fontSize: 12, opacity: 0.7 }}>
                    Updated: {x.updatedAt ? new Date(x.updatedAt).toLocaleString() : "—"}
                  </p>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
