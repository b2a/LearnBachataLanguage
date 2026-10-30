/** Kurze, leise Synthesizer-Töne für Feedback (abschaltbar im Profil). */
import { state } from './state.js';

let ctx;
function tone(freq, start, dur, type = 'sine', gain = 0.06) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

export function sfx(kind) {
  if (state.settings.sounds === false) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (kind === 'ok') { tone(660, 0, 0.12); tone(990, 0.08, 0.18); }
    else if (kind === 'err') { tone(220, 0, 0.22, 'triangle', 0.05); }
    else if (kind === 'done') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22)); }
    else if (kind === 'tap') { tone(880, 0, 0.05, 'sine', 0.03); }
  } catch { /* kein Audio – egal */ }
}
