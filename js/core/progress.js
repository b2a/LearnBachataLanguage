/** Fortschritt auf der Lernreise. */
import { state, update, songProgress } from './state.js';
import { UNITS } from '../../data/units.js';
import { STAGES } from '../../data/achievements.js';
import { checkAchievements } from './gamify.js';
import { emit } from './events.js';

export { STAGES };

export const STAGE_INFO = {
  listen: { label: 'Hören', ic: 'headphones', desc: 'Blind hören: Stimmung erspüren und erste Wörter fischen.' },
  title: { label: 'Titel', ic: 'text', desc: 'Der Songtitel als Mini-Lektion mit Grammatik-Trick.' },
  read: { label: 'Mitlesen', ic: 'book', desc: 'Karaoke-Text mit Übersetzung. Tippe auf Wörter, um sie zu sammeln.' },
  practice: { label: 'Üben', ic: 'puzzle', desc: 'Lückentext, Satzbau, Diktat und Rückübersetzung aus dem Songtext.' },
  shadow: { label: 'Shadowing', ic: 'mic', desc: 'Zeile für Zeile nachsingen, wie ein Schatten.' },
};

export function stageDone(songId, stage) {
  return !!state.progress[songId]?.stages?.[stage];
}

/** Station abschließen. → true, wenn sie neu abgeschlossen wurde */
export function completeStage(songId, stage) {
  if (stageDone(songId, stage)) return false;
  update(() => { songProgress(songId).stages[stage] = Date.now(); });
  checkAchievements();
  emit('stage', { songId, stage, songDone: songPct(songId) === 1 });
  return true;
}

export function songPct(songId) {
  return STAGES.filter((s) => stageDone(songId, s)).length / STAGES.length;
}

export function lessonDone(id) {
  return !!state.lessons[id]?.done;
}

export function completeLesson(id, accuracy) {
  const was = lessonDone(id);
  update((s) => {
    const l = s.lessons[id] || {};
    s.lessons[id] = { done: true, best: Math.max(l.best || 0, accuracy) };
  });
  checkAchievements();
  return !was;
}

export function stopDone(stop) {
  return stop.song ? songPct(stop.song) === 1 : lessonDone(stop.lesson);
}

/** Nächste empfohlene Station (erste nicht abgeschlossene auf dem Pfad). */
export function nextStop() {
  for (const u of UNITS) for (const st of u.stops) if (!stopDone(st)) return { unit: u, stop: st };
  return null;
}

export function unitPct(unit) {
  const n = unit.stops.reduce((sum, st) => sum + (st.song ? songPct(st.song) : lessonDone(st.lesson) ? 1 : 0), 0);
  return n / unit.stops.length;
}

/** Nächste offene Station eines Songs. */
export function nextStage(songId) {
  return STAGES.find((s) => !stageDone(songId, s)) || null;
}
