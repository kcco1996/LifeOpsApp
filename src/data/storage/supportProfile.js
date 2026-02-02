// src/data/storage/supportProfile.js
const KEY = "lifeops:support:profile";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getSupportProfile() {
  return safeParse(localStorage.getItem(KEY), {
    trustedPeople: [
      // { name: "", method: "", notes: "" }
    ],
    earlyWarningSigns: "",
    whatHelps: "",
    groundingKit: "",
  });
}

export function setSupportProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile ?? {}));
}
