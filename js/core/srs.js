/**
 * Spaced Repetition im Anki-Stil (vereinfachtes SM-2).
 *
 * Karte: {
 *   id, front, back, lang, note, example, exampleTr, songId, created,
 *   state: 'new' | 'learning' | 'review' | 'relearning',
 *   step, due (ms), interval (Tage), ease, reps, lapses
 * }
 * Bewertungen: 0 = Nochmal, 1 = Schwer, 2 = Gut, 3 = Einfach
 */
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const LEARN_STEPS = [1 * MIN, 10 * MIN];
const RELEARN_STEPS = [10 * MIN];

export const GRADES = [
  { id: 0, label: 'Nochmal', key: '1' },
  { id: 1, label: 'Schwer', key: '2' },
  { id: 2, label: 'Gut', key: '3' },
  { id: 3, label: 'Einfach', key: '4' },
];

export function makeCard(fields) {
  const now = Date.now();
  return {
    id: fields.id || `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    front: '', back: '', lang: 'en', note: '', example: '', exampleTr: '', songId: null,
    ...fields,
    created: now, state: 'new', step: 0, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0,
  };
}

/** Gibt eine neue Karte mit aktualisierter Planung zurück (Original bleibt unverändert). */
export function schedule(card, grade, now = Date.now()) {
  const c = { ...card, reps: card.reps + 1, lastReview: now };
  const learning = c.state === 'new' || c.state === 'learning' || c.state === 'relearning';

  if (learning) {
    const steps = c.state === 'relearning' ? RELEARN_STEPS : LEARN_STEPS;
    if (c.state === 'new') c.state = 'learning';
    if (grade === 0) { c.step = 0; c.due = now + steps[0]; return c; }
    if (grade === 1) { c.due = now + Math.round(steps[Math.min(c.step, steps.length - 1)] * 1.5); return c; }
    if (grade === 3) {
      c.interval = c.state === 'relearning' ? Math.max(1, c.interval) : 4;
      return graduate(c, now);
    }
    // Gut
    c.step += 1;
    if (c.step >= steps.length) {
      c.interval = c.state === 'relearning' ? Math.max(1, c.interval) : 1;
      return graduate(c, now);
    }
    c.due = now + steps[c.step];
    return c;
  }

  // Wiederholungsphase
  if (grade === 0) {
    c.lapses += 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.interval = Math.max(1, Math.round(c.interval * 0.5));
    c.state = 'relearning';
    c.step = 0;
    c.due = now + RELEARN_STEPS[0];
    return c;
  }
  if (grade === 1) { c.ease = Math.max(1.3, c.ease - 0.15); c.interval = Math.max(c.interval + 1, Math.round(c.interval * 1.2)); }
  if (grade === 2) c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease));
  if (grade === 3) { c.interval = Math.max(c.interval + 2, Math.round(c.interval * c.ease * 1.3)); c.ease += 0.15; }
  return graduate(c, now);
}

function graduate(c, now) {
  c.state = 'review';
  c.step = 0;
  // kleine Streuung, damit nicht alle Karten am selben Tag fällig werden
  const fuzz = c.interval > 2 ? 1 + (Math.random() * 0.1 - 0.05) : 1;
  c.interval = Math.max(1, Math.round(c.interval * fuzz));
  c.due = startOfDay(now) + c.interval * DAY + 4 * 60 * MIN; // 4 Uhr morgens
  return c;
}

function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Text wie „10 Min.“ / „3 T.“ für die Buttons. */
export function previewLabel(card, grade) {
  const next = schedule(card, grade, Date.now());
  const ms = next.due - Date.now();
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} Min.`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))} Std.`;
  const d = Math.round(ms / DAY);
  if (d < 30) return `${d} T.`;
  if (d < 365) return `${Math.round(d / 30)} Mon.`;
  return `${(d / 365).toFixed(1)} J.`;
}

/**
 * Stellt die heutige Wiederholungs-Warteschlange zusammen:
 * fällige Karten zuerst, dann bis zu `newLimit` neue Karten.
 */
export function buildQueue(cards, { newLimit = 15, newSeenToday = 0 } = {}) {
  const now = Date.now();
  const all = Object.values(cards);
  const due = all.filter((c) => c.state !== 'new' && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = all.filter((c) => c.state === 'new').sort((a, b) => a.created - b.created).slice(0, Math.max(0, newLimit - newSeenToday));
  return [...due, ...fresh];
}

export function countDue(cards, opts) {
  return buildQueue(cards, opts).length;
}

/** Kartenstärke 0..1 für Anzeigen (Balken in der Wortliste). */
export function strength(card) {
  if (card.state === 'new') return 0;
  if (card.state !== 'review') return 0.15;
  return Math.min(1, Math.log2(1 + card.interval) / Math.log2(1 + 90));
}
