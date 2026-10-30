/** Kleine, wiederverwendbare UI-Bausteine. */
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { LANGS } from '../../data/songs.js';

/** Generiertes Song-Cover: einfarbiger Verlauf + „Vinyl“-Rillen + Initiale. */
export function cover(song, size = 'md') {
  const initial = song.title.replace(/^the\s+/i, '').trim()[0]?.toUpperCase() || '♪';
  return h(`div.cover.cover-${size}`, { style: { '--h': song.hue }, 'aria-hidden': 'true' },
    h('span.cover-initial', initial),
    h('span.cover-lang', LANGS[song.lang]?.short || song.lang.toUpperCase()),
  );
}

/** Fortschrittsring (SVG). pct 0..1 */
export function ring(pct, { size = 44, stroke = 4, label } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const wrap = h('div.ring', { style: { width: `${size}px`, height: `${size}px` } });
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, pct)))}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>
  </svg>`;
  if (label != null) wrap.append(h('span.ring-label', label));
  return wrap;
}

/** Horizontaler Fortschrittsbalken (animiert per transform: scaleX). */
export function bar(pct, cls = '') {
  const barFill = h('div.bar-fill', { style: { transform: `scaleX(${Math.max(0, Math.min(1, pct))})` } });
  const el = h(`div.bar${cls ? '.' + cls : ''}`, { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct * 100) }, barFill);
  el.set = (p) => {
    barFill.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
    el.setAttribute('aria-valuenow', Math.round(p * 100));
  };
  return el;
}

export function btn(label, opts = {}) {
  const { kind = 'secondary', ic, onClick, size, href, title, disabled, type = 'button' } = opts;
  const cls = `btn.btn-${kind}${size ? '.btn-' + size : ''}`;
  const kids = [ic && icon(ic, size === 'sm' ? 16 : 18), label && h('span', label)];
  if (href) return h(`a.${cls}`, { href, title, target: href.startsWith('http') ? '_blank' : null, rel: href.startsWith('http') ? 'noopener' : null }, kids);
  return h(`button.${cls}`, { type, onClick, title, 'aria-label': !label ? title : null, disabled }, kids);
}

export function iconBtn(ic, title, onClick, opts = {}) {
  return h(`button.icon-btn${opts.active ? '.is-active' : ''}${opts.cls ? '.' + opts.cls : ''}`,
    { type: 'button', onClick, title, 'aria-label': title, 'aria-pressed': opts.pressable ? String(!!opts.active) : null }, icon(ic, opts.size || 20));
}

export function pageHeader(title, sub, ...actions) {
  return h('header.page-head',
    h('div', h('h1', title), sub && h('p.page-sub', sub)),
    actions.length ? h('div.page-actions', actions) : null,
  );
}

export function backLink(href, label = 'Zurück') {
  return h('a.back-link', { href }, icon('chevronLeft', 18), h('span', label));
}

export function empty(title, text, action) {
  return h('div.empty', h('h3', title), h('p.muted', text), action);
}

/** Einfacher Dialog (<dialog>), Fokus und Esc übernimmt der Browser. */
export function dialog(title, body, actions = []) {
  const d = h('dialog.dialog',
    h('div.dialog-head', h('h2', title), h('button.icon-btn', { type: 'button', 'aria-label': 'Schließen', onClick: () => close() }, icon('x', 20))),
    h('div.dialog-body', body),
    actions.length ? h('div.dialog-actions', actions) : null,
  );
  function close() {
    d.classList.add('is-leaving');
    setTimeout(() => { d.close(); d.remove(); }, 150);
  }
  d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  document.body.append(d);
  d.showModal();
  d.closeDialog = close;
  return d;
}

export function levelLabel(level) {
  return ['', 'Leicht', 'Mittel', 'Schwer'][level] || '';
}
