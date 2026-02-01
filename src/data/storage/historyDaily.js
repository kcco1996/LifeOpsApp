// src/data/storage/historyDaily.js

const HISTORY_KEY = "lifeops:history:daily";
const KEEP_DAYS = 120; // change if you want

function isoDay(d = new Date()) {
  // local date -> YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getDailyHistory() {
  return safeParse(localStorage.getItem(HISTORY_KEY), []);
}

export function setDailyHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

/**
 * Upserts (insert/update) a single day entry.
 * Ensures only one entry per YYYY-MM-DD.
 */
export function upsertDailyEntry(entry) {
  if (!entry?.day) throw new Error("Daily entry must include day (YYYY-MM-DD).");

  const items = getDailyHistory();

  const idx = items.findIndex((x) => x.day === entry.day);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...entry, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({ ...entry, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  // sort newest first
  items.sort((a, b) => String(b.day).localeCompare(String(a.day)));

  // prune older than KEEP_DAYS
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cutoffDay = isoDay(cutoff);

  const pruned = items.filter((x) => x.day >= cutoffDay);

  setDailyHistory(pruned);
  return pruned;
}

/**
 * Convenience: build a daily entry from the fields you already have on Home.
 * You decide what to include; keep it small & meaningful.
 */
export function logTodaySnapshot({
  trafficLight,
  copingMethod,
  oneQuestion,
  gentlePrep,
  weeklyFocus,
  weeklyPriorities,
  weeklyChecklist,
  todoToday,
  status,
  upcoming,
}) {
  const day = isoDay();

  return upsertDailyEntry({
    day,
    trafficLight: trafficLight ?? null,
    status: status ?? null,
    copingMethod: copingMethod ?? "",
    oneQuestion: oneQuestion ?? "",
    gentlePrep: gentlePrep ?? "",
    weeklyFocus: weeklyFocus ?? "",
    weeklyPriorities: weeklyPriorities ?? [],
    weeklyChecklist: weeklyChecklist ?? [],
    todoTodayCount: Array.isArray(todoToday) ? todoToday.length : null,
    upcomingCount: Array.isArray(upcoming) ? upcoming.length : null,
  });
}
