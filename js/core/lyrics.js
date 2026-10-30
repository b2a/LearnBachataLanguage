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

export async function searchLRCLIB({ track, artist }) {
  const params = new URLSearchParams();
  if (track) params.set('track_name', track);
  if (artist) params.set('artist_name', artist);
  let res = await fetch(`${LRCLIB}/search?${params}`);
  if (!res.ok) throw new Error(`LRCLIB antwortet nicht (${res.status}).`);
  let list = await res.json();
  if (!list.length && artist) {
    res = await fetch(`${LRCLIB}/search?q=${encodeURIComponent(`${track} ${artist}`)}`);
    list = res.ok ? await res.json() : [];
  }
  if (!list.length) {
    res = await fetch(`${LRCLIB}/search?q=${encodeURIComponent(track)}`);
    list = res.ok ? await res.json() : [];
  }
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
