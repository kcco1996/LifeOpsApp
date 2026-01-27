// src/pages/Home/Home.jsx (complete)
// ✅ Persists everything via loadAppData/saveAppData (localStorage)
// ✅ Hydration guard prevents overwriting saved data on refresh
// ✅ Saves EVERYTHING that gets loaded (including weeklyChecklist + showWeeklyChecklist)
// ✅ Upcoming add/edit/delete persists reliably

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

import { useAuth } from "../../hooks/useAuth";
import { subscribeCloudState, saveCloudState, loadCloudState } from "../../data/storage/lifeOpsCloud";

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

// -------------------- Prompts / suggestions --------------------
function promptForStatus(status) {
  if (status === "green") return "What’s one thing you want to keep the same today?";
  if (status === "amber") return "What support would help today feel easier?";
  return "What’s the smallest safe next step right now?";
}

function gentlePrepSuggestion({ status, tomorrowType }) {
  if (status === "red") {
    return "One small safety step: reduce stimulation (headphones / dim screen) and keep plans minimal.";
  }

  if (status === "amber") {
    if (tomorrowType === "Office day")
      return "Prep 1 thing for tomorrow’s office day: pack bag / lay out clothes / set a calm alarm.";
    if (tomorrowType === "Uni day")
      return "Prep 1 thing for uni: open the link / note the topic / set a 20-minute timer.";
    if (tomorrowType === "Groundhop day")
      return "Prep for groundhop: charge phone + check travel/ticket + plan a simple food stop.";
    return "Prep 1 small comfort for tomorrow: drink, snack, or a quiet break plan.";
  }

  if (tomorrowType === "Office day") return "Small win: decide tomorrow’s first task before bed.";
  if (tomorrowType === "Uni day") return "Small win: write one sentence on what you want to understand in uni tomorrow.";
  if (tomorrowType === "Groundhop day") return "Small win: check kickoff time and your travel plan once.";
  return "Small win: choose one simple routine to keep steady tomorrow.";
}

function copingSuggestionFor({ status, dayType }) {
  if (status === "red") return "Reduce stimulation (headphones / dim screen) + open Support if needed.";

  if (status === "amber") {
    if (dayType === "Office day") return "Before leaving: headphones + one calm breath + check your exit plan.";
    if (dayType === "Uni day") return "Open the uni link now and set a 15-minute timer (stop when it ends).";
    if (dayType === "Remote work day") return "2-minute reset: water + stand up + choose only 1 next task.";
    if (dayType === "Groundhop day") return "Prep calm: charge phone + check ticket + plan a quiet food stop.";
    return "Tiny reset: water + sit comfortably + one slow breath.";
  }

  return "Keep steady: choose your first small task and stop after it if needed.";
}

function ensureNRows(arr, n) {
  const base = Array.isArray(arr) ? arr.slice(0, n) : [];
  while (base.length < n) base.push("");
  return base;
}

function safeId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.floor(Math.random() * 1000));
}

// -------------------- Home --------------------
export default function Home() {
   const { user, authLoading } = useAuth();

  // prevents “cloud snapshot -> setState -> save -> overwrite cloud” loops
  const applyingRemote = useRef(false);

  // one-time migration: if cloud is empty but local has data, upload it once
  const migratedOnce = useRef(false);
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

  // ----- UI state -----
  const [uiMode, setUiMode] = useState("normal");
  const [selectedKey, setSelectedKey] = useState(todayKey());
  const today = todayKey();

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

  // ✅ hydration guard (prevents overwriting saved data on mount)
  const [hydrated, setHydrated] = useState(false);

  // Swipe support refs
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const saveTimer = useRef(null);

  // ----- Derived -----
  const selectedTasks = tasksByDate[selectedKey] ?? [];
  const selectedAnswer = promptByDate[selectedKey] ?? "";
  const selectedStatus = statusByDate[selectedKey] ?? "amber";
  const dayType = dayTypeByDate[selectedKey] ?? defaultDayTypeFor(selectedKey);

  const isRed = selectedStatus === "red";
  const isReduced = uiMode === "reduced";
  const isBare = uiMode === "bare";

  const showExtras = !isBare && (!isRed || !isReduced);

  const dailyPrompt = promptForStatus(selectedStatus);
  const canEdit = selectedKey >= today;

  const currentPlan = supportPlanByStatus[selectedStatus] ?? "";
  const copingSuggestion = copingSuggestionFor({ status: selectedStatus, dayType });

  const tomorrowKey = addDays(selectedKey, 1);
  const tomorrowType = dayTypeByDate[tomorrowKey] ?? defaultDayTypeFor(tomorrowKey);

  const prepSuggestion = gentlePrepSuggestion({ status: selectedStatus, tomorrowType });
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
      return { ...safePrev, [weekKey]: { ...cur, ticks: [false, false, false, false, false, false] } };
    });
  }

  function setWeeklyReviewField(field, value) {
    setWeeklyReviewByWeekKey((prev) => {
      const safePrev = prev ?? {};
      const cur = safePrev[weekKey] ?? { wentWell: "", drained: "", change: "", win: "" };
      return { ...safePrev, [weekKey]: { ...cur, [field]: value } };
    });
  }

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

  // ✅ hardened: always treats prev as an array
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

      return [
        { id: safeId(), ...cleaned, createdAt: Date.now() },
        ...list,
      ];
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

    // Helper: apply a saved object to state (shared by local + cloud)
    function applySaved(saved) {
      if (!saved) return;

      if (saved.tasksByDate) setTasksByDate(saved.tasksByDate);
      if (saved.promptByDate) setPromptByDate(saved.promptByDate);
      if (saved.statusByDate) setStatusByDate(saved.statusByDate);
      if (saved.supportPlanByStatus) setSupportPlanByStatus(saved.supportPlanByStatus);
      if (saved.dayTypeByDate) setDayTypeByDate(saved.dayTypeByDate);
      if (saved.prepDoneByDate) setPrepDoneByDate(saved.prepDoneByDate);
      if (saved.copingDoneByDate) setCopingDoneByDate(saved.copingDoneByDate);
      if (saved.copingPickByDate) setCopingPickByDate(saved.copingPickByDate);
      if (saved.supportShownByDate) setSupportShownByDate(saved.supportShownByDate);
      if (saved.quickCheckByDate) setQuickCheckByDate(saved.quickCheckByDate);

      if (saved.weeklyByWeekKey) setWeeklyByWeekKey(saved.weeklyByWeekKey);
      if (saved.weeklyChecklistByWeekKey) setWeeklyChecklistByWeekKey(saved.weeklyChecklistByWeekKey);
      if (saved.weeklyReviewByWeekKey) setWeeklyReviewByWeekKey(saved.weeklyReviewByWeekKey);
      if (typeof saved.showWeeklyChecklist === "boolean") setShowWeeklyChecklist(saved.showWeeklyChecklist);

      if (saved.nextTrip) setNextTrip(saved.nextTrip);
      if (saved.nextMatch) setNextMatch(saved.nextMatch);

      if (saved.upcomingItems) setUpcomingItems(saved.upcomingItems);
    }

    // If not signed in -> behave exactly like before (localStorage)
    if (!user) {
      const saved = loadAppData() ?? {};
      applySaved(saved);
      setHydrated(true);
      return;
    }

    // Signed in -> Firestore is source of truth (live sync)
    let unsub = null;

    (async () => {
      // 1) Try to load cloud once (so we can decide migration)
      const cloud = await loadCloudState(user.uid);

      // 2) Load local as a fallback (for first time sign-in)
      const local = loadAppData() ?? {};

      // If cloud empty and local has something meaningful, migrate once
      const localHasData =
  local &&
  (
    (local.upcomingItems && local.upcomingItems.length) ||
    (local.tasksByDate && Object.keys(local.tasksByDate).length) ||
    (local.weeklyByWeekKey && Object.keys(local.weeklyByWeekKey).length)
  );

      if (!cloud && localHasData && !migratedOnce.current) {
        migratedOnce.current = true;
        await saveCloudState(user.uid, local);
      }

      // Apply whichever exists (cloud preferred)
      applyingRemote.current = true;
      applySaved(cloud || local);
      applyingRemote.current = false;

      setHydrated(true);

      // 3) Subscribe to live updates (phone <-> computer sync)
      unsub = subscribeCloudState(user.uid, (nextCloud) => {
        if (!nextCloud) return;

        
  // strip updatedAt so timestamp changes don’t cause “bounces”
  const { updatedAt, ...rest } = nextCloud;
  const json = JSON.stringify(rest);

  if (json === lastCloudJSON.current) return;
  lastCloudJSON.current = json;

        applyingRemote.current = true;
        applySaved(nextCloud);
        applyingRemote.current = false;
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

    weeklyByWeekKey,
    weeklyChecklistByWeekKey,
    weeklyReviewByWeekKey,
    showWeeklyChecklist,

    nextTrip,
    nextMatch,
    upcomingItems,
  };

  // Always save locally immediately (fast + offline safe)
  saveAppData(payload);

  // 🔥 Debounced Firestore save
  if (user && !applyingRemote.current) {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      saveCloudState(user.uid, payload);
    }, 800); // wait 800ms after last change
  }

  // Cleanup if component rerenders quickly
  return () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  };
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

  weeklyByWeekKey,
  weeklyChecklistByWeekKey,
  weeklyReviewByWeekKey,
  showWeeklyChecklist,

  nextTrip,
  nextMatch,
  upcomingItems,
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

      {user ? (
  <div className="text-xs opacity-70 mt-1">Synced to Firebase: {user.email}</div>
) : (
  <div className="text-xs opacity-70 mt-1">Not signed in (saving locally)</div>
)}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple">Life Ops</h1>

        <div className="text-xs opacity-60">BUILD: 2026-01-27-A</div>

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

      {/* Weekly: Focus (Top 3) */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">This week’s focus</div>
          <div className="text-xs opacity-60">{weekKey}</div>
        </div>

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

      {/* Weekly priorities (editable, persisted) */}
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

      {/* Weekly review (editable, persisted) */}
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

      {/* Next trip (persisted) */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">Next trip</div>
          {canEdit && (
            <button
              className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => setNextTrip({ title: "", date: "", location: "", notes: "" })}
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <input
            value={nextTrip.title}
            disabled={!canEdit}
            onChange={(e) => setNextTrip((p) => ({ ...p, title: e.target.value }))}
            placeholder="Trip name (e.g., Vienna weekend)"
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
          <div className="flex gap-2">
            <input
              value={nextTrip.date}
              disabled={!canEdit}
              onChange={(e) => setNextTrip((p) => ({ ...p, date: e.target.value }))}
              placeholder="Date (e.g., 2026-02-12)"
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
            <input
              value={nextTrip.location}
              disabled={!canEdit}
              onChange={(e) => setNextTrip((p) => ({ ...p, location: e.target.value }))}
              placeholder="Location"
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>
          <textarea
            value={nextTrip.notes}
            disabled={!canEdit}
            onChange={(e) => setNextTrip((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes (hotel, travel time, key things to do)"
            className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Next match (persisted) */}
      <div className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-90">Next match</div>
          {canEdit && (
            <button
              className="rounded-xl bg-card2 px-3 py-2 text-sm hover:opacity-90 active:opacity-80"
              onClick={() => setNextMatch({ fixture: "", date: "", ground: "", notes: "" })}
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <input
            value={nextMatch.fixture}
            disabled={!canEdit}
            onChange={(e) => setNextMatch((p) => ({ ...p, fixture: e.target.value }))}
            placeholder="Fixture (e.g., West Ham vs __)"
            className="w-full rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
          <div className="flex gap-2">
            <input
              value={nextMatch.date}
              disabled={!canEdit}
              onChange={(e) => setNextMatch((p) => ({ ...p, date: e.target.value }))}
              placeholder="Date (e.g., 2026-02-01)"
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
            <input
              value={nextMatch.ground}
              disabled={!canEdit}
              onChange={(e) => setNextMatch((p) => ({ ...p, ground: e.target.value }))}
              placeholder="Ground"
              className="flex-1 rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
            />
          </div>
          <textarea
            value={nextMatch.notes}
            disabled={!canEdit}
            onChange={(e) => setNextMatch((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes (travel, ticket, stand/seat plan)"
            className="w-full min-h-[90px] rounded-xl bg-card2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple/60 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Weekly checklist (persisted) */}
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

      {/* Extras hidden only on Red+Reduced or bare */}
      {showExtras && (
        <div className="space-y-4">
          {/* Today tasks (persisted per day by TodayCard using props) */}
          <TodayCard
            dateKey={selectedKey}
            tasks={selectedTasks}
            onChangeTasks={canEdit ? updateSelectedTasks : () => {}}
            readOnly={!canEdit}
          />

          {/* Status sliders (persisted) */}
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
                          [selectedKey]: { ...(prev?.[selectedKey] ?? { energy: 2, focus: 2, stress: 3 }), [row.key]: nextVal },
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming (persisted + add/edit/delete) */}
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

            {/* Editor */}
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

            {/* List */}
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

                    {item.notes && <div className="text-sm opacity-80 whitespace-pre-wrap">{item.notes}</div>}
                  </div>
                ))
              )}

              {upcomingSorted.length > 12 && (
                <div className="text-xs opacity-60">Showing first 12 items. (We can add a “show all” later.)</div>
              )}
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