// src/pages/History/History.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDailyHistory } from "../../data/storage/historyDaily";

import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";

// --------- helpers ----------
function keyToDate(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatLabel(key) {
  const d = keyToDate(key);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}
function pillClass(v) {
  if (v === "green") return "bg-green/20 border-green/40 text-green-100";
  if (v === "yellow" || v === "amber") return "bg-amber/20 border-amber/40 text-amber-100";
  if (v === "red") return "bg-red/20 border-red/40 text-red-100";
  return "bg-white/10 border-white/10 text-white/80";
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(items) {
  const cols = [
    "day",
    "trafficLight",
    "status",
    "todoTodayCount",
    "upcomingCount",
    "copingMethod",
    "oneQuestion",
    "gentlePrep",
    "weeklyFocus",
    "energy",
    "focus",
    "stress",
    "updatedAt",
  ];

  const esc = (v) => {
    const s = v == null ? "" : String(v);
    const needs = /[,"\n]/.test(s);
    const cleaned = s.replace(/"/g, '""');
    return needs ? `"${cleaned}"` : cleaned;
  };

  const lines = [cols.join(",")];

  for (const x of items) {
    const row = cols.map((c) => {
      if (c === "energy") return esc(x?.quickCheck?.energy ?? "");
      if (c === "focus") return esc(x?.quickCheck?.focus ?? "");
      if (c === "stress") return esc(x?.quickCheck?.stress ?? "");
      return esc(x?.[c]);
    });
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

function mostCommon(items, getValue) {
  const map = new Map();
  for (const it of items) {
    const v = (getValue(it) ?? "").toString().trim();
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [k, n] of map.entries()) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best ? { value: best, count: bestN } : null;
}

function avgQuick(items, key) {
  const nums = items
    .map((x) => Number(x?.quickCheck?.[key]))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

// --------- page ----------
export default function History() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [trafficFilter, setTrafficFilter] = useState("all"); // all | green | yellow | red
  const [range, setRange] = useState(30); // 7 | 30 | 90 | 120 | 0(all)
  const [expandedDay, setExpandedDay] = useState(null);

  // Load + keep fresh (also updates if localStorage changes in another tab)
  useEffect(() => {
    const load = () => setItems(getDailyHistory() ?? []);
    load();

    const onStorage = (e) => {
      if (e.key && e.key.includes("lifeops:history:daily")) load();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rangeItems = useMemo(() => {
    let list = Array.isArray(items) ? items.slice() : [];
    list.sort((a, b) => String(b.day).localeCompare(String(a.day)));
    if (range && range > 0) list = list.slice(0, range);
    return list;
  }, [items, range]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rangeItems.slice();

    list = list.filter((x) => {
      const t = String(x?.trafficLight || "").toLowerCase();

      if (trafficFilter !== "all") {
        // accept either yellow or amber for the filter
        if (trafficFilter === "yellow") {
          if (!(t === "yellow" || t === "amber")) return false;
        } else if (t !== trafficFilter) return false;
      }

      if (!q) return true;

      const blob = [
        x.day,
        x.copingMethod,
        x.oneQuestion,
        x.gentlePrep,
        x.weeklyFocus,
        String(x.status ?? ""),
        ...(Array.isArray(x.weeklyPriorities) ? x.weeklyPriorities : []),
        ...(Array.isArray(x.weeklyChecklist) ? x.weeklyChecklist : []),
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });

    return list;
  }, [rangeItems, query, trafficFilter]);

  const summary = useMemo(() => {
    const mostTraffic = mostCommon(rangeItems, (x) =>
      x?.trafficLight === "amber" ? "yellow" : x?.trafficLight
    );
    const bestCoping = mostCommon(rangeItems, (x) => x?.copingMethod);

    const avgE7 = avgQuick(rangeItems.slice(0, 7), "energy");
    const avgF7 = avgQuick(rangeItems.slice(0, 7), "focus");
    const avgS7 = avgQuick(rangeItems.slice(0, 7), "stress");

    const avgE30 = avgQuick(rangeItems.slice(0, 30), "energy");
    const avgF30 = avgQuick(rangeItems.slice(0, 30), "focus");
    const avgS30 = avgQuick(rangeItems.slice(0, 30), "stress");

    const red = rangeItems.filter((x) => String(x?.trafficLight || "").toLowerCase() === "red");

    const redHelps = (() => {
      const map = new Map();
      for (const x of red) {
        const v = String(x?.copingMethod || "").trim();
        if (!v) continue;
        map.set(v, (map.get(v) ?? 0) + 1);
      }
      const arr = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      return arr.map(([name, count]) => ({ name, count }));
    })();

    return {
      mostTraffic,
      bestCoping,
      avgE7,
      avgF7,
      avgS7,
      avgE30,
      avgF30,
      avgS30,
      redHelps,
    };
  }, [rangeItems]);

  const onExportCSV = useCallback(() => {
    const csv = toCSV(rangeItems);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`life-ops-history-${stamp}.csv`, csv);
  }, [rangeItems]);

  const toggleExpanded = useCallback((day) => {
    setExpandedDay((cur) => (cur === day ? null : day));
  }, []);

  const rangeButtons = useMemo(
    () => [
      { label: "7", val: 7 },
      { label: "30", val: 30 },
      { label: "90", val: 90 },
      { label: "120", val: 120 },
      { label: "All", val: 0 },
    ],
    []
  );

  return (
    <div className="max-w-md p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple">Daily History</h1>
        <div className="text-xs opacity-60">Patterns over time (saved automatically)</div>
      </div>

      {/* Controls */}
      <Card title="Controls">
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (e.g. 'office', 'walk', 'red')"
            aria-label="Search history"
          />

          <div className="flex flex-wrap gap-2">
            {rangeButtons.map((b) => (
              <Button
                key={b.label}
                variant={range === b.val ? "purple" : "card"}
                onClick={() => setRange(b.val)}
              >
                {b.label} days
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-xs opacity-80 flex items-center gap-2">
              Traffic:
              <select
                value={trafficFilter}
                onChange={(e) => setTrafficFilter(e.target.value)}
                className="min-h-[44px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                aria-label="Traffic filter"
              >
                <option value="all">All</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
                <option value="red">Red</option>
              </select>
            </label>

            <Button onClick={onExportCSV}>Export CSV</Button>
          </div>

          <div className="text-xs opacity-60">Showing: {filtered.length} entries</div>
        </div>
      </Card>

      {/* Summary */}
      <Card title="Summary">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-80">Most common traffic light</span>
            <span className={`rounded-full border px-3 py-1 text-xs ${pillClass(summary.mostTraffic?.value)}`}>
              {summary.mostTraffic?.value?.toUpperCase?.() ?? "—"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="opacity-80">Best coping (most used)</span>
            <span className="text-sm font-semibold">{summary.bestCoping?.value ?? "—"}</span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { label: "Avg Energy", v: summary.avgE7, sub: "last 7" },
              { label: "Avg Focus", v: summary.avgF7, sub: "last 7" },
              { label: "Avg Stress", v: summary.avgS7, sub: "last 7" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl bg-card2 p-3">
                <div className="text-xs opacity-70">{b.label}</div>
                <div className="text-lg font-semibold">{b.v ?? "—"}</div>
                <div className="text-[11px] opacity-60">{b.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { label: "Avg Energy", v: summary.avgE30, sub: "last 30" },
              { label: "Avg Focus", v: summary.avgF30, sub: "last 30" },
              { label: "Avg Stress", v: summary.avgS30, sub: "last 30" },
            ].map((b) => (
              <div key={b.label + b.sub} className="rounded-xl bg-card2 p-3">
                <div className="text-xs opacity-70">{b.label}</div>
                <div className="text-lg font-semibold">{b.v ?? "—"}</div>
                <div className="text-[11px] opacity-60">{b.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold opacity-70">What helps on Red days</div>
            {summary.redHelps.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.redHelps.map((x) => (
                  <span key={x.name} className="rounded-full bg-card2 px-3 py-1 text-xs">
                    {x.name} <span className="opacity-60">×{x.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-70 mt-1">No Red-day coping logged yet.</div>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card title="No history yet">
          <div className="text-sm opacity-80">
            Go to Home, make a small change (status / note), wait ~1 second, then come back.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((x) => {
            const open = expandedDay === x.day;
            const traffic = (x.trafficLight === "amber" ? "yellow" : x.trafficLight) || "—";

            return (
              <Card key={x.day} className="p-0">
                <button
                  className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-purple/60 rounded-2xl"
                  onClick={() => toggleExpanded(x.day)}
                  aria-expanded={open}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {formatLabel(x.day)} <span className="opacity-60 text-xs">({x.day})</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs ${pillClass(traffic)}`}>
                          {String(traffic).toUpperCase()}
                        </span>

                        <span className="text-xs opacity-70">
                          Energy: <b>{x?.quickCheck?.energy ?? "—"}</b>
                        </span>
                        <span className="text-xs opacity-70">
                          Focus: <b>{x?.quickCheck?.focus ?? "—"}</b>
                        </span>
                        <span className="text-xs opacity-70">
                          Stress: <b>{x?.quickCheck?.stress ?? "—"}</b>
                        </span>

                        {typeof x.todoTodayCount === "number" && (
                          <span className="text-xs opacity-70">
                            Today tasks: <b>{x.todoTodayCount}</b>
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm opacity-80">
                        Focus: <b>{x.weeklyFocus || "—"}</b>
                        {x.copingMethod ? (
                          <>
                            <span className="opacity-60"> • </span>
                            Coping: <b>{x.copingMethod}</b>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className={`min-h-[44px] flex items-center rounded-xl px-3 text-sm ${open ? "bg-purple/25" : "bg-card2"}`}>
                      {open ? "Hide" : "Details"}
                    </div>
                  </div>
                </button>

                {open ? (
                  <div className="px-4 pb-4 space-y-3 text-sm opacity-90">
                    <div>
                      <div className="text-xs font-semibold opacity-70">One question</div>
                      <div className="whitespace-pre-wrap">{x.oneQuestion || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold opacity-70">Gentle prep</div>
                      <div className="whitespace-pre-wrap">{x.gentlePrep || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold opacity-70">Weekly priorities</div>
                      <div className="opacity-80">
                        {Array.isArray(x.weeklyPriorities) && x.weeklyPriorities.length
                          ? x.weeklyPriorities.join(", ")
                          : "—"}
                      </div>
                    </div>

                    <div className="text-xs opacity-60">
                      Updated: {x.updatedAt ? new Date(x.updatedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="ghost" onClick={() => window.history.back()}>
        ← Back
      </Button>
    </div>
  );
}
