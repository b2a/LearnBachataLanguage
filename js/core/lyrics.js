/**
 * Songtexte: speichern, LRC lesen/schreiben, aus LRCLIB laden.
 *
 * Format im Speicher:
 * {
 *   lines: [{ t: Sekunden|null, text: 'Original', tr: 'Übersetzung', mine: 'eigene Übersetzung' }],
 *   offset: Sekunden (wird auf alle Zeitstempel addiert, für Remixe mit anderem Intro),
 *   source: 'lrclib' | 'manual',
 *   synced: true|false
 * }
 */
import { emit } from './events.js';
import { normAnswer } from './text.js';
import { setSongLang } from '../../data/songs.js';

const PREFIX = 'bachatalingo.lyrics.';

export function getLyrics(songId) {
  try {
    const raw = localStorage.getItem(PREFIX + songId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLyrics(songId, data) {
  const clean = {
    ...data,
    offset: Number(data.offset) || 0,
    synced: data.lines.some((l) => l.t != null),
  };
  localStorage.setItem(PREFIX + songId, JSON.stringify(clean));
  emit('lyrics', { songId });
  return clean;
}

export function deleteLyrics(songId) {
  localStorage.removeItem(PREFIX + songId);
  emit('lyrics', { songId });
}

export function hasLyrics(songId) {
  return localStorage.getItem(PREFIX + songId) != null;
}

/** LRC-Text → Zeilen. Unterstützt mehrere Zeitstempel pro Zeile und [offset:]. */
export function parseLRC(text) {
  const lines = [];
  let offset = 0;
  const tagRe = /\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
  for (const raw of text.split(/\r?\n/)) {
    const off = raw.match(/^\[offset:\s*([+-]?\d+)\]/i);
    if (off) { offset = -Number(off[1]) / 1000; continue; }
    if (/^\[(ar|ti|al|by|length|re|ve|au|#):/i.test(raw)) continue;
    const times = [...raw.matchAll(tagRe)].map((m) => Number(m[1]) * 60 + Number(m[2].replace(':', '.')));
    const body = raw.replace(tagRe, '').replace(/<\d+:\d+\.\d+>/g, '').trim();
    if (times.length) times.forEach((t) => lines.push({ t, text: body }));
    else if (body) lines.push({ t: null, text: body });
  }
  const timed = lines.filter((l) => l.t != null);
  if (timed.length) {
    timed.sort((a, b) => a.t - b.t);
    // leere Zeitstempel sind Pausen. Behalten, damit die Hervorhebung endet, aber Duplikate entfernen.
    return { lines: timed.filter((l, i, a) => l.text || (a[i - 1] && a[i - 1].text)), offset };
  }
  return { lines, offset };
}

/** Reiner Text → Zeilen ohne Zeitstempel. */
export function parsePlain(text) {
  return {
    lines: text.split(/\r?\n/).map((l) => l.trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim()))
      .map((text) => ({ t: null, text })),
    offset: 0,
  };
}

/** Erkennt automatisch LRC oder reinen Text. */
export function parseAny(text) {
  return /\[\d{1,2}:\d{1,2}/.test(text) ? parseLRC(text) : parsePlain(text);
}

export function toLRC(lyr, meta = {}) {
  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = (t - m * 60).toFixed(2).padStart(5, '0');
    return `[${String(m).padStart(2, '0')}:${s}]`;
  };
  const head = [meta.title && `[ti:${meta.title}]`, meta.artist && `[ar:${meta.artist}]`, '[by:Bachatalingo]'].filter(Boolean);
  const body = lyr.lines.map((l) => (l.t != null ? fmt(Math.max(0, l.t + (lyr.offset || 0))) : '') + l.text);
  return [...head, ...body].join('\n');
}

/** Index der aktiven Zeile zur Zeit t (Sekunden), -1 vor der ersten Zeile. */
export function activeIndex(lyr, t) {
  if (!lyr?.synced) return -1;
  const off = lyr.offset || 0;
  let idx = -1;
  for (let i = 0; i < lyr.lines.length; i++) {
    const lt = lyr.lines[i].t;
    if (lt == null) continue;
    if (lt + off <= t + 0.05) idx = i;
    else break;
  }
  return idx;
}

/** Start/Ende einer Zeile in Sekunden (Ende = Start der nächsten Zeile mit Zeitstempel). */
export function lineSpan(lyr, i, duration = Infinity) {
  const off = lyr.offset || 0;
  const start = lyr.lines[i]?.t;
  if (start == null) return null;
  let end = duration;
  for (let j = i + 1; j < lyr.lines.length; j++) {
    if (lyr.lines[j].t != null) { end = lyr.lines[j].t + off; break; }
  }
  // Sehr lange Instrumentalpausen auf 8 s kappen
  end = Math.min(end, start + off + 8);
  return { start: Math.max(0, start + off), end };
}

/** Markiert Zeilen, die mehrfach vorkommen (meist Refrain). → Set von normalisierten Texten */
export function chorusLines(lyr) {
  const count = new Map();
  for (const l of lyr?.lines || []) {
    const k = normAnswer(l.text);
    if (k.split(' ').length < 3) continue;
    count.set(k, (count.get(k) || 0) + 1);
  }
  return new Set([...count].filter(([, n]) => n >= 2).map(([k]) => k));
}

/* ---------- LRCLIB (freie Lyrics-Datenbank, https://lrclib.net) ---------- */

const LRCLIB = 'https://lrclib.net/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fehler, der vermutlich vorübergehend ist (Server überlastet, Netz weg). */
export class TemporaryError extends Error {
  constructor(msg) { super(msg); this.temporary = true; }
}

/**
 * GET mit Wiederholung: Bei 429/5xx oder Netzfehler bis zu 4 weitere Versuche
 * mit wachsender Pause (1 s, 2 s, 4 s, 8 s, plus Zufall). Retry-After wird beachtet.
 * 404 ist kein Fehler, sondern „nicht vorhanden“ → null.
 */
async function lrclibGet(url, { tries = 5, onRetry } = {}) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    let res = null;
    try {
      res = await fetch(url);
    } catch {
      last = 'Keine Verbindung zu LRCLIB';
    }
    if (res) {
      if (res.ok) return res.json();
      if (res.status === 404) return null;
      last = `LRCLIB antwortet mit ${res.status}`;
      // 4xx (außer 429) ist dauerhaft, Wiederholen bringt nichts
      if (res.status !== 429 && res.status < 500) throw new Error(last);
    }
    if (i < tries - 1) {
      onRetry?.(i + 1, res?.status || 0);
      const ra = Number(res?.headers.get('retry-after'));
      await sleep(ra > 0 ? ra * 1000 : 1000 * 2 ** i + Math.random() * 500);
    }
  }
  throw new TemporaryError(`${last}. LRCLIB ist gerade überlastet, bitte später erneut versuchen.`);
}

export async function searchLRCLIB({ track, artist }) {
  const params = new URLSearchParams();
  if (track) params.set('track_name', track);
  if (artist) params.set('artist_name', artist);
  let list = (await lrclibGet(`${LRCLIB}/search?${params}`)) || [];
  if (!list.length && artist) list = (await lrclibGet(`${LRCLIB}/search?q=${encodeURIComponent(`${track} ${artist}`)}`)) || [];
  if (!list.length) list = (await lrclibGet(`${LRCLIB}/search?q=${encodeURIComponent(track)}`)) || [];
  // synchronisierte Treffer zuerst
  return list
    .filter((r) => r.plainLyrics || r.syncedLyrics)
    .sort((a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics))
    .slice(0, 12);
}

export function fromLRCLIB(result) {
  const parsed = result.syncedLyrics ? parseLRC(result.syncedLyrics) : parsePlain(result.plainLyrics || '');
  return { ...parsed, source: 'lrclib', sourceId: result.id, sourceName: `${result.artistName} – ${result.trackName}` };
}

/* ---------- Automatisch laden ---------- */

const LANG_HINTS = {
  es: 'que de la el en y los se no me te mi tu por con para un una lo es yo como pero si más cuando quiero amor corazón contigo sin todo nada eres estoy vida porque ya está esta',
  en: "the and you i to me my it is in that on your of for be love can don't i'm just know all we what so baby when this like but with no",
  pt: 'você não eu meu minha que de o a com para é um uma te amor coração mais vou tudo quando sem nós isso estou também então',
  ro: 'și nu eu tu că de la în mă te mi ce iubire inimă cu pe sunt ești dar mai am',
};
const HINT_SETS = Object.fromEntries(Object.entries(LANG_HINTS).map(([k, v]) => [k, new Set(v.split(' '))]));

/** Sprache eines Songtexts schätzen (Häufigkeit typischer Funktionswörter). */
export function detectLang(lyr) {
  const ws = (lyr?.lines || []).flatMap((l) => l.text.toLowerCase().match(/[\p{L}'’]+/gu) || []);
  if (ws.length < 20) return null;
  let best = null;
  let score = 0;
  for (const [k, set] of Object.entries(HINT_SETS)) {
    const sc = ws.filter((w) => set.has(w)).length / ws.length;
    if (sc > score) { best = k; score = sc; }
  }
  return score > 0.06 ? best : null;
}

export async function fetchLRCLIB(id, opts) {
  const data = await lrclibGet(`${LRCLIB}/get/${id}`, opts);
  return data ? fromLRCLIB(data) : null;
}

const normT = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const pending = new Map();

/**
 * Songtext laden mit Ergebnis-Status:
 *  { lyr, status: 'ok' | 'missing' (gibt es nicht) | 'error' (vorübergehend, später nochmal) }
 */
export function loadLyrics(song, opts = {}) {
  const have = getLyrics(song.id);
  if (have) return Promise.resolve({ lyr: have, status: 'ok' });
  if (song.noAutoLyrics) return Promise.resolve({ lyr: null, status: 'missing' });
  if (pending.has(song.id)) return pending.get(song.id);
  const job = (async () => {
    try {
      let lyr = null;
      if (song.lrclib) lyr = await fetchLRCLIB(song.lrclib, opts);
      else {
        const list = await searchLRCLIB({ track: song.lyrics?.track || song.title, artist: song.lyrics?.artist || '' });
        const t = normT(song.lyrics?.track || song.title);
        // Nur übernehmen, wenn Titel UND einer der Interpreten passt. Reine Titeltreffer
        // sind oft ein ganz anderer Song (dann lieber manuell im Editor wählen).
        const artists = (song.lyrics?.artist || song.artist || '').split(/[,&]/).map(normT).filter((a) => a.length > 1);
        const hit = list.find((r) => normT(r.trackName) === t && artists.some((a) => normT(r.artistName).includes(a)));
        if (hit) lyr = fromLRCLIB(hit);
      }
      if (!lyr || !lyr.lines.length) return { lyr: null, status: 'missing' };
      const saved = saveLyrics(song.id, lyr);
      // Eigene/gesuchte Songs: Sprache am Text erkennen
      if (song.auto && !song.lrclib) {
        const lang = detectLang(saved);
        if (lang) setSongLang(song.id, lang);
      }
      return { lyr: saved, status: 'ok' };
    } catch (err) {
      return { lyr: null, status: err.temporary || err instanceof TypeError ? 'error' : 'missing', error: err.message };
    } finally {
      pending.delete(song.id);
    }
  })();
  pending.set(song.id, job);
  return job;
}

/** Kurzform: → Lyrics oder null. Wirft nie. */
export async function ensureLyrics(song) {
  return (await loadLyrics(song)).lyr;
}

/* ---------- Sammel-Download im Hintergrund ---------- */

/**
 * Läuft weiter, auch wenn du die Seite wechselst. Zustand über batchState(),
 * Änderungen kommen als Event 'lyricsBatch'.
 * Ablauf: 1. Runde zügig (≈ 3 Anfragen/s), 2. Runde langsam nur für Fehlschläge.
 */
let batch = null;

export function batchState() {
  return batch;
}

export function startBatch(songs) {
  if (batch?.running) return batch;
  const ctrl = new AbortController();
  batch = { running: true, round: 1, total: songs.length, done: 0, ok: 0, missing: 0, failed: [], current: null, retrying: false, ctrl, startedAt: Date.now() };
  const tick = () => emit('lyricsBatch', batch);

  (async () => {
    let queue = songs;
    for (const round of [1, 2]) {
      if (round === 2) {
        if (!batch.failed.length || ctrl.signal.aborted) break;
        queue = batch.failed;
        batch.failed = [];
        batch.round = 2;
        batch.done -= queue.length; // diese zählen nochmal
        tick();
        await sleep(3000); // Server kurz Luft lassen
      }
      for (const s of queue) {
        if (ctrl.signal.aborted) break;
        batch.current = s;
        batch.retrying = false;
        tick();
        const r = await loadLyrics(s, { onRetry: () => { batch.retrying = true; tick(); } });
        batch.done += 1;
        if (r.status === 'ok') batch.ok += 1;
        else if (r.status === 'missing') batch.missing += 1;
        else batch.failed.push(s);
        tick();
        await sleep(round === 1 ? 300 : 1200);
      }
    }
    batch.running = false;
    batch.current = null;
    batch.aborted = ctrl.signal.aborted;
    tick();
  })();
  tick();
  return batch;
}

export function stopBatch() {
  batch?.ctrl.abort();
}
