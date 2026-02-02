// src/pages/Home/Home.jsx (complete)
// ✅ Persists everything via loadAppData/saveAppData (localStorage)
// ✅ Hydration guard prevents overwriting saved data on refresh
// ✅ Saves EVERYTHING that gets loaded (including weeklyChecklist + showWeeklyChecklist)
// ✅ Upcoming add/edit/delete persists reliably
// ✅ Firebase sync + migrate button (whitelisted email)
// ✅ FIXED: prevents cloud read -> state set -> cloud write loop (quota spike)

import { useEffect, useMemo, useRef, useState } from "react";

import BrainInHandCard from "../../components/BrainInHand/BrainInHandCard";
import TodayCard from "../../components/Cards/TodayCard";
import PromptCard from "../../components/Cards/PromptCard";
import CheckInCard from "../../components/Cards/CheckInCard";
import CopingCard from "../../components/Cards/CopingCard";
import CopingActionCard from "../../components/Cards/CopingActionCard";
import GentlePrepCard from "../../components/Cards/GentlePrepCard";

import SupportSheet from "../../components/Sheets/SupportSheet";
import PlanEditorSheet from "../../components/Sheets/PlanEditorSheet";
import DayTypeEditorSheet from "../../components/Sheets/DayTypeEditorSheet";
import { upsertDailyEntry } from "../../data/storage/historyDaily";

import { useAuth } from "../../hooks/useAuth";

import {
  subscribeCloudState,
  saveCloudState,
  loadCloudState,
  migrateLocalToCloud,
} from "../../data/storage/lifeOpsCloud";

import { loadAppData, saveAppData } from "../../data/storage/localStorage";

// -------------------- Date helpers --------------------
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(key, delta) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + delta);
  return dateToKey(d);
}

function lastNDaysKeys(n, fromKey) {
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(addDays(fromKey, -i));
  return keys;
}

function formatLabel(key) {
  const d = keyToDate(key);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

// ISO week key: "YYYY-Www"
function isoWeekKeyFromDate(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1..7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}
function isoWeekKeyFromDayKey(dayKey) {
  return isoWeekKeyFromDate(keyToDate(dayKey));
}

function pickByDay(list, dayKey) {
  // stable pick so it doesn't change on every render
  let h = 0;
  const s = String(dayKey || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function prevIsoWeekKey(weekKey) {
  // weekKey like "2026-W05"
  const [yPart, wPart] = String(weekKey).split("-W");
  const y = Number(yPart);
  const w = Number(wPart);

  if (!Number.isFinite(y) || !Number.isFinite(w)) return null;

  if (w > 1) return `${y}-W${String(w - 1).padStart(2, "0")}`;
  // week 1 => previous year, week 52/53 (approx)
  return `${y - 1}-W52`;
}

const PROMPTS = {
  green: [
    "What’s one thing you want to keep the same today?",
    "What’s one small win you can repeat?",
    "What is working — and how do you protect it?",
  ],
  amber: [
    "What support would help today feel easier?",
    "What can you remove to protect your energy?",
    "What’s the smallest version of “success” today?",
  ],
  red: [
    "What’s the smallest safe next step right now?",
    "What do you need less of right now (noise, people, tasks)?",
    "What’s one kind thing you can do for your nervous system?",
  ],
};

function promptForStatus(status, dayKey) {
  const s = status === "amber" ? "amber" : status;
  const list = PROMPTS[s] ?? PROMPTS.amber;
  return pickByDay(list, dayKey);
}

// -------------------- Small helpers (missing in file) --------------------
function ensureNRows(arr, n) {
  const out = Array.isArray(arr) ? arr.slice(0, n) : [];
  while (out.length < n) out.push("");
  return out;
}

function safeId() {
  // stable-enough local id for list items
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Coping suggestion based on status + day type.
// (You can refine this later; this version is designed to NEVER crash.)
function copingSuggestionFor({ status, dayType }) {
  const s = status || "amber";
  const d = dayType || "";

  const base = {
    green: [
      "Pick 1 task and do a 10-minute start.",
      "Water + quick stretch, then one small win.",
      "Keep momentum: do the easiest thing first.",
    ],
    amber: [
      "Reduce inputs: headphones, lower light, one step at a time.",
      "Do a 5-minute reset: water, breathe, and choose one priority.",
      "Swap to the smallest version of success today.",
    ],
    red: [
      "Safety first: pause, breathe slowly, reduce stimulation.",
      "Do one comfort action (warm drink / lie down / quiet room).",
      "Text someone / open Support Sheet / pick one tiny next step.",
    ],
  };

  // tiny dayType tailoring
  const officeExtra = [
    "Commute protection: headphones + exit plan + one calm breath.",
    "Office day: keep it minimal — one essential task only.",
  ];
  const uniExtra = ["Uni day: do the smallest step (5–10 mins) then stop."];
  const groundhopExtra = ["Groundhop day: plan one calm break + easy food/water."];
  const restExtra = ["Rest day: permission to recover — one gentle reset is enough."];

  let list = base[s] ?? base.amber;

  if (d === "Office day" && s !== "green") list = [...officeExtra, ...list];
  if (d === "Uni day" && s !== "green") list = [...uniExtra, ...list];
  if (d === "Groundhop day" && s !== "green") list = [...groundhopExtra, ...list];
  if (d === "Rest day") list = [...restExtra, ...list];

  // stable pick per dayType+status so it doesn’t change constantly
  const key = `${s}|${d}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function gentlePrepSuggestion({ status, tomorrowType }) {
  const s = status || "amber";
  const t = tomorrowType || "";

  if (s === "red") return "Tonight: charge devices, lay out clothes, and pick ONE easy comfort.";
  if (s === "green") return "Set tomorrow up: 1 priority, 1 nice-to-have, and an early wind-down.";
  // amber default
  if (t === "Office day") return "Office tomorrow: pack essentials, choose a calm commute plan, and set 1 small priority.";
  if (t === "Uni day") return "Uni tomorrow: decide the smallest task you’ll do (10 mins) and stop.";
  if (t === "Groundhop day") return "Groundhop tomorrow: plan food/water + one quiet break.";
  return "Tomorrow: choose 1 essential, prep one small thing, and plan one easy comfort.";
}


// -------------------- Home --------------------
export default function Home() {
  const { user, authLoading } = useAuth();

  // prevents “cloud snapshot -> setState -> save -> overwrite cloud” loops
  const applyingRemote = useRef(false);

  // 🔒 NEW: skip exactly one cloud save after applying remote data
  const skipNextCloudSave = useRef(false);

  // one-time migration: if cloud is empty but local has data, upload it once
  const migratedOnce = useRef(false);

  // ----- UI state -----
  const [uiMode, setUiMode] = useState("normal");
  const [selectedKey, setSelectedKey] = useState(todayKey());
  const today = todayKey();

  function defaultDayTypeFor(key) {
    const d = keyToDate(key);
    const dow = d.getDay(); // 0 Sun ... 6 Sat
    if (dow === 1) return "Office day";
    if (dow === 2) return "Uni day";
    if (dow === 3 || dow === 4 || dow === 5) return "Remote work day";
    if (dow === 6) return "Groundhop day";
    return "Rest day";
  }

  const lastCloudJSON = useRef("");

  // ----- Per-day storage -----
  const [tasksByDate, setTasksByDate] = useState({});
  const [promptByDate, setPromptByDate] = useState({});
  const [statusByDate, setStatusByDate] = useState({});
  const [dayTypeByDate, setDayTypeByDate] = useState({});
  const [prepDoneByDate, setPrepDoneByDate] = useState({});
  const [copingDoneByDate, setCopingDoneByDate] = useState({});
  const [copingPickByDate, setCopingPickByDate] = useState({});
  const [supportShownByDate, setSupportShownByDate] = useState({});
  const [quickCheckByDate, setQuickCheckByDate] = useState({}); // { "YYYY-MM-DD": { energy, focus, stress } }

  // ----- Per-status plans -----
  const [supportPlanByStatus, setSupportPlanByStatus] = useState({ green: "", amber: "", red: "" });

  const [carryOpen, setCarryOpen] = useState(false);
  const [carryPick, setCarryPick] = useState({});

  // ----- Weekly storage -----
  const [weeklyByWeekKey, setWeeklyByWeekKey] = useState({});
  const [weeklyChecklistByWeekKey, setWeeklyChecklistByWeekKey] = useState({});
  const [weeklyReviewByWeekKey, setWeeklyReviewByWeekKey] = useState({});
  const [showWeeklyChecklist, setShowWeeklyChecklist] = useState(true);

  // ----- Next trip / match -----
  const [nextTrip, setNextTrip] = useState({ title: "", date: "", location: "", notes: "" });
  const [nextMatch, setNextMatch] = useState({ fixture: "", date: "", ground: "", notes: "" });

  // ----- Upcoming (global list) -----
  const [upcomingItems, setUpcomingItems] = useState([]);

  const [supportOpen, setSupportOpen] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [dayTypeEditorOpen, setDayTypeEditorOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Upcoming editor (inline)
  const [upcomingEditorOpen, setUpcomingEditorOpen] = useState(false);
  const [upcomingEditId, setUpcomingEditId] = useState(null);
  const [upcomingDraft, setUpcomingDraft] = useState({
    type: "match",
    title: "",
    date: "",
    location: "",
    notes: "",
  });

  // ----- Preferences (Section 2) -----
  const [prefs, setPrefs] = useState({
    guardrail: "",
    commuteChecklist: ["Headphones", "Water", "Exit plan", "One calm breath"],
  });

  // ✅ hydration guard
  const [hydrated, setHydrated] = useState(false);

  // Swipe support refs
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // ----- Derived -----
  const selectedTasks = tasksByDate[selectedKey] ?? [];
  const selectedAnswer = promptByDate[selectedKey] ?? "";
  const selectedStatus = statusByDate[selectedKey] ?? "amber";
  const dayType = dayTypeByDate[selectedKey] ?? defaultDayTypeFor(selectedKey);

  const isRed = selectedStatus === "red";
  const isReduced = uiMode === "reduced";
  const isBare = uiMode === "bare";

  const showExtras = !isBare && (!isRed || !isReduced);

  const dailyPrompt = promptForStatus(selectedStatus, selectedKey);
  const canEdit = selectedKey >= today;

  const currentPlan = supportPlanByStatus[selectedStatus] ?? "";
  const copingSuggestion = copingSuggestionFor({ status: selectedStatus, dayType });

  // ✅ yesterday status MUST exist before we build prepSuggestion
  const yesterdayKey = addDays(selectedKey, -1);
  const yesterdayStatus = statusByDate[yesterdayKey] ?? "amber";
  const redYesterday = yesterdayStatus === "red";

  const tomorrowKey = addDays(selectedKey, 1);
  const tomorrowType = dayTypeByDate[tomorrowKey] ?? defaultDayTypeFor(tomorrowKey);

  // ✅ FIX: no invalid return. Override suggestion if yesterday was Red.
  const prepSuggestion =
    redYesterday && selectedStatus !== "red"
      ? "After a Red day: keep tomorrow gentle — choose 1 tiny essential and plan one easy comfort."
      : gentlePrepSuggestion({ status: selectedStatus, tomorrowType });

  const prepDone = !!prepDoneByDate[selectedKey];
  const copingDone = !!copingDoneByDate[selectedKey];
  const pickedCoping = copingPickByDate[selectedKey] ?? "";

  const dateLabel = formatLabel(selectedKey);
  const last30 = useMemo(() => lastNDaysKeys(30, today), [today]);

  const quickCheck = quickCheckByDate[selectedKey] ?? { energy: 2, focus: 2, stress: 3 };

  const weekKey = useMemo(() => isoWeekKeyFromDayKey(selectedKey), [selectedKey]);

  const weeklyBlock = weeklyByWeekKey?.[weekKey] ?? { priorities: [], nice: [] };
  const weeklyPriorities = ensureNRows(weeklyBlock.priorities, 6);
  const weeklyNice = ensureNRows(weeklyBlock.nice, 6);

  const weeklyChecklist = weeklyChecklistByWeekKey?.[weekKey] ?? {
    items: ensureNRows([], 6),
    ticks: [false, false, false, false, false, false],
  };

  const weeklyReview = weeklyReviewByWeekKey?.[weekKey] ?? {
    wentWell: "",
    drained: "",
    change: "",
    win: "",
  };

  // ✅ Sunday / review derived values AFTER weeklyReview exists
  const selectedDateObj = keyToDate(selectedKey);
  const isSunday = selectedDateObj.getDay() === 0;

  const reviewEmpty =
    !(weeklyReview.wentWell || "").trim() &&
    !(weeklyReview.drained || "").trim() &&
    !(weeklyReview.change || "").trim() &&
    !(weeklyReview.win || "").trim();

  const upcomingSorted = useMemo(() => {
    const items = Array.isArray(upcomingItems) ? upcomingItems.slice() : [];
    items.sort((a, b) => {
      const ad = (a?.date || "").trim();
      const bd = (b?.date || "").trim();
      if (ad && bd) return ad.localeCompare(bd);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return (b?.createdAt ?? 0) - (a?.createdAt ?? 0);
    });
    return items;
  }, [upcomingItems]);

  // ----- Swipe handlers -----
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  }

  function onTouchEnd(e) {
    if (touchStartX.current == null || touchStartY.current == null) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < 40) return;

    if (dx < 0) setSelectedKey((k) => addDays(k, 1));
    else setSelectedKey((k) => addDays(k, -1));
  }

  // ----- Update helpers -----
  function setSelectedStatus(nextStatus) {
    setStatusByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: nextStatus }));
  }

  function updateSelectedTasks(nextTasks) {
    setTasksByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: nextTasks }));
  }

  function updateSelectedAnswer(nextText) {
    setPromptByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: nextText }));
  }

  function markPrepDone() {
    setPrepDoneByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: true }));
  }

  function setWeeklyRow(kind, idx, value) {
    setWeeklyByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { priorities: [], nice: [] };
      const nextArr = ensureNRows(cur[kind], 6);
      nextArr[idx] = value;
      return { ...safePrev, [weekKey]: { ...cur, [kind]: nextArr } };
    });
  }

  function setChecklistItem(idx, value) {
    setWeeklyChecklistByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? {
        items: ensureNRows([], 6),
        ticks: [false, false, false, false, false, false],
      };
      const nextItems = ensureNRows(cur.items, 6);
      nextItems[idx] = value;
      return { ...safePrev, [weekKey]: { ...cur, items: nextItems } };
    });
  }

  function toggleChecklistTick(idx) {
    setWeeklyChecklistByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? {
        items: ensureNRows([], 6),
        ticks: [false, false, false, false, false, false],
      };
      const nextTicks = Array.isArray(cur.ticks) ? cur.ticks.slice(0, 6) : [];
      while (nextTicks.length < 6) nextTicks.push(false);
      nextTicks[idx] = !nextTicks[idx];
      return { ...safePrev, [weekKey]: { ...cur, ticks: nextTicks } };
    });
  }

  function resetChecklistTicks() {
    setWeeklyChecklistByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? {
        items: ensureNRows([], 6),
        ticks: [false, false, false, false, false, false],
      };
      return {
        ...safePrev,
        [weekKey]: { ...cur, ticks: [false, false, false, false, false, false] },
      };
    });
  }

  function setWeeklyReviewField(field, value) {
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { wentWell: "", drained: "", change: "", win: "" };
      return { ...safePrev, [weekKey]: { ...cur, [field]: value } };
    });
  }

  const prevWeekKey = useMemo(() => prevIsoWeekKey(weekKey), [weekKey]);
  const prevBlock = weeklyByWeekKey?.[prevWeekKey] ?? { priorities: [], nice: [] };
  const prevPriorities = ensureNRows(prevBlock.priorities, 6)
    .map((x) => (x || "").trim())
    .filter(Boolean);
  const prevNice = ensureNRows(prevBlock.nice, 6)
    .map((x) => (x || "").trim())
    .filter(Boolean);

  const currentHasAny =
    weeklyPriorities.map((x) => (x || "").trim()).filter(Boolean).length > 0 ||
    weeklyNice.map((x) => (x || "").trim()).filter(Boolean).length > 0;

  // “One tweak” becomes next week’s first priority:
  const tweakFromPrev = (weeklyReviewByWeekKey?.[prevWeekKey]?.change ?? "").trim();

  // Upcoming editor actions
  function openAddUpcoming() {
    setUpcomingEditId(null);
    setUpcomingDraft({ type: "match", title: "", date: "", location: "", notes: "" });
    setUpcomingEditorOpen(true);
  }

  function openEditUpcoming(item) {
    setUpcomingEditId(item?.id ?? null);
    setUpcomingDraft({
      type: item?.type ?? "other",
      title: item?.title ?? "",
      date: item?.date ?? "",
      location: item?.location ?? "",
      notes: item?.notes ?? "",
    });
    setUpcomingEditorOpen(true);
  }

  function saveUpcomingDraft() {
    const cleaned = {
      type: (upcomingDraft.type || "other").trim(),
      title: (upcomingDraft.title || "").trim(),
      date: (upcomingDraft.date || "").trim(),
      location: (upcomingDraft.location || "").trim(),
      notes: (upcomingDraft.notes || "").trim(),
    };

    if (!cleaned.title) return;

    setUpcomingItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];

      if (upcomingEditId) {
        return list.map((x) => (x.id === upcomingEditId ? { ...x, ...cleaned } : x));
      }

      return [{ id: safeId(), ...cleaned, createdAt: Date.now() }, ...list];
    });

    setUpcomingEditorOpen(false);
    setUpcomingEditId(null);
  }

  function deleteUpcoming(id) {
    setUpcomingItems((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== id) : []));
  }

  // ----- Load & Sync -----
  useEffect(() => {
    if (authLoading) return;

    function applySaved(saved) {
      if (!saved) return;

      const { updatedAt, migratedAt, ...clean } = saved;
      const data = clean;

      if (data.tasksByDate) setTasksByDate(data.tasksByDate);
      if (data.promptByDate) setPromptByDate(data.promptByDate);
      if (data.statusByDate) setStatusByDate(data.statusByDate);
      if (data.supportPlanByStatus) setSupportPlanByStatus(data.supportPlanByStatus);
      if (data.dayTypeByDate) setDayTypeByDate(data.dayTypeByDate);
      if (data.prepDoneByDate) setPrepDoneByDate(data.prepDoneByDate);
      if (data.copingDoneByDate) setCopingDoneByDate(data.copingDoneByDate);
      if (data.copingPickByDate) setCopingPickByDate(data.copingPickByDate);
      if (data.supportShownByDate) setSupportShownByDate(data.supportShownByDate);
      if (data.quickCheckByDate) setQuickCheckByDate(data.quickCheckByDate);
      if (data.prefs) setPrefs(data.prefs);

      if (data.weeklyByWeekKey) setWeeklyByWeekKey(data.weeklyByWeekKey);
      if (data.weeklyChecklistByWeekKey) setWeeklyChecklistByWeekKey(data.weeklyChecklistByWeekKey);
      if (data.weeklyReviewByWeekKey) setWeeklyReviewByWeekKey(data.weeklyReviewByWeekKey);
      if (typeof data.showWeeklyChecklist === "boolean") setShowWeeklyChecklist(data.showWeeklyChecklist);

      if (data.nextTrip) setNextTrip(data.nextTrip);
      if (data.nextMatch) setNextMatch(data.nextMatch);

      if (data.upcomingItems) setUpcomingItems(data.upcomingItems);
    }

    // Local-only mode
    if (!user) {
      const saved = loadAppData() ?? {};
      applySaved(saved);
      setHydrated(true);
      return;
    }

    let unsub = null;

    (async () => {
      const cloud = await loadCloudState(user.uid);
      const local = loadAppData() ?? {};

      const localHasData =
        local &&
        ((local.upcomingItems && local.upcomingItems.length) ||
          (local.tasksByDate && Object.keys(local.tasksByDate).length) ||
          (local.weeklyByWeekKey && Object.keys(local.weeklyByWeekKey).length));

      if (!cloud && localHasData && !migratedOnce.current) {
        migratedOnce.current = true;
        await migrateLocalToCloud(user.uid, local);
      }

      // If we are about to apply cloud state, skip next cloud save
      if (cloud) skipNextCloudSave.current = true;

      applyingRemote.current = true;
      applySaved(cloud || local);

      // Keep remote flag through the next effect cycle reliably
      queueMicrotask(() => {
        applyingRemote.current = false;
      });

      setHydrated(true);

      unsub = subscribeCloudState(user.uid, (nextCloud) => {
        if (!nextCloud) return;

        const { updatedAt, migratedAt, ...rest } = nextCloud;
        const json = JSON.stringify(rest);
        if (json === lastCloudJSON.current) return;
        lastCloudJSON.current = json;

        // Snapshot apply -> skip next cloud save
        skipNextCloudSave.current = true;

        applyingRemote.current = true;
        applySaved(rest);

        queueMicrotask(() => {
          applyingRemote.current = false;
        });
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [user, authLoading]);

  // ----- Save on change (AFTER hydration) -----
  useEffect(() => {
    if (!hydrated) return;

    const payload = {
      tasksByDate,
      promptByDate,
      statusByDate,
      supportPlanByStatus,
      dayTypeByDate,
      prepDoneByDate,
      copingDoneByDate,
      copingPickByDate,
      supportShownByDate,
      quickCheckByDate,
      prefs,

      weeklyByWeekKey,
      weeklyChecklistByWeekKey,
      weeklyReviewByWeekKey,
      showWeeklyChecklist,

      nextTrip,
      nextMatch,
      upcomingItems,
    };

    // Always save locally
    saveAppData(payload);

    // Cloud save only if signed in and not applying remote
    if (!user) return;
    if (applyingRemote.current) return;

    // 🔒 Prevent “cloud apply -> save back” loop
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    saveCloudState(user.uid, payload);
  }, [
    hydrated,
    user,

    tasksByDate,
    promptByDate,
    statusByDate,
    supportPlanByStatus,
    dayTypeByDate,
    prepDoneByDate,
    copingDoneByDate,
    copingPickByDate,
    supportShownByDate,
    quickCheckByDate,
    prefs,

    weeklyByWeekKey,
    weeklyChecklistByWeekKey,
    weeklyReviewByWeekKey,
    showWeeklyChecklist,

    nextTrip,
    nextMatch,
    upcomingItems,
  ]);

  // ----- Daily History (debounced, safe) -----
  useEffect(() => {
    if (!hydrated) return;
    if (!canEdit) return;

    const id = setTimeout(() => {
      const traffic = selectedStatus === "amber" ? "yellow" : selectedStatus;

      upsertDailyEntry({
        day: selectedKey,

        trafficLight: traffic,
        status: selectedStatus, // ✅ keep app status ("amber"/"green"/"red")

        copingMethod: (pickedCoping || "").trim(),
        oneQuestion: (selectedAnswer || "").trim(),

        gentlePrep: (prepSuggestion || "").trim(),
        prepDone: !!prepDone,

        weeklyFocus:
          weeklyPriorities
            .map((x) => (x || "").trim())
            .filter(Boolean)[0] || "",

        weeklyPriorities: weeklyPriorities
          .map((x) => (x || "").trim())
          .filter(Boolean)
          .slice(0, 6),

        weeklyChecklist: ensureNRows(weeklyChecklist?.items, 6)
          .map((x) => (x || "").trim())
          .filter(Boolean)
          .slice(0, 6),

        todoTodayCount: Array.isArray(selectedTasks) ? selectedTasks.length : 0,
        upcomingCount: Array.isArray(upcomingItems) ? upcomingItems.length : 0,

        quickCheck: {
          energy: quickCheck?.energy ?? 2,
          focus: quickCheck?.focus ?? 2,
          stress: quickCheck?.stress ?? 3,
        },
      });
    }, 900);

    return () => clearTimeout(id);
  }, [
    hydrated,
    canEdit,
    selectedKey,

    selectedStatus,
    pickedCoping,
    selectedAnswer,
    prepSuggestion,
    prepDone,

    weeklyPriorities,
    weeklyChecklist,
    selectedTasks,
    upcomingItems,

    quickCheck,
  ]);

  // Auto-reduce on Red, return to normal otherwise (per selected day)
  useEffect(() => {
    if (selectedStatus === "red") setUiMode("reduced");
    else setUiMode("normal");
  }, [selectedStatus]);

  // Auto-open SupportSheet on Red (once per day, only for today/future days)
  useEffect(() => {
    if (selectedStatus !== "red") return;
    if (!canEdit) return;

    const alreadyShown = !!supportShownByDate[selectedKey];
    if (alreadyShown) return;

    setSupportOpen(true);
    setSupportShownByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: true }));
  }, [selectedStatus, selectedKey, canEdit, supportShownByDate]);

  // Auto-jump to today after midnight
  useEffect(() => {
    const id = setInterval(() => {
      const nowKey = todayKey();
      if (nowKey !== today) setSelectedKey(nowKey);
    }, 30_000);
    return () => clearInterval(id);
  }, [today]);

  // -------------------- UI --------------------
  return (
    <div className="max-w-md p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple">Life Ops</h1>
        <div className="text-xs opacity-60">BUILD: 2026-01-27-A</div>

        {user ? (
          <>
            <div className="text-xs opacity-70 mt-1">Synced to Firebase: {user.email}</div>

            {user.email === "kcco1996@gmail.com" && (
              <button
                className="w-full mt-2 rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                onClick={async () => {
                  const local = loadAppData() ?? {};
                  await migrateLocalToCloud(user.uid, local);
                  alert("Migrated local data to Firebase ✅");
                }}
              >
                Migrate local data to Firebase
              </button>
            )}
          </>
        ) : (
          <div className="text-xs opacity-70 mt-1">Not signed in (saving locally)</div>
        )}

        <div className="mt-2 space-y-2">
          <div
            className="text-sm opacity-80 flex items-center justify-between gap-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => setSelectedKey((k) => addDays(k, -1))}
            >
              ←
            </button>

            <div className="text-center flex-1">
              <div>{dateLabel}</div>
              <div className="opacity-70">{dayType}</div>
            </div>

            <button
              className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => setSelectedKey((k) => addDays(k, 1))}
            >
              →
            </button>
          </div>

          <button
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
            onClick={() => setShowHistory(true)}
          >
            Last 30 days
          </button>

          {selectedKey !== today && (
            <button
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => setSelectedKey(today)}
            >
              Jump to today
            </button>
          )}
        </div>
      </div>

      {/* Day type editor */}
      <button
        className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50"
        disabled={!canEdit}
        onClick={() => setDayTypeEditorOpen(true)}
      >
        {canEdit ? "Edit day type" : "Day type (view only)"}
      </button>

      <CheckInCard status={selectedStatus} onSetStatus={setSelectedStatus} canEdit={canEdit} />

      <CopingCard
        status={selectedStatus}
        canEdit={canEdit}
        onPrimaryAction={() => setSupportOpen(true)}
        onReduceScreen={() => setUiMode("reduced")}
      />

      <CopingActionCard
        status={selectedStatus}
        suggestion={copingSuggestion}
        picked={pickedCoping}
        done={copingDone}
        canEdit={canEdit}
        onPick={(next) => {
          setCopingPickByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: (next || "").trim() }));
        }}
        onDone={() => {
          setCopingDoneByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: true }));
        }}
        onUndo={() => {
          setCopingDoneByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: false }));
        }}
      />

      {/* Brain in Hand */}
      <BrainInHandCard status={selectedStatus} />

      {prefs?.guardrail?.trim() && (
        <div className="rounded-2xl border border-white/10 bg-card p-4">
          <div className="text-xs font-semibold opacity-70">Today’s guardrail</div>
          <div className="text-sm opacity-90 whitespace-pre-wrap mt-1">{prefs.guardrail}</div>
        </div>
      )}

      {selectedStatus === "amber" && dayType === "Office day" && Array.isArray(prefs?.commuteChecklist) && (
        <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
          <div className="text-sm font-semibold opacity-90">Commute protection</div>
          <div className="text-xs opacity-60">Small protections before leaving.</div>
          <div className="space-y-2">
            {prefs.commuteChecklist.filter(Boolean).slice(0, 6).map((x, i) => (
              <div key={i} className="rounded-xl bg-card2 px-3 py-2 text-sm">
                {x}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Red-mode controls */}
      {isRed && (
        <div className="space-y-2">
          <div className="text-sm opacity-80">Red day mode: keeping things simple.</div>

          <div className="flex gap-2">
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 ${
                isReduced ? "bg-purple font-semibold" : "bg-card2"
              }`}
              onClick={() => setUiMode("reduced")}
            >
              Reduce screen
            </button>

            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 ${
                !isReduced ? "bg-purple font-semibold" : "bg-card2"
              }`}
              onClick={() => setUiMode("normal")}
            >
              Show more
            </button>

            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm hover:opacity-90 active:opacity-80 ${
                isBare ? "bg-purple font-semibold" : "bg-card2"
              }`}
              onClick={() => setUiMode((m) => (m === "bare" ? "reduced" : "bare"))}
            >
              Bare
            </button>
          </div>
        </div>
      )}

      {/* Always show gentle question */}
      <PromptCard
        prompt={dailyPrompt}
        answer={selectedAnswer}
        onChangeAnswer={canEdit ? updateSelectedAnswer : () => {}}
      />

      <GentlePrepCard
        suggestion={prepSuggestion}
        canEdit={canEdit}
        done={prepDone}
        onDone={markPrepDone}
        onUndo={() => {
          setPrepDoneByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: false }));
        }}
      />

      {/* ✅ Sunday check (MOVED INSIDE JSX RETURN) */}
      {isSunday && canEdit && reviewEmpty && (
        <div className="rounded-2xl border border-white/10 bg-card p-4">
          <div className="text-sm font-semibold opacity-90">Sunday check</div>
          <div className="text-sm opacity-80 mt-1">2-min weekly review?</div>
          <div className="text-xs opacity-60">Tiny is fine. One sentence each.</div>
        </div>
      )}

      {/* Weekly: Focus (Top 3) */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">This week’s focus</div>
          <div className="text-xs opacity-60">{weekKey}</div>
        </div>

        {canEdit && !currentHasAny && (prevPriorities.length || prevNice.length || tweakFromPrev) && (
          <button
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
            onClick={() => {
              const initial = {};
              [...prevPriorities, ...prevNice].forEach((x) => (initial[x] = true));
              setCarryPick(initial);
              setCarryOpen(true);
            }}
          >
            Carry over last week (keep/drop)
          </button>
        )}

        <div className="mt-3 space-y-2">
          <div className="text-xs font-semibold opacity-70">Top priorities</div>

          {weeklyPriorities
            .map((x) => (x || "").trim())
            .filter(Boolean)
            .slice(0, 3)
            .map((item, idx) => (
              <div key={idx} className="rounded-xl bg-card2 px-3 py-2 text-sm">
                {item}
              </div>
            ))}

          {weeklyPriorities.map((x) => (x || "").trim()).filter(Boolean).length === 0 && (
            <div className="text-sm opacity-70">No priorities set yet — add 1–3 below.</div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold opacity-70">Nice to do (if energy)</div>

          {weeklyNice
            .map((x) => (x || "").trim())
            .filter(Boolean)
            .slice(0, 2)
            .map((item, idx) => (
              <div key={idx} className="rounded-xl bg-card2 px-3 py-2 text-sm opacity-90">
                {item}
              </div>
            ))}

          {weeklyNice.map((x) => (x || "").trim()).filter(Boolean).length === 0 && (
            <div className="text-sm opacity-60">Nothing in “nice-to-do” yet — totally fine.</div>
          )}
        </div>

        <div className="mt-4">
          <button
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
            onClick={() => setShowWeeklyChecklist((v) => !v)}
          >
            {showWeeklyChecklist ? "Hide weekly checklist" : "Show weekly checklist"}
          </button>
        </div>
      </div>

      {/* Weekly priorities */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">Weekly priorities</div>
          <div className="text-xs opacity-60">{weekKey}</div>
        </div>

        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-70">This week’s priorities</div>
            <div className="space-y-2">
              {weeklyPriorities.map((v, i) => (
                <input
                  key={`p-${i}`}
                  value={v}
                  disabled={!canEdit}
                  onChange={(e) => setWeeklyRow("priorities", i, e.target.value)}
                  placeholder={`Priority ${i + 1}`}
                  className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-70">Nice to do (if energy)</div>
            <div className="space-y-2">
              {weeklyNice.map((v, i) => (
                <input
                  key={`n-${i}`}
                  value={v}
                  disabled={!canEdit}
                  onChange={(e) => setWeeklyRow("nice", i, e.target.value)}
                  placeholder={`Nice to do ${i + 1}`}
                  className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
                />
              ))}
            </div>
          </div>

          {!canEdit && <div className="text-xs opacity-60">Weekly priorities are view-only for past days.</div>}
        </div>
      </div>

      {/* Weekly review */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">Weekly review</div>
          <div className="text-xs opacity-60">{weekKey}</div>
        </div>

        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold opacity-70">What went well</div>
            <textarea
              value={weeklyReview.wentWell}
              disabled={!canEdit}
              onChange={(e) => setWeeklyReviewField("wentWell", e.target.value)}
              placeholder="A couple of sentences is enough."
              className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold opacity-70">What drained me</div>
            <textarea
              value={weeklyReview.drained}
              disabled={!canEdit}
              onChange={(e) => setWeeklyReviewField("drained", e.target.value)}
              placeholder="What cost the most energy?"
              className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold opacity-70">One thing I’ll change next week</div>
            <textarea
              value={weeklyReview.change}
              disabled={!canEdit}
              onChange={(e) => setWeeklyReviewField("change", e.target.value)}
              placeholder="Keep it tiny and practical."
              className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold opacity-70">One win I’m proud of</div>
            <textarea
              value={weeklyReview.win}
              disabled={!canEdit}
              onChange={(e) => setWeeklyReviewField("win", e.target.value)}
              placeholder="Even small wins count."
              className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>

          {canEdit && (
            <button
              className="w-full rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() =>
                setWeeklyReviewByWeekKey((prev) => {
                  const safePrev = prev ?? {};
                  return { ...safePrev, [weekKey]: { wentWell: "", drained: "", change: "", win: "" } };
                })
              }
            >
              Clear weekly review
            </button>
          )}
        </div>
      </div>

      {/* Weekly checklist */}
      {showWeeklyChecklist && (
        <div className="rounded-2xl border border-white/10 bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold opacity-90">Weekly checklist</div>
            <div className="flex gap-2 items-center">
              <div className="text-xs opacity-60">{weekKey}</div>
              {canEdit && (
                <button
                  className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                  onClick={resetChecklistTicks}
                >
                  Reset ticks
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {ensureNRows(weeklyChecklist.items, 6).map((v, i) => {
              const tick = Array.isArray(weeklyChecklist.ticks) ? !!weeklyChecklist.ticks[i] : false;

              return (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-card2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={tick}
                    disabled={!canEdit}
                    onChange={() => toggleChecklistTick(i)}
                    className="h-4 w-4"
                  />
                  <input
                    value={v}
                    disabled={!canEdit}
                    onChange={(e) => setChecklistItem(i, e.target.value)}
                    placeholder={`Weekly task ${i + 1}`}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extras */}
      {showExtras && (
        <div className="space-y-4">
          <TodayCard
            dateKey={selectedKey}
            tasks={selectedTasks}
            onChangeTasks={canEdit ? updateSelectedTasks : () => {}}
            readOnly={!canEdit}
          />

          {/* Status sliders */}
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold opacity-90">Status</div>
              <div className="text-xs opacity-60">Quick check</div>
            </div>

            <div className="mt-3 space-y-4">
              {[
                { key: "energy", label: "Energy" },
                { key: "focus", label: "Focus" },
                { key: "stress", label: "Stress" },
              ].map((row) => {
                const value = quickCheck?.[row.key] ?? 2;

                return (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm opacity-90">
                      <div>{row.label}</div>
                      <div className="text-xs opacity-60">{value}/5</div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={value}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const nextVal = Number(e.target.value);
                        setQuickCheckByDate((prev) => ({
                          ...(prev ?? {}),
                          [selectedKey]: {
                            ...(prev?.[selectedKey] ?? { energy: 2, focus: 2, stress: 3 }),
                            [row.key]: nextVal,
                          },
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming */}
          <div className="rounded-2xl border border-white/10 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold opacity-90">Upcoming</div>
                <div className="text-xs opacity-60">Trips, matches, uni deadlines, anything.</div>
              </div>

              {canEdit && (
                <button
                  className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                  onClick={openAddUpcoming}
                >
                  + Add
                </button>
              )}
            </div>

            {upcomingEditorOpen && (
              <div className="mt-3 rounded-2xl bg-card2 p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={upcomingDraft.type}
                    disabled={!canEdit}
                    onChange={(e) => setUpcomingDraft((p) => ({ ...p, type: e.target.value }))}
                    className="rounded-xl bg-bg px-3 py-2 text-sm outline-none flex-1"
                  >
                    <option value="match">match</option>
                    <option value="trip">trip</option>
                    <option value="uni">uni</option>
                    <option value="work">work</option>
                    <option value="other">other</option>
                  </select>

                  <button
                    className="rounded-xl bg-bg px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                    onClick={() => {
                      setUpcomingEditorOpen(false);
                      setUpcomingEditId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <input
                  value={upcomingDraft.title}
                  disabled={!canEdit}
                  onChange={(e) => setUpcomingDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title (required)"
                  className="w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                />

                <div className="flex gap-2">
                  <input
                    value={upcomingDraft.date}
                    disabled={!canEdit}
                    onChange={(e) => setUpcomingDraft((p) => ({ ...p, date: e.target.value }))}
                    placeholder="Date (YYYY-MM-DD)"
                    className="flex-1 rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                  />
                  <input
                    value={upcomingDraft.location}
                    disabled={!canEdit}
                    onChange={(e) => setUpcomingDraft((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Location"
                    className="flex-1 rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                  />
                </div>

                <textarea
                  value={upcomingDraft.notes}
                  disabled={!canEdit}
                  onChange={(e) => setUpcomingDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes"
                  className="w-full min-h-[90px] rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60"
                />

                <button
                  className="w-full rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
                  onClick={saveUpcomingDraft}
                  disabled={!canEdit}
                >
                  {upcomingEditId ? "Save changes" : "Save item"}
                </button>

                {!upcomingDraft.title.trim() && (
                  <div className="text-xs opacity-70">Title is required to save.</div>
                )}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {upcomingSorted.length === 0 ? (
                <div className="text-sm opacity-70">No upcoming items yet.</div>
              ) : (
                upcomingSorted.slice(0, 12).map((item) => (
                  <div key={item.id} className="rounded-xl bg-card2 p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          <span className="opacity-70 mr-2">{(item.type || "other").toUpperCase()}</span>
                          {item.title || "Untitled"}
                        </div>
                        {(item.date || item.location) && (
                          <div className="text-xs opacity-70">
                            {item.date ? item.date : ""}
                            {item.date && item.location ? " • " : ""}
                            {item.location ? item.location : ""}
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            className="rounded-xl bg-bg px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                            onClick={() => openEditUpcoming(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-xl bg-bg px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
                            onClick={() => deleteUpcoming(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <div className="text-sm opacity-80 whitespace-pre-wrap">{item.notes}</div>
                    )}
                  </div>
                ))
              )}

              {upcomingSorted.length > 12 && <div className="text-xs opacity-60">Showing first 12 items.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Last 30 days drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50" onClick={() => setShowHistory(false)}>
          <div className="absolute inset-0 bg-black/60" />

          <div
            className="absolute left-0 right-0 bottom-0 rounded-t-2xl border border-white/10 bg-bg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold opacity-90">Last 30 days</div>
              <button
                className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
                onClick={() => setShowHistory(false)}
              >
                Close
              </button>
            </div>

            {carryOpen && (
              <div className="fixed inset-0 z-50" onClick={() => setCarryOpen(false)}>
                <div className="absolute inset-0 bg-black/60" />
                <div
                  className="absolute left-0 right-0 bottom-0 rounded-t-2xl border border-white/10 bg-bg p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold opacity-90">Carry over</div>
                    <button
                      className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90"
                      onClick={() => setCarryOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 text-xs opacity-60">
                    Tick what to keep. Your previous “one tweak” will be added as Priority #1 automatically (if you
                    apply).
                  </div>

                  <div className="mt-3 space-y-2 max-h-[50vh] overflow-auto">
                    {[...new Set([...prevPriorities, ...prevNice])].map((item) => (
                      <label key={item} className="flex items-center gap-2 rounded-xl bg-card2 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!carryPick[item]}
                          onChange={() => setCarryPick((p) => ({ ...(p ?? {}), [item]: !p?.[item] }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    className="w-full mt-3 rounded-xl bg-purple px-3 py-2 text-sm font-semibold hover:opacity-90 active:opacity-80"
                    onClick={() => {
                      const kept = Object.entries(carryPick)
                        .filter(([, v]) => !!v)
                        .map(([k]) => k)
                        .slice(0, 6);

                      // insert tweak first if present
                      const nextPriorities = [...(tweakFromPrev ? [tweakFromPrev] : []), ...kept]
                        .filter(Boolean)
                        .slice(0, 6);

                      setWeeklyByWeekKey((prev) => {
                        const safePrev = prev ?? {};
                        return {
                          ...safePrev,
                          [weekKey]: {
                            priorities: ensureNRows(nextPriorities, 6),
                            nice: ensureNRows([], 6),
                          },
                        };
                      });

                      setCarryOpen(false);
                    }}
                  >
                    Apply carry-over
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 max-h-[60vh] overflow-auto space-y-1">
              {last30.map((k) => {
                const s = statusByDate[k] ?? "amber";
                const dot = s === "green" ? "bg-green" : s === "amber" ? "bg-amber" : "bg-red";

                return (
                  <button
                    key={k}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:opacity-90 ${
                      k === selectedKey ? "bg-purple/25" : "bg-card2"
                    }`}
                    onClick={() => {
                      setSelectedKey(k);
                      setShowHistory(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                        <span>{formatLabel(k)}</span>
                      </div>
                      <span className="text-xs opacity-60">{k}</span>
                    </div>

                    {k === today && <div className="text-xs opacity-60 mt-1">Today</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sheets */}
      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        status={selectedStatus}
        plan={currentPlan}
        canEdit={canEdit}
        onEditPlan={() => setPlanEditorOpen(true)}
      />

      <PlanEditorSheet
        open={planEditorOpen}
        onClose={() => setPlanEditorOpen(false)}
        title={`Edit ${selectedStatus} plan`}
        value={currentPlan}
        canEdit={canEdit}
        onSave={(next) => {
          setSupportPlanByStatus((prev) => ({ ...(prev ?? {}), [selectedStatus]: next }));
        }}
      />

      <DayTypeEditorSheet
        open={dayTypeEditorOpen}
        onClose={() => setDayTypeEditorOpen(false)}
        value={dayType}
        canEdit={canEdit}
        onSave={(next) => {
          setDayTypeByDate((prev) => ({ ...(prev ?? {}), [selectedKey]: (next || "").trim() }));
        }}
      />
    </div>
  );
}
