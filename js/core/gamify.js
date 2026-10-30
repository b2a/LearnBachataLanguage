/** XP, Streak, Level und Abzeichen. */
import { state, update, todayKey } from './state.js';
import { emit } from './events.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';

/** Level-Kurve: jedes Level braucht etwas mehr XP als das vorige. */
export function levelInfo(xp = state.profile.xp) {
  let level = 1;
  let need = 60;
  let rest = xp;
  while (rest >= need) { rest -= need; level += 1; need = Math.round(need * 1.18); }
  return { level, into: rest, need, pct: rest / need };
}

export function todayXP() {
  return state.profile.history[todayKey()] || 0;
}

export function goalPct() {
  return Math.min(1, todayXP() / state.profile.dailyGoal);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/** Streak gilt nur, wenn heute oder gestern gelernt wurde. */
export function currentStreak() {
  const { lastDay, streak } = state.profile;
  return lastDay === todayKey() || lastDay === yesterdayKey() ? streak : 0;
}

export function addXP(amount, reason = '') {
  if (!amount) return;
  const before = levelInfo().level;
  const wasGoalMet = goalPct() >= 1;
  update((s) => {
    const p = s.profile;
    const today = todayKey();
    p.xp += amount;
    p.history[today] = (p.history[today] || 0) + amount;
    if (p.lastDay !== today) {
      p.streak = p.lastDay === yesterdayKey() ? p.streak + 1 : 1;
      p.lastDay = today;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
    }
  });
  emit('xp', { amount, reason });
  const after = levelInfo().level;
  if (after > before) emit('levelup', { level: after });
  if (!wasGoalMet && goalPct() >= 1) emit('goal', { streak: state.profile.streak });
  checkAchievements();
}

export function checkAchievements() {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (state.profile.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(state); } catch { ok = false; }
    if (ok) unlocked.push(a);
  }
  if (!unlocked.length) return;
  update((s) => unlocked.forEach((a) => (s.profile.achievements[a.id] = todayKey())));
  unlocked.forEach((a) => emit('achievement', a));
}

/** Letzte n Tage als [{ key, xp }] für das Aktivitätsdiagramm. */
export function lastDays(n = 14) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    out.push({ key, date: d, xp: state.profile.history[key] || 0 });
  }
  return out;
}
