/** Toasts unten rechts (bzw. oben auf Mobilgeräten). Mit aria-live für Screenreader. */
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

let region;

function ensure() {
  if (!region) {
    region = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  return region;
}

/** toast('Gespeichert', { kind: 'ok'|'err'|'info'|'gold', icon: 'check', action: { label, onClick } }) */
export function toast(text, opts = {}) {
  const { kind = 'info', ms = 3200, action } = opts;
  const ic = opts.icon || { ok: 'check', err: 'info', gold: 'trophy', info: 'info' }[kind];
  const el = h(`div.toast.toast-${kind}`,
    icon(ic, 18),
    h('div.toast-body', typeof text === 'string' ? h('span', text) : text),
    action && h('button.btn.btn-ghost.btn-sm', { onClick: () => { action.onClick(); close(); } }, action.label),
  );
  ensure().append(el);
  let timer = setTimeout(close, ms);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => (timer = setTimeout(close, 1200)));
  function close() {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 150);
  }
  return close;
}
