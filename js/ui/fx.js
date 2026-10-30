/**
 * Feier-Effekte. Alle Effekte entfallen bei „Bewegung reduzieren“.
 * Die Bedeutung transportieren immer zusätzlich Text/Toast, nie nur die Animation.
 */
import { prefersReducedMotion, h } from '../core/dom.js';

/** Einmaliges Konfetti (ca. 1,6 s, Canvas, kein Dauer-Loop). */
export function confetti({ x = 0.5, y = 0.35, count = 90 } = {}) {
  if (prefersReducedMotion()) return;
  const canvas = h('canvas.fx-canvas', { 'aria-hidden': 'true' });
  document.body.append(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--gold', '--ok', '--info'].map((v) => css.getPropertyValue(v).trim() || '#ff6f59');
  const parts = Array.from({ length: count }, () => ({
    x: x * W, y: y * H,
    vx: (Math.random() - 0.5) * 14 * dpr,
    vy: (-Math.random() * 12 - 4) * dpr,
    r: (Math.random() * 4 + 3) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  function frame(now) {
    const p = (now - t0) / 1600;
    ctx.clearRect(0, 0, W, H);
    for (const q of parts) {
      q.vy += 0.35 * dpr;
      q.vx *= 0.99;
      q.x += q.vx;
      q.y += q.vy;
      q.rot += q.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.c;
      ctx.fillRect(-q.r, -q.r / 2, q.r * 2, q.r);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

/** „+10 XP“ steigt kurz an einer Stelle auf. */
export function floatText(text, anchor) {
  if (prefersReducedMotion()) return;
  const r = anchor?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const el = h('div.fx-float', { 'aria-hidden': 'true', style: { left: `${r.left + r.width / 2}px`, top: `${r.top}px` } }, text);
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}

/** Kurzes Schütteln bei falscher Antwort. */
export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('fx-shake');
  void el.offsetWidth;
  el.classList.add('fx-shake');
  el.addEventListener('animationend', () => el.classList.remove('fx-shake'), { once: true });
}

/** Kurzes Aufleuchten (z. B. neue Karte). */
export function pop(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
  el.addEventListener('animationend', () => el.classList.remove('fx-pop'), { once: true });
}
