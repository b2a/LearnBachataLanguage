/**
 * Zentraler, persistenter App-State (localStorage).
 * Lesen:     state.profile.xp
 * Schreiben: update((s) => { s.profile.xp += 10 })   → speichert + feuert 'state'
 *
 * Songtexte liegen getrennt (siehe lyrics.js), damit der Haupt-State klein bleibt.
 */
import { emit } from './events.js';

const KEY = 'bachatalingo.v1';

const DEFAULTS = () => ({
  version: 1,
  profile: {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: null,
    dailyGoal: 30,
    history: {}, // 'YYYY-MM-DD' → XP an diesem Tag
    achievements: {}, // id → Datum
    reviews: 0,
    shadowLines: 0,
  },
  progress: {}, // songId → { stages: { listen, title, read, practice, shadow }, listenNotes, mood }
  lessons: {}, // lessonId → { done, best }
  cards: {}, // cardId → Karte (siehe srs.js)
  settings: {
    theme: 'auto', // 'auto' | 'dark' | 'light'
    reverseCards: false,
    lyricView: 'both', // 'orig' | 'both' | 'tr'
    rate: 1,
    autoTranslate: true,
    newPerDay: 15,
  },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    return merge(DEFAULTS(), JSON.parse(raw));
  } catch {
    return DEFAULTS();
  }
}

/** Tiefes Zusammenführen, damit neue Default-Felder in alten Spielständen auftauchen. */
function merge(base, saved) {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return saved ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(saved || {})) {
    out[k] = k in base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) && Object.keys(base[k]).length
      ? merge(base[k], v)
      : v;
  }
  return out;
}

export const state = load();

let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { console.warn('Speichern fehlgeschlagen', err); }
  }, 50);
}

export function update(fn) {
  fn(state);
  save();
  emit('state', state);
}

export function songProgress(id) {
  if (!state.progress[id]) state.progress[id] = { stages: {} };
  return state.progress[id];
}

export function exportAll() {
  const lyrics = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('bachatalingo.lyrics.')) lyrics[k] = localStorage.getItem(k);
  }
  return JSON.stringify({ app: 'bachatalingo', exported: new Date().toISOString(), state, lyrics }, null, 2);
}

export function importAll(json) {
  const data = JSON.parse(json);
  if (data.app !== 'bachatalingo' || !data.state) throw new Error('Das ist keine Bachatalingo-Sicherung.');
  localStorage.setItem(KEY, JSON.stringify(data.state));
  for (const [k, v] of Object.entries(data.lyrics || {})) {
    if (k.startsWith('bachatalingo.lyrics.')) localStorage.setItem(k, v);
  }
}

export function resetAll() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('bachatalingo.')) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
