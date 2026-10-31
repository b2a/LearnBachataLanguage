/**
 * Wiederholen im Anki-Stil:
 * Vorderseite → erst selbst erinnern → umdrehen → ehrlich bewerten (Nochmal/Schwer/Gut/Einfach).
 */
import { cardsInTarget } from '../core/deck.js';
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { state, update } from '../core/state.js';
import { buildQueue, schedule, GRADES, previewLabel } from '../core/srs.js';
import { speak } from '../core/speech.js';
import { addXP } from '../core/gamify.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { cardsQuiz } from '../exercises/generate.js';
import { runSession } from '../exercises/runner.js';
import { bar, btn, empty } from '../ui/widgets.js';
import { confetti } from '../ui/fx.js';
import { sfx } from '../core/sfx.js';
import { newSeenToday } from '../ui/shell.js';
import { tipBox } from './common.js';

export function reviewView(ctx) {
  const root = h('div.page.page-review');
  const queue = buildQueue(cardsInTarget(), { newLimit: state.settings.newPerDay, newSeenToday: newSeenToday() });
  const total = queue.length;
  let done = 0;
  let xp = 0;
  let flipped = false;
  let current = null;
  let onKey = null;

  if (!total) {
    const all = Object.values(cardsInTarget());
    root.append(
      h('header.page-head', h('div', h('h1', 'Wiederholen'), h('p.page-sub', 'Spaced Repetition wie bei Anki: Jede Karte kommt genau dann, wenn du sie fast vergessen hättest.'))),
      empty(all.length ? 'Alles erledigt für heute' : 'Noch keine Karten',
        all.length ? `Du hast ${all.length} Karten im Stapel. Die nächsten werden fällig, wenn es Zeit ist.` : 'Tippe beim Mitlesen auf Wörter oder schließ eine Titel-Lektion ab. Dann füllt sich dein Stapel.',
        all.length >= 4 ? btn('Schnellquiz mit allen Karten', { kind: 'primary', ic: 'puzzle', onClick: quiz }) : btn('Zur Lernreise', { kind: 'primary', href: '#/' })),
      tipBox('Hermann Ebbinghaus', 'Wiederholungen kurz vor dem Vergessen flachen die Vergessenskurve ab. Lieber jeden Tag ein paar Minuten.'),
    );
    return root;
  }

  function quiz() {
    const r = runSession({ title: 'Schnellquiz', items: cardsQuiz(Object.values(cardsInTarget())), backHref: '#/review', onExit: () => (location.hash = '#/') });
    ctx.onLeave(r.cleanup);
    fill(root, r);
  }

  const progress = bar(0, 'bar-lg');
  const counter = h('span.muted');
  const stage = h('div.review-stage');
  const actions = h('div.review-actions');

  root.append(
    h('header.run-head', h('a.icon-btn', { href: '#/', 'aria-label': 'Beenden', title: 'Beenden' }, icon('x', 22)), progress, counter),
    stage,
    actions,
  );

  function show() {
    current = queue.shift();
    if (!current) return finish();
    flipped = false;
    const c = current;
    const song = SONG_BY_ID[c.songId];
    counter.textContent = `${done + 1}/${total}`;
    const front = h('div.flash-face.flash-front',
      h('p.eyebrow', c.reverse ? 'Wie heißt das in der Songsprache?' : c.state === 'new' ? 'Neue Karte' : 'Was bedeutet …'),
      h('div.flash-word', { lang: c.reverse ? 'de' : c.lang }, c.front),
      !c.reverse ? h('button.icon-btn.flash-speak', { type: 'button', 'aria-label': 'Vorlesen', onClick: (e) => { e.stopPropagation(); speak(c.front, c.lang); } }, icon('volume', 22)) : null,
      c.example && !c.reverse ? h('p.flash-example', { lang: c.lang }, highlightWord(c.example, c.front)) : null,
      song ? h('p.small.muted', '♪ ', song.title) : null,
    );
    const mnemonic = h('input.input.input-sm', { value: c.note || '', placeholder: 'Eselsbrücke oder eigenes Beispiel …', 'aria-label': 'Eselsbrücke' });
    mnemonic.addEventListener('change', () => update((s) => { if (s.cards[c.id]) s.cards[c.id].note = mnemonic.value; }));
    const back = h('div.flash-face.flash-back',
      h('p.flash-q', { lang: c.reverse ? 'de' : c.lang }, c.front),
      h('div.flash-word.is-small', { lang: c.reverse ? c.lang : 'de' }, c.back),
      h('button.icon-btn.flash-speak', { type: 'button', 'aria-label': 'Vorlesen', onClick: (e) => { e.stopPropagation(); speak(c.reverse ? c.back : c.front, c.lang); } }, icon('volume', 22)),
      c.example ? h('p.flash-example', { lang: c.lang }, highlightWord(c.example, c.reverse ? c.back : c.front)) : null,
      c.exampleTr ? h('p.flash-example.muted', c.exampleTr) : null,
      h('label.small.muted', 'Eselsbrücke (Gabriel Wyner: persönliche Verknüpfungen bleiben hängen)'),
      mnemonic,
    );
    const card = h('div.flash', { tabindex: '0', role: 'button', 'aria-label': 'Karte umdrehen', onClick: () => !flipped && flip() }, h('div.flash-inner', front, back));
    fill(stage, card);
    card.classList.add('ex-enter');
    fill(actions, h('button.btn.btn-primary.btn-lg.btn-wide', { type: 'button', onClick: flip }, 'Antwort zeigen', h('kbd', 'Leertaste')));
    if (!c.reverse && state.settings.autoSpeak !== false) speak(c.front, c.lang);
  }

  function flip() {
    if (flipped) return;
    flipped = true;
    stage.querySelector('.flash')?.classList.add('is-flipped');
    if (current.reverse) speak(current.back, current.lang);
    fill(actions, h('div.grades', GRADES.map((g) =>
      h(`button.grade.grade-${g.id}`, { type: 'button', onClick: () => grade(g.id) },
        h('span.grade-label', g.label), h('span.grade-time', previewLabel(current, g.id)), h('kbd', g.key)))));
  }

  function grade(g) {
    const now = Date.now();
    const next = schedule(current, g, now);
    if (current.state === 'new') next.firstSeen = now;
    update((s) => {
      s.cards[next.id] = next;
      s.profile.reviews += 1;
    });
    sfx(g === 0 ? 'err' : 'tap');
    xp += g === 0 ? 1 : 2;
    // Lernschritte unter 15 Minuten in derselben Sitzung nochmal zeigen
    if (next.due - now < 15 * 60 * 1000) queue.splice(Math.min(queue.length, 3), 0, next);
    else done += 1;
    progress.set(done / total);
    show();
  }

  function finish() {
    document.removeEventListener('keydown', onKey);
    progress.set(1);
    addXP(xp, 'Wiederholung');
    sfx('done');
    confetti();
    clear(actions);
    fill(stage, h('div.run-done',
      h('div.done-badge', icon('trophy', 40)),
      h('h2', 'Wiederholung geschafft!'),
      h('div.done-stats',
        h('div.stat-big', h('span.stat-num', String(total)), h('span.stat-label', 'Karten')),
        h('div.stat-big', h('span.stat-num', `+${xp}`), h('span.stat-label', 'XP')),
      ),
      btn('Zur Lernreise', { kind: 'primary', size: 'lg', href: '#/' }),
    ));
  }

  onKey = (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!flipped) flip(); else if (e.key === 'Enter') grade(2); }
    else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1);
  };
  document.addEventListener('keydown', onKey);
  document.body.classList.add('is-focus-mode');
  ctx.onLeave(() => { document.removeEventListener('keydown', onKey); document.body.classList.remove('is-focus-mode'); });
  show();
  return root;
}

function highlightWord(text, word) {
  const w = word.replace(/^to /, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(\\b${w}\\w*)`, 'i'));
  return parts.map((p, i) => (i % 2 ? h('mark', p) : p));
}
