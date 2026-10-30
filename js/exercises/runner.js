/**
 * Übungs-Runner im Duolingo-Stil:
 * Fortschrittsbalken → Aufgabe → „Prüfen“ → Feedback-Leiste → „Weiter“.
 * Falsch beantwortete Aufgaben kommen einmal am Ende wieder.
 *
 * runSession({ title, items, backHref, onComplete(result), onExit(result) }) → HTMLElement
 *   onComplete: sobald alle Aufgaben gelöst sind (Fortschritt speichern)
 *   onExit:     Klick auf den Abschluss-Button (weiter navigieren)
 * result = { correct, total, accuracy, xp }
 */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { TYPES } from './types.js';
import { bar } from '../ui/widgets.js';
import { confetti, shake, floatText } from '../ui/fx.js';
import { sfx } from '../core/sfx.js';
import { addXP } from '../core/gamify.js';
import { stopSpeaking } from '../core/speech.js';

const PRAISE = ['Stark!', 'Genau!', 'Richtig!', 'Perfekt!', 'Super!', 'Im Takt!', '¡Eso!', 'Klasse!'];
const COMFORT = ['Fast!', 'Nicht ganz.', 'Knapp daneben.', 'Das kommt noch.'];

export function runSession({ title = 'Übung', items, backHref = '#/', onComplete, onExit, finishLabel = 'Weiter' }) {
  const total = items.length;
  const queue = items.map((it) => ({ ...it, _retry: false }));
  let solved = 0;
  let firstTry = 0;
  let streak = 0;
  let current = null;
  let phase = 'answer'; // 'answer' | 'feedback' | 'done'
  let lastRetry = null;
  const startedAt = Date.now();

  const progress = bar(0, 'bar-lg');
  const comboEl = h('div.combo', { 'aria-live': 'polite' });
  const stage = h('div.run-stage');
  const checkBtn = h('button.btn.btn-primary.btn-lg', { type: 'button', disabled: true, onClick: onAction }, 'Prüfen');
  const skipBtn = h('button.btn.btn-ghost', { type: 'button', onClick: skip }, 'Überspringen');
  const sheet = h('div.feedback', { 'aria-live': 'assertive' });
  const footer = h('footer.run-footer', h('div.run-footer-inner', skipBtn, checkBtn));
  // Feedback + Buttons sitzen gemeinsam fest am unteren Rand (kein Layout-Sprung)
  const dock = h('div.run-dock', sheet, footer);

  const root = h('div.run',
    h('header.run-head',
      h('a.icon-btn', { href: backHref, 'aria-label': 'Übung beenden', title: 'Beenden' }, icon('x', 22)),
      progress,
      comboEl,
    ),
    h('p.run-title.muted', title),
    stage,
    dock,
  );

  const onKey = (e) => {
    if (phase === 'done') return;
    if (current?.keys?.(e)) { e.preventDefault(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      if (!checkBtn.disabled) { e.preventDefault(); onAction(); }
    }
  };
  document.addEventListener('keydown', onKey);
  document.body.classList.add('is-focus-mode'); // Navigation ausblenden, volle Konzentration
  root.cleanup = () => {
    document.body.classList.remove('is-focus-mode');
    document.removeEventListener('keydown', onKey);
    current?.destroy?.();
    stopSpeaking();
  };

  function next() {
    current?.destroy?.();
    stopSpeaking();
    if (!queue.length) return finish();
    const item = queue[0];
    phase = 'answer';
    sheet.className = 'feedback';
    dock.className = 'run-dock';
    clear(sheet);
    footer.hidden = false;
    checkBtn.textContent = 'Prüfen';
    checkBtn.disabled = true;
    skipBtn.hidden = item.type === 'pairs';
    const ctx = {
      setReady: (v) => { if (phase === 'answer') checkBtn.disabled = !v; },
      submit: () => { if (phase === 'answer') onAction(); },
    };
    const render = TYPES[item.type];
    if (!render) { console.warn('Unbekannter Übungstyp', item.type); queue.shift(); return next(); }
    current = render(item, ctx);
    fill(stage, current.el);
    current.el.classList.add('ex-enter');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => current.focus?.(), 50);
  }

  function onAction() {
    if (phase === 'answer') return evaluate();
    if (phase === 'feedback') return next();
  }

  function evaluate(forceOk = false) {
    const item = queue.shift();
    const res = forceOk ? { ok: true } : current.check();
    phase = 'feedback';
    if (res.ok) {
      solved += 1;
      if (!item._retry) firstTry += 1;
      streak += 1;
      sfx('ok');
    } else {
      streak = 0;
      sfx('err');
      shake(current.el);
      if (!item._retry) { lastRetry = { ...item, _retry: true }; queue.push(lastRetry); }
      else solved += 1; // zweiter Versuch: weiter, damit niemand hängen bleibt
    }
    progress.set(solved / total);
    comboEl.textContent = streak >= 3 ? `${streak}× in Folge` : '';
    comboEl.classList.toggle('is-on', streak >= 3);

    sheet.className = 'feedback is-open';
    dock.className = `run-dock ${res.ok ? 'is-ok' : 'is-err'}`;
    fill(sheet, 
      h('div.feedback-inner',
        h('div.feedback-icon', icon(res.ok ? 'check' : 'x', 26)),
        h('div.feedback-text',
          h('strong', res.ok ? pick(PRAISE) : pick(COMFORT)),
          !res.ok && res.solution ? h('p', h('span.muted', 'Richtig: '), res.solution) : null,
          res.detail || null,
          res.explain ? h('p.muted', res.explain) : null,
          !res.ok && res.canOverride ? h('button.btn.btn-ghost.btn-sm', { type: 'button', onClick: () => override(item) }, 'Ich lag doch richtig') : null,
        ),
      ),
    );
    skipBtn.hidden = true;
    checkBtn.textContent = 'Weiter';
    checkBtn.disabled = false;
    checkBtn.focus({ preventScroll: true });
  }

  /** Ehrlichkeits-Button wie in Anki: eigene Antwort als richtig werten. */
  function override(item) {
    const idx = queue.indexOf(lastRetry);
    if (idx >= 0) queue.splice(idx, 1);
    if (!item._retry) { solved += 1; firstTry += 1; } // Wiederholungen sind schon gezählt
    progress.set(solved / total);
    dock.className = 'run-dock is-ok';
    fill(sheet, h('div.feedback-inner', h('div.feedback-icon', icon('check', 26)), h('div.feedback-text', h('strong', 'Okay, zählt als richtig.'))));
  }

  function skip() {
    if (phase !== 'answer') return;
    const item = queue.shift();
    queue.push({ ...item, _retry: true });
    next();
  }

  function finish() {
    phase = 'done';
    current?.destroy?.();
    footer.hidden = true;
    sheet.className = 'feedback';
    dock.className = 'run-dock';
    const accuracy = total ? firstTry / total : 1;
    const xp = 10 + Math.round(firstTry * 2 + (accuracy === 1 ? 5 : 0));
    const secs = Math.round((Date.now() - startedAt) / 1000);
    const result = { correct: firstTry, total, accuracy, xp };
    progress.set(1);
    sfx('done');
    confetti();
    const xpEl = h('div.stat-big', h('span.stat-num', `+${xp}`), h('span.stat-label', 'XP'));
    fill(stage, 
      h('div.run-done',
        h('div.done-badge', icon(accuracy >= 0.8 ? 'trophy' : 'star', 40)),
        h('h2', accuracy === 1 ? 'Fehlerfrei!' : accuracy >= 0.8 ? 'Geschafft!' : 'Gut gekämpft!'),
        h('div.done-stats',
          xpEl,
          h('div.stat-big', h('span.stat-num', `${Math.round(accuracy * 100)} %`), h('span.stat-label', 'Treffer')),
          h('div.stat-big', h('span.stat-num', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`), h('span.stat-label', 'Zeit')),
        ),
        h('button.btn.btn-primary.btn-lg', { type: 'button', onClick: () => (onExit ? onExit(result) : (location.hash = backHref)) }, finishLabel),
      ),
    );
    addXP(xp, title);
    floatText(`+${xp} XP`, xpEl);
    onComplete?.(result);
  }

  if (!items.length) {
    fill(stage, h('div.empty', h('h3', 'Noch keine Aufgaben'), h('p.muted', 'Für diese Übung fehlen noch Inhalte.')));
    footer.hidden = true;
  } else {
    next();
  }
  return root;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
