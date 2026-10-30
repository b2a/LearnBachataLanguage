/**
 * Übungstypen. Jeder Typ: render(item, ctx) → { el, check(), focus?(), destroy?() }
 *   ctx.setReady(bool)   „Prüfen“-Button freigeben
 *   ctx.submit()         sofort prüfen (z. B. bei Paaren, wenn alles zugeordnet ist)
 * check() → { ok, solution?, explain?, detail?: Node, canOverride?: bool }
 *
 * Neuen Typ hinzufügen: Funktion schreiben und in TYPES registrieren. Fertig.
 */
import { h, clear, shuffle } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { speak } from '../core/speech.js';
import { checkTyped, normAnswer, diffWords, similarity, words } from '../core/text.js';
import { player } from '../core/player.js';
import { shake } from '../ui/fx.js';
import { sfx } from '../core/sfx.js';

/* ---------- Hilfen ---------- */

function speakBtn(text, lang, { big = false, slow = false } = {}) {
  return h(`button.speak-btn${big ? '.is-big' : ''}${slow ? '.is-slow' : ''}`,
    { type: 'button', 'aria-label': slow ? 'Langsam vorlesen' : 'Vorlesen', title: slow ? 'Langsam' : 'Vorlesen', onClick: () => speak(text, lang, slow ? 0.6 : 0.95) },
    icon(slow ? 'speed' : 'volume', big ? 32 : 20));
}

function optionList(options, ctx, onPick) {
  let picked = -1;
  const list = h('div.options', { role: 'radiogroup' });
  options.forEach((opt, i) => {
    const b = h('button.option', { type: 'button', role: 'radio', 'aria-checked': 'false', onClick: () => pick(i) },
      h('kbd.option-key', String(i + 1)), h('span', opt));
    list.append(b);
  });
  function pick(i) {
    picked = i;
    sfx('tap');
    [...list.children].forEach((b, j) => { b.classList.toggle('is-picked', j === i); b.setAttribute('aria-checked', String(j === i)); });
    ctx.setReady(true);
    onPick?.(i);
  }
  list.keyHandler = (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= options.length && !e.target.matches('input, textarea')) { pick(n - 1); return true; }
    return false;
  };
  list.get = () => picked;
  list.mark = (correct) => {
    [...list.children].forEach((b, j) => {
      b.disabled = true;
      if (j === correct) b.classList.add('is-correct');
      else if (j === picked) b.classList.add('is-wrong');
    });
  };
  return list;
}

/* ---------- Typen ---------- */

/** Multiple Choice. { prompt, sub?, options, answer, speak?, lang?, explain? } */
function mc(item, ctx) {
  const lang = item.lang || 'en';
  const list = optionList(item.options, ctx);
  const el = h('div.ex.ex-mc',
    h('p.ex-kicker', item.kicker || 'Wähle die richtige Antwort'),
    h('div.ex-prompt-row', item.speak ? speakBtn(item.speak, lang) : null, h('h2.ex-prompt', item.prompt)),
    item.sub ? h('p.ex-sub', item.sub) : null,
    list,
  );
  if (item.speak) setTimeout(() => speak(item.speak, lang), 250);
  return {
    el,
    keys: list.keyHandler,
    check() {
      const ok = list.get() === item.answer;
      list.mark(item.answer);
      return { ok, solution: item.options[item.answer], explain: item.explain };
    },
  };
}

/** Hören & wählen. { speak, options, answer, lang? } */
function listen(item, ctx) {
  const lang = item.lang || 'en';
  const list = optionList(item.options, ctx);
  const el = h('div.ex.ex-listen',
    h('p.ex-kicker', 'Was hörst du?'),
    h('div.listen-row', speakBtn(item.speak, lang, { big: true }), speakBtn(item.speak, lang, { slow: true })),
    list,
  );
  setTimeout(() => speak(item.speak, lang), 250);
  return {
    el,
    keys: list.keyHandler,
    check() {
      const ok = list.get() === item.answer;
      list.mark(item.answer);
      return { ok, solution: item.options[item.answer], explain: item.explain };
    },
  };
}

/** Freitext. { prompt, answers, hint?, speak?, lang? } */
function type(item, ctx) {
  const input = h('input.input.ex-input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Deine Antwort', placeholder: item.hint || '' });
  input.addEventListener('input', () => ctx.setReady(input.value.trim().length > 0));
  const el = h('div.ex.ex-type',
    h('p.ex-kicker', 'Schreib die Antwort'),
    h('div.ex-prompt-row', item.speak ? speakBtn(item.speak, item.lang || 'en') : null, h('h2.ex-prompt', item.prompt)),
    input,
  );
  return {
    el,
    focus: () => input.focus(),
    check() {
      const r = checkTyped(input.value, item.answers);
      input.disabled = true;
      input.classList.add(r.ok ? 'is-correct' : 'is-wrong');
      return { ok: r.ok, solution: item.answers[0], explain: r.ok && !r.exact ? 'Fast perfekt, kleiner Tippfehler.' : item.explain, canOverride: !r.ok };
    },
  };
}

/** Satz bauen. { prompt, answer, extra?, lang?, tr? } */
function order(item, ctx) {
  const lang = item.lang || 'en';
  const target = words(item.answer);
  const tiles = shuffle([...target, ...(item.extra || [])]).map((w, i) => ({ w, i }));
  const placed = [];
  const answerRow = h('div.tiles.tiles-answer', { 'aria-label': 'Deine Antwort' });
  const bank = h('div.tiles.tiles-bank', { 'aria-label': 'Wortbausteine' });

  function draw() {
    clear(answerRow);
    clear(bank);
    placed.forEach((t) => answerRow.append(h('button.wtile', { type: 'button', onClick: () => { placed.splice(placed.indexOf(t), 1); sfx('tap'); draw(); } }, t.w)));
    tiles.forEach((t) => {
      const used = placed.includes(t);
      bank.append(h(`button.wtile${used ? '.is-used' : ''}`, { type: 'button', disabled: used, 'aria-hidden': used ? 'true' : null, onClick: () => { placed.push(t); sfx('tap'); draw(); } }, t.w));
    });
    ctx.setReady(placed.length > 0);
  }
  draw();
  const el = h('div.ex.ex-order',
    h('p.ex-kicker', item.kicker || 'Bring die Wörter in die richtige Reihenfolge'),
    h('div.ex-prompt-row', item.speakPrompt ? speakBtn(item.answer, lang) : null, h('h2.ex-prompt', item.prompt)),
    answerRow,
    bank,
  );
  return {
    el,
    keys: (e) => {
      if (e.key === 'Backspace' && placed.length && !e.target.matches('input, textarea')) { placed.pop(); draw(); return true; }
      return false;
    },
    check() {
      const got = normAnswer(placed.map((t) => t.w).join(' '));
      const ok = got === normAnswer(item.answer);
      [...answerRow.children, ...bank.children].forEach((b) => (b.disabled = true));
      answerRow.classList.add(ok ? 'is-correct' : 'is-wrong');
      return { ok, solution: item.answer, explain: item.tr ? `„${item.tr}“` : item.explain };
    },
  };
}

/** Lückentext. { before, answer, after, options?, tr?, lang? } */
function cloze(item, ctx) {
  const lang = item.lang || 'en';
  let value = '';
  const gap = h('span.gap', { 'aria-label': 'Lücke' }, ' ');
  let input = null;
  let list = null;
  if (item.options) {
    list = optionList(item.options, ctx, (i) => { value = item.options[i]; gap.textContent = value; gap.classList.add('is-filled'); });
  } else {
    input = h('input.input.gap-input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Fehlendes Wort, beginnt mit ${item.answer[0]}`, placeholder: `${item.answer[0]}${'·'.repeat(Math.max(0, item.answer.length - 1))}`, size: Math.max(4, item.answer.length) });
    input.addEventListener('input', () => { value = input.value; ctx.setReady(value.trim().length > 0); });
  }
  const line = h('p.cloze-line', item.before, input || gap, item.after);
  const el = h('div.ex.ex-cloze',
    h('p.ex-kicker', item.kicker || 'Ergänze die Songzeile'),
    h('div.ex-prompt-row', speakBtn(`${item.before}${item.answer}${item.after}`, lang), line),
    item.tr ? h('p.ex-sub', '„', item.tr, '“') : null,
    list,
  );
  return {
    el,
    keys: list?.keyHandler,
    focus: () => input?.focus(),
    check() {
      const ok = checkTyped(value, [item.answer]).ok;
      if (list) list.mark(item.options.indexOf(item.answer));
      if (input) { input.disabled = true; input.classList.add(ok ? 'is-correct' : 'is-wrong'); }
      gap.classList.add(ok ? 'is-correct' : 'is-wrong');
      return { ok, solution: `${item.before}${item.answer}${item.after}`.trim(), canOverride: !ok && !!input };
    },
  };
}

/** Paare zuordnen. { pairs: [[a, b], ...] } */
function pairs(item, ctx) {
  const left = shuffle(item.pairs.map((p, i) => ({ t: p[0], i })));
  const right = shuffle(item.pairs.map((p, i) => ({ t: p[1], i })));
  let sel = null;
  let done = 0;
  let mistakes = 0;
  const colL = h('div.pairs-col');
  const colR = h('div.pairs-col');
  const mk = (x, side) => {
    const b = h('button.pair', { type: 'button', onClick: () => choose(b, x, side) }, x.t);
    return b;
  };
  left.forEach((x) => colL.append(mk(x, 'L')));
  right.forEach((x) => colR.append(mk(x, 'R')));

  function choose(b, x, side) {
    if (b.disabled) return;
    if (!sel || sel.side === side) {
      sel?.b.classList.remove('is-picked');
      sel = { b, x, side };
      b.classList.add('is-picked');
      sfx('tap');
      return;
    }
    if (sel.x.i === x.i) {
      [sel.b, b].forEach((n) => { n.classList.remove('is-picked'); n.classList.add('is-matched'); n.disabled = true; });
      sfx('ok');
      done += 1;
      sel = null;
      if (done === item.pairs.length) { ctx.setReady(true); setTimeout(() => ctx.submit(), 350); }
    } else {
      mistakes += 1;
      sfx('err');
      [sel.b, b].forEach((n) => { n.classList.remove('is-picked'); shake(n); });
      sel = null;
    }
  }
  const el = h('div.ex.ex-pairs', h('p.ex-kicker', 'Finde die Paare'), h('div.pairs', colL, colR));
  return {
    el,
    check() {
      return { ok: mistakes <= 1, solution: null, explain: mistakes ? `${mistakes} Fehlversuch${mistakes > 1 ? 'e' : ''}` : 'Alle Paare auf Anhieb!' };
    },
  };
}

/** Diktat: Zeile hören (Original-Audio oder Sprachausgabe) und aufschreiben. { answer, start?, end?, songId?, lang? } */
function dictation(item, ctx) {
  const lang = item.lang || 'en';
  const useAudio = item.songId && item.start != null && player.songId === item.songId;
  const play = (slow) => {
    if (useAudio) {
      const r = player.rate;
      player.audio.playbackRate = slow ? 0.75 : r;
      player.playSegment(item.start, item.end).then(() => (player.audio.playbackRate = r));
    } else speak(item.answer, lang, slow ? 0.6 : 0.95);
  };
  const ta = h('textarea.input.ex-textarea', { rows: 2, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Was hast du gehört?', placeholder: 'Schreib, was du hörst …' });
  ta.addEventListener('input', () => ctx.setReady(ta.value.trim().length > 0));
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); });
  const el = h('div.ex.ex-dictation',
    h('p.ex-kicker', useAudio ? 'Diktat: Hör die Zeile aus dem Song' : 'Diktat: Hör zu und schreib mit'),
    h('div.listen-row',
      h('button.speak-btn.is-big', { type: 'button', 'aria-label': 'Abspielen', onClick: () => play(false) }, icon(useAudio ? 'play' : 'volume', 32)),
      h('button.speak-btn.is-slow', { type: 'button', 'aria-label': 'Langsamer abspielen', title: 'Langsamer', onClick: () => play(true) }, icon('speed', 20)),
    ),
    ta,
  );
  setTimeout(() => play(false), 300);
  return {
    el,
    focus: () => ta.focus(),
    destroy: () => player.stopSegment(),
    check() {
      player.stopSegment();
      const diff = diffWords(ta.value, item.answer);
      const hit = diff.filter((d) => d.ok).length / Math.max(1, diff.length);
      ta.disabled = true;
      const detail = h('p.diff', diff.map((d) => [h(d.ok ? 'span.diff-ok' : 'span.diff-miss', d.word), ' ']));
      return { ok: hit >= 0.85, solution: item.answer, detail, explain: `${Math.round(hit * 100)} % der Wörter erkannt`, canOverride: hit < 0.85 };
    },
  };
}

/** Rückübersetzung nach Lampariello. { de, answer, lang? } */
function backtranslate(item, ctx) {
  const ta = h('textarea.input.ex-textarea', { rows: 2, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Deine Übersetzung', placeholder: 'Übersetze zurück in die Songsprache …' });
  ta.addEventListener('input', () => ctx.setReady(ta.value.trim().length > 0));
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); });
  const el = h('div.ex.ex-back',
    h('p.ex-kicker', 'Rückübersetzung'),
    h('h2.ex-prompt', item.de),
    h('p.ex-sub', 'Wie lautet die Originalzeile? Es zählt der Sinn, nicht jedes Wort.'),
    ta,
  );
  return {
    el,
    focus: () => ta.focus(),
    check() {
      const sim = similarity(ta.value, item.answer);
      const diff = diffWords(ta.value, item.answer);
      ta.disabled = true;
      return {
        ok: sim >= 0.75,
        solution: item.answer,
        detail: h('p.diff', diff.map((d) => [h(d.ok ? 'span.diff-ok' : 'span.diff-miss', d.word), ' '])),
        explain: sim >= 0.75 ? 'Sehr nah am Original!' : 'Vergleiche: Wo denkt dein Satz noch „deutsch“?',
        canOverride: sim < 0.75,
      };
    },
  };
}

export const TYPES = { mc, listen, type, order, cloze, pairs, dictation, backtranslate };
