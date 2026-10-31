/**
 * Lernpfad je Sprache.
 * 1. Kuratierte Units aus data/units.js (mit passender lang)
 * 2. Alle übrigen Songs dieser Sprache automatisch in Units zu je 8 Songs,
 *    Klassiker zuerst, Songs ohne gefundenen Songtext am Ende.
 */
import { UNITS, AUTO_LESSONS, UNIT_NAMES } from '../../data/units.js';
import { SONGS } from '../../data/songs.js';
import { LESSON_BY_ID } from '../../data/lessons.js';
import { state } from './state.js';

const PER_UNIT = 8;
const CLASSICS = /romeo santos|prince royce|aventura|juan luis guerra|anthony santos|toby love|marc anthony|thalia|enrique iglesias/i;

const cache = new Map();

export function targetLang() {
  return state.settings.targetLang || 'es';
}

export function unitsFor(lang = targetLang()) {
  const key = `${lang}|${SONGS.length}`;
  if (cache.has(key)) return cache.get(key);

  const curated = UNITS.filter((u) => (u.lang || 'en') === lang);
  const used = new Set(curated.flatMap((u) => u.stops.filter((s) => s.song).map((s) => s.song)));
  const rest = SONGS.filter((s) => s.lang === lang && !used.has(s.id));

  const score = (s) => (s.lrclib || !s.auto ? 0 : 2) + (CLASSICS.test(s.artist) ? 0 : 1);
  rest.sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title, 'de'));

  const withText = rest.filter((s) => s.lrclib || !s.auto);
  const noText = rest.filter((s) => !s.lrclib && s.auto);
  const lessons = (AUTO_LESSONS[lang] || []).filter((id) => LESSON_BY_ID[id]);
  const names = UNIT_NAMES[lang] || [];
  const auto = [];

  for (let i = 0; i < withText.length; i += PER_UNIT) {
    const n = auto.length;
    const chunk = withText.slice(i, i + PER_UNIT);
    const stops = chunk.map((s) => ({ song: s.id }));
    if (lessons[n]) stops.splice(Math.min(2, stops.length), 0, { lesson: lessons[n] });
    auto.push({
      id: `${lang}-auto-${n + 1}`,
      lang,
      title: names[n] || `Playlist ${n + 1}`,
      goal: n === 0 && CLASSICS.test(chunk[0]?.artist || '') ? 'Die großen Namen der Bachata: Romeo Santos, Prince Royce, Aventura.' : `${chunk.length} Songs aus deiner Sammlung.`,
      hue: (curated.length + n) * 47 % 360,
      auto: true,
      stops,
    });
  }
  // Übrige Lektionen nicht verlieren, falls es wenige Songs gibt
  const placed = new Set(auto.flatMap((u) => u.stops.filter((s) => s.lesson).map((s) => s.lesson)));
  const leftover = lessons.filter((l) => !placed.has(l));
  if (leftover.length) auto.push({ id: `${lang}-lessons`, lang, title: 'Grammatik', goal: 'Lektionen zu dieser Sprache.', hue: 200, auto: true, stops: leftover.map((l) => ({ lesson: l })) });

  if (noText.length) {
    auto.push({
      id: `${lang}-notext`,
      lang,
      title: 'Ohne Songtext',
      goal: 'Für diese Songs hat die freie Datenbank keinen Text gefunden. Füg ihn selbst ein, dann geht es los.',
      hue: 0,
      auto: true,
      muted: true,
      stops: noText.map((s) => ({ song: s.id })),
    });
  }

  const all = [...curated, ...auto];
  cache.set(key, all);
  return all;
}

export function clearJourneyCache() {
  cache.clear();
}

/** Anzahl Songs je Sprache (für die Sprachauswahl). */
export function songCount(lang) {
  return SONGS.filter((s) => s.lang === lang).length;
}
