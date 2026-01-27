// src/data/storage/localStorage.js

const KEY = "lifeOps.appData.v1";

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// deep merge so new keys don't wipe older saved keys
function deepMerge(base, patch) {
  const out = { ...(base || {}) };
  for (const k of Object.keys(patch || {})) {
    const bv = out[k];
    const pv = patch[k];
    if (isObject(bv) && isObject(pv)) out[k] = deepMerge(bv, pv);
    else out[k] = pv;
  }
  return out;
}

export function loadAppData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAppData(patch) {
  const current = loadAppData();
  const next = deepMerge(current, patch);
  localStorage.setItem(KEY, JSON.stringify(next));
}