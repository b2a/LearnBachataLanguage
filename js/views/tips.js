/** Methoden der Polyglotten, jeweils mit Verknüpfung zur passenden App-Funktion. */
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { TIPS } from '../../data/tips.js';
import { pageHeader } from '../ui/widgets.js';

export function tipsView() {
  return h('div.page.page-tips',
    pageHeader('Wie Polyglotte lernen', 'Methoden von Menschen, die viele Sprachen sprechen, und wie diese App sie für dich umsetzt.'),
    h('div.tips-grid', TIPS.map((t, i) =>
      h('details.tip', { style: { '--i': Math.min(i, 6) } },
        h('summary',
          h('div.tip-head',
            h('span.tip-avatar', { 'aria-hidden': 'true' }, initials(t.person)),
            h('div', h('strong.tip-title', t.title), h('div.small.muted', `${t.person} · ${t.who}`)),
          ),
          h('p.tip-short', t.short),
          h('span.tip-more', 'Mehr lesen', icon('chevronDown', 16)),
        ),
        h('div.tip-body',
          t.body.map((p) => h('p', p)),
          h('div.tip-inapp', icon('sparkle', 18), h('p', h('strong', 'In der App: '), t.inApp)),
          t.action ? h('a.btn.btn-secondary.btn-sm', { href: t.action.route }, t.action.label, icon('chevronRight', 16)) : null,
        ),
      ))),
    h('p.small.muted.footnote', 'Zusammenfassungen sinngemäß in eigenen Worten. Für die Originale lohnen sich die Bücher, Vorträge und Kanäle der genannten Personen.'),
  );
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
