// ============================================================================
// RED DOME OUTPOST — Versioned Autosave & Record Persistence
// ============================================================================

const SAVE_KEY = "red_dome_outpost_save_v1";
const RECORDS_KEY = "red_dome_outpost_records_v1";

const memoryStorage = new Map();

function getStore() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Fallback to in-memory store
  }
  return {
    getItem: (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
    setItem: (k, v) => memoryStorage.set(k, String(v)),
    removeItem: (k) => memoryStorage.delete(k),
  };
}

export function loadRecords() {
  const store = getStore();
  try {
    const raw = store.getItem(RECORDS_KEY);
    if (!raw) {
      return {
        chapterStars: { chapter_1: 0, chapter_2: 0, chapter_3: 0, chapter_4: 0 },
        bestEndlessSol: 1,
        bestEndlessScore: 0,
        bestEndlessRank: "Landing Pad Pioneer",
        tourCompleted: false,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      chapterStars: {
        chapter_1: Number(parsed?.chapterStars?.chapter_1 || 0),
        chapter_2: Number(parsed?.chapterStars?.chapter_2 || 0),
        chapter_3: Number(parsed?.chapterStars?.chapter_3 || 0),
        chapter_4: Number(parsed?.chapterStars?.chapter_4 || 0),
      },
      bestEndlessSol: Number(parsed?.bestEndlessSol || 1),
      bestEndlessScore: Number(parsed?.bestEndlessScore || 0),
      bestEndlessRank: String(parsed?.bestEndlessRank || "Landing Pad Pioneer"),
      tourCompleted: Boolean(parsed?.tourCompleted),
    };
  } catch {
    return {
      chapterStars: { chapter_1: 0, chapter_2: 0, chapter_3: 0, chapter_4: 0 },
      bestEndlessSol: 1,
      bestEndlessScore: 0,
      bestEndlessRank: "Landing Pad Pioneer",
      tourCompleted: false,
    };
  }
}

export function saveRecords(records) {
  const store = getStore();
  try {
    store.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function saveColonySnapshot(snapshot) {
  const store = getStore();
  try {
    const payload = {
      version: 1,
      savedAt: Date.now(),
      state: snapshot,
    };
    store.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadColonySnapshot() {
  const store = getStore();
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.state) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function clearColonySnapshot() {
  const store = getStore();
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
