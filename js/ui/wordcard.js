/**
 * Wort-Popover: Tippe in einem Songtext auf ein Wort → Übersetzung, Aussprache,
 * Definition und „Zu Karten hinzufügen“ (mit der Songzeile als Kontext).
 */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { lookup, lookupOffline, definition } from '../core/lexicon.js';
import { speak } from '../core/speech.js';
import { addCard, findCard } from '../core/deck.js';
import { externalLinks } from '../core/translate.js';
import { toast } from './toast.js';
import { pop } from './fx.js';
import { normWord } from '../core/text.js';

let current = null;

export function closeWordCard() {
  if (!current) return;
  const { el, anchor, onKey, onDown } = current;
  anchor?.classList.remove('is-picked');
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('pointerdown', onDown, true);
  el.classList.add('is-leaving');
  setTimeout(() => el.remove(), 150);
  const back = anchor;
  current = null;
  back?.focus?.({ preventScroll: true });
}

/**
 * openWordCard({ word, lang, anchor, line, lineTr, songId })
 */
export function openWordCard({ word, lang = 'en', anchor, line = '', lineTr = '', songId = null }) {
  closeWordCard();
  const w = normWord(word);
  const off = lookupOffline(w, lang);
  const deEl = h('p.wc-de', off.de || h('span.muted', 'Übersetze …'));
  const defEl = h('p.wc-def');
  const phonEl = h('span.wc-phon');
  let de = off.de || '';

  const existing = findCard(off.lemma || w, lang) || findCard(w, lang);
  const addBtn = h('button.btn.btn-primary.btn-sm', { type: 'button', onClick: add, disabled: !!existing },
    icon(existing ? 'check' : 'plus', 16), h('span', existing ? 'Schon im Stapel' : 'Zu meinen Karten'));

  const links = externalLinks(off.lemma || w, lang);
  const el = h('div.wordcard', { role: 'dialog', 'aria-label': `Wort: ${w}` },
    h('div.wc-head',
      h('div',
        h('div.wc-word', w),
        off.lemma && off.lemma !== w ? h('div.wc-lemma', `Grundform: ${off.lemma}`) : null,
        phonEl,
      ),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Vorlesen', title: 'Vorlesen', onClick: () => speak(w, lang) }, icon('volume', 20)),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)', onClick: closeWordCard }, icon('x', 20)),
    ),
    deEl,
    defEl,
    line ? h('blockquote.wc-line', highlight(line, word)) : null,
    h('div.wc-actions',
      addBtn,
      h('a.btn.btn-ghost.btn-sm', { href: links.dict, target: '_blank', rel: 'noopener' }, 'Wörterbuch', icon('external', 14)),
      links.youglish ? h('a.btn.btn-ghost.btn-sm', { href: links.youglish, target: '_blank', rel: 'noopener', title: 'Das Wort in echten Videos hören' }, 'YouGlish', icon('external', 14)) : null,
    ),
  );

  document.body.append(el);
  position(el, anchor);
  anchor?.classList.add('is-picked');

  const onKey = (e) => { if (e.key === 'Escape') closeWordCard(); };
  const onDown = (e) => { if (!el.contains(e.target) && e.target !== anchor) closeWordCard(); };
  document.addEventListener('keydown', onKey);
  setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
  current = { el, anchor, onKey, onDown };
  addBtn.focus({ preventScroll: true });

  if (!off.de) {
    lookup(w, lang).then((r) => {
      if (!el.isConnected) return;
      de = r.de || '';
      fill(deEl, r.de ? r.de : h('span.muted', r.error || 'Keine Übersetzung gefunden. Du kannst sie beim Hinzufügen selbst eintragen.'));
    });
  }
  if (lang === 'en') {
    definition(off.lemma || w).then((d) => {
      if (!d || !el.isConnected) return;
      phonEl.textContent = d.phonetic || '';
      if (d.def) defEl.append(h('span.wc-pos', d.pos), ' ', d.def);
      position(el, anchor);
    });
  }

  function add() {
    const front = off.lemma && off.lemma !== w && !off.form ? off.lemma : w;
    const back = de || prompt(`Deutsche Bedeutung für „${front}“:`) || '';
    if (!back) return;
    const { created } = addCard({ front, back, lang, songId, example: line, exampleTr: lineTr });
    addBtn.disabled = true;
    fill(addBtn, icon('check', 16), h('span', created ? 'Hinzugefügt' : 'Schon im Stapel'));
    pop(addBtn);
    if (created) toast(`„${front}“ ist jetzt in deinem Kartenstapel.`, { kind: 'ok' });
    anchor?.classList.add('is-saved');
  }
}

function highlight(line, word) {
  const parts = line.split(new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'i'));
  return parts.map((p, i) => (i % 2 ? h('mark', p) : p));
}

function position(el, anchor) {
  if (!anchor || matchMedia('(max-width: 640px)').matches) {
    el.classList.add('is-sheet');
    return;
  }
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const hgt = el.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(12, Math.min(left, innerWidth - w - 12));
  let top = r.bottom + 10;
  if (top + hgt > innerHeight - 12) top = Math.max(12, r.top - hgt - 10);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
