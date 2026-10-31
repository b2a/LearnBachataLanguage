/** Meine Wörter: Kartenstapel durchsuchen, bearbeiten, löschen, eigene Karten anlegen. */
import { h, clear, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { strength } from '../core/srs.js';
import { addCard, updateCard, deleteCard } from '../core/deck.js';
import { speak } from '../core/speech.js';
import { SONG_BY_ID, LANGS } from '../../data/songs.js';
import { on } from '../core/events.js';
import { pageHeader, btn, empty, dialog } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

export function wordsView(ctx) {
  let q = '';
  let filter = 'all';
  let allLangs = false;
  const listEl = h('div.word-list');
  const countEl = h('span.muted');

  const search = h('input.input', { type: 'search', placeholder: 'Suchen …', 'aria-label': 'Wörter durchsuchen', onInput: debounce((e) => { q = e.target.value.trim().toLowerCase(); render(); }, 150) });
  const filters = h('div.seg', { role: 'group', 'aria-label': 'Filter' }, [['all', 'Alle'], ['new', 'Neu'], ['learning', 'In Arbeit'], ['review', 'Gefestigt']].map(([k, label]) =>
    h(`button.seg-btn${k === filter ? '.is-on' : ''}`, { type: 'button', 'aria-pressed': String(k === filter), onClick: (e) => {
      filter = k;
      [...e.currentTarget.parentElement.children].forEach((b) => { b.classList.toggle('is-on', b === e.currentTarget); b.setAttribute('aria-pressed', String(b === e.currentTarget)); });
      render();
    } }, label)));

  function render() {
    const cards = Object.values(state.cards)
      .filter((c) => !c.reverse)
      .filter((c) => allLangs || c.lang === (state.settings.targetLang || 'es'))
      .filter((c) => filter === 'all' || (filter === 'learning' ? c.state === 'learning' || c.state === 'relearning' : c.state === filter))
      .filter((c) => !q || c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q))
      .sort((a, b) => b.created - a.created);
    countEl.textContent = `${cards.length} Wörter`;
    clear(listEl);
    if (!Object.keys(state.cards).length) {
      listEl.append(empty('Dein Stapel ist noch leer', 'Tippe in der Mitlese-Ansicht auf ein Wort oder füge eins von Hand hinzu.', btn('Wort hinzufügen', { kind: 'primary', ic: 'plus', onClick: () => editDialog() })));
      return;
    }
    if (!cards.length) { listEl.append(h('p.muted.empty-inline', 'Keine Treffer. Ändere die Suche oder den Filter.')); return; }
    cards.forEach((c) => {
      const song = SONG_BY_ID[c.songId];
      const st = strength(c);
      listEl.append(h('div.word-row',
        h('button.icon-btn', { type: 'button', 'aria-label': `„${c.front}“ vorlesen`, onClick: () => speak(c.front, c.lang) }, icon('volume', 18)),
        h('div.word-main',
          h('div', h('strong', { lang: c.lang }, c.front), h('span.muted', ` · ${c.back}`)),
          c.example ? h('div.small.muted.word-example', { lang: c.lang }, `„${c.example}“`) : null,
          h('div.small.muted', [song ? `♪ ${song.title}` : null, LANGS[c.lang]?.label].filter(Boolean).join(' · ')),
        ),
        h('div.strength', { title: `Festigkeit ${Math.round(st * 100)} %`, 'aria-label': `Festigkeit ${Math.round(st * 100)} Prozent` }, [0.2, 0.45, 0.7, 0.9].map((t) => h(`i${st >= t ? '.is-on' : ''}`))),
        h('button.icon-btn', { type: 'button', 'aria-label': `„${c.front}“ bearbeiten`, title: 'Bearbeiten', onClick: () => editDialog(c) }, icon('edit', 18)),
      ));
    });
  }

  function editDialog(card) {
    const front = h('input.input', { id: 'wd-front', value: card?.front || '' });
    const back = h('input.input', { id: 'wd-back', value: card?.back || '' });
    const note = h('input.input', { id: 'wd-note', value: card?.note || '', placeholder: 'optional' });
    const example = h('input.input', { id: 'wd-ex', value: card?.example || '', placeholder: 'optional, z. B. die Songzeile' });
    const lang = h('select.select', { id: 'wd-lang' }, ['es', 'en', 'pt', 'ro'].map((l) => h('option', { value: l, selected: (card?.lang || state.settings.targetLang || 'es') === l }, LANGS[l].label)));
    const err = h('p.field-error', { role: 'alert' });
    const save = () => {
      if (!front.value.trim() || !back.value.trim()) { err.textContent = 'Wort und Bedeutung werden gebraucht.'; return; }
      if (card) updateCard(card.id, { front: front.value.trim(), back: back.value.trim(), note: note.value, example: example.value, lang: lang.value });
      else {
        const { created } = addCard({ front: front.value.trim(), back: back.value.trim(), note: note.value, example: example.value, lang: lang.value });
        toast(created ? 'Karte angelegt.' : 'Diese Karte gibt es schon.', { kind: created ? 'ok' : 'info' });
      }
      d.closeDialog();
    };
    const d = dialog(card ? 'Karte bearbeiten' : 'Neue Karte',
      h('form.form', { onSubmit: (e) => { e.preventDefault(); save(); } },
        h('div.field', h('label', { for: 'wd-front' }, 'Wort / Ausdruck'), front),
        h('div.field', h('label', { for: 'wd-back' }, 'Bedeutung (Deutsch)'), back),
        h('div.field', h('label', { for: 'wd-ex' }, 'Beispielsatz'), example),
        h('div.field', h('label', { for: 'wd-note' }, 'Eselsbrücke'), note),
        h('div.field', h('label', { for: 'wd-lang' }, 'Sprache'), lang),
        err,
        h('button', { type: 'submit', hidden: true }),
      ),
      [
        card ? btn('Karte löschen', { kind: 'danger-ghost', ic: 'trash', onClick: () => {
          if (!confirm(`Karte „${card.front}“ löschen?`)) return;
          deleteCard(card.id);
          d.closeDialog();
          toast('Karte gelöscht.', { kind: 'info' });
        } }) : null,
        h('span.spacer'),
        btn('Abbrechen', { kind: 'ghost', onClick: () => d.closeDialog() }),
        btn(card ? 'Änderungen speichern' : 'Karte anlegen', { kind: 'primary', onClick: save }),
      ].filter(Boolean),
    );
    setTimeout(() => front.focus(), 30);
  }

  ctx.onLeave(on('state', render));
  render();

  return h('div.page.page-words',
    pageHeader('Meine Wörter', 'Alles, was du aus Songs gesammelt hast.', btn('Wort hinzufügen', { kind: 'primary', ic: 'plus', onClick: () => editDialog() })),
    h('div.toolbar', h('div.search-wrap', icon('search', 18), search), filters,
      h('label.chip', h('input', { type: 'checkbox', onChange: (e) => { allLangs = e.target.checked; render(); } }), ' Alle Sprachen'),
      countEl),
    listEl,
  );
}
