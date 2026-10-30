/** Song-Übersicht: Status (Audio, Songtext) und die fünf Stationen. */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID, LANGS } from '../../data/songs.js';
import { STAGES, STAGE_INFO, stageDone, songPct, nextStage } from '../core/progress.js';
import { getLyrics } from '../core/lyrics.js';
import { getSource, resolveSource, assignFile, youtubeSearch } from '../core/library.js';
import { addSongVocab, findCard } from '../core/deck.js';
import { on } from '../core/events.js';
import { cover, ring, backLink, btn, levelLabel } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { speak } from '../core/speech.js';

export function songView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();

  const statusBox = h('div.song-status');
  const stagesBox = h('ol.stages');
  const vocabBox = h('div.vocab-list');

  async function renderStatus() {
    const lyr = getLyrics(song.id);
    const src = getSource(song.id) || (await resolveSource(song));
    const fileInput = h('input', { type: 'file', accept: 'audio/*', hidden: true, onChange: (e) => {
      const f = e.target.files[0];
      if (f) { assignFile(song.id, f); toast(`„${f.name}“ ist jetzt mit diesem Song verbunden.`, { kind: 'ok' }); }
    } });
    fill(statusBox, 
      h(`div.status-row${src ? '.is-ok' : ''}`,
        h('span.status-icon', icon(src ? 'check' : 'music', 18)),
        h('div.status-text',
          h('strong', src ? 'Audio verbunden' : 'Audio fehlt'),
          h('span.muted', src ? src.name : 'Verbinde deinen Musikordner oder wähle die Datei aus.'),
        ),
        h('div.status-actions',
          src ? null : btn('Datei wählen', { size: 'sm', ic: 'folder', onClick: () => fileInput.click() }),
          src ? null : btn('Musikordner', { size: 'sm', kind: 'ghost', href: '#/library' }),
          src ? null : h('a.btn.btn-ghost.btn-sm', { href: youtubeSearch(song), target: '_blank', rel: 'noopener', title: 'Song auf YouTube suchen' }, 'YouTube', icon('external', 14)),
          fileInput,
        ),
      ),
      h(`div.status-row${lyr ? '.is-ok' : ''}`,
        h('span.status-icon', icon(lyr ? 'check' : 'text', 18)),
        h('div.status-text',
          h('strong', lyr ? `Songtext: ${lyr.lines.length} Zeilen` : 'Songtext fehlt'),
          h('span.muted', lyr ? (lyr.synced ? `Mit Zeitstempeln${lyr.offset ? `, Versatz ${lyr.offset > 0 ? '+' : ''}${lyr.offset.toFixed(1)} s` : ''}` : 'Ohne Zeitstempel. Synchronisiere ihn per Tap-Sync.') : 'Lade ihn mit einem Klick aus der freien LRCLIB-Datenbank oder füge ihn ein.'),
        ),
        h('div.status-actions', btn(lyr ? 'Bearbeiten' : 'Songtext laden', { size: 'sm', kind: lyr ? 'ghost' : 'secondary', ic: lyr ? 'edit' : 'download', href: `#/song/${song.id}/edit` })),
      ),
    );
  }

  function renderStages() {
    const lyr = getLyrics(song.id);
    const nxt = nextStage(song.id);
    fill(stagesBox, STAGES.map((st, i) => {
      const info = STAGE_INFO[st];
      const done = stageDone(song.id, st);
      const needsLyrics = (st === 'read' || st === 'shadow') && !lyr;
      return h(`li.stage${done ? '.is-done' : ''}${st === nxt ? '.is-next' : ''}`, { style: { '--i': i } },
        h('a.stage-link', { href: needsLyrics ? `#/song/${song.id}/edit?then=${st}` : `#/song/${song.id}/${st}` },
          h('span.stage-num', done ? icon('check', 18) : icon(info.ic, 18)),
          h('span.stage-body',
            h('strong', `${i + 1}. ${info.label}`),
            h('span.muted', needsLyrics ? 'Braucht den Songtext. Erst laden, dann geht es los.' : info.desc),
          ),
          icon('chevronRight', 18),
        ),
      );
    }));
  }

  function renderVocab() {
    fill(vocabBox, song.vocab.map((v) => {
      const inDeck = !!findCard(v.term, song.lang);
      return h('div.vocab-item',
        h('button.icon-btn', { type: 'button', 'aria-label': `„${v.term}“ vorlesen`, onClick: () => speak(v.term.replace(/^to /, ''), song.lang) }, icon('volume', 18)),
        h('div', h('strong', v.term), h('span.muted', ` · ${v.de}`), v.note ? h('div.small.muted', v.note) : null),
        inDeck ? h('span.small.ok-text', icon('check', 14), ' im Stapel') : null,
      );
    }));
  }

  const pct = songPct(song.id);
  const nxt = nextStage(song.id);
  const el = h('div.page.page-song', { style: { '--h': song.hue } },
    backLink('#/', 'Lernreise'),
    h('section.song-hero',
      cover(song, 'xl'),
      h('div.song-hero-text',
        h('p.eyebrow', `${LANGS[song.lang]?.label || song.lang} · ${levelLabel(song.level)} · ${song.mood}`),
        h('h1', song.title),
        h('p.song-artist', song.artist),
        song.remix ? h('p.muted', song.remix) : null,
        h('div.song-hero-actions',
          btn(nxt ? (pct ? 'Weiterlernen' : 'Loslegen') : 'Nochmal mitlesen', { kind: 'primary', ic: 'play', href: `#/song/${song.id}/${nxt || 'read'}` }),
          h('div.song-ring', ring(pct, { size: 48, stroke: 5 }), h('span.muted', `${Math.round(pct * 5)}/5 Stationen`)),
        ),
      ),
    ),
    statusBox,
    h('h2.section-title', 'Stationen'),
    stagesBox,
    h('div.section-head', h('h2.section-title', 'Wortfeld'), btn('Alle als Karten', { size: 'sm', ic: 'plus', onClick: () => {
      const n = addSongVocab(song);
      toast(n ? `${n} neue Karte${n === 1 ? '' : 'n'} im Stapel.` : 'Alle Wörter sind schon im Stapel.', { kind: 'ok' });
      renderVocab();
    } })),
    vocabBox,
  );

  renderStatus();
  renderStages();
  renderVocab();
  ctx.onLeave(on('library', renderStatus));
  ctx.onLeave(on('lyrics', () => { renderStatus(); renderStages(); }));
  return el;
}

export function notFound() {
  return h('div.page', backLink('#/'), h('h1', 'Nicht gefunden'), h('p.muted', 'Diesen Song oder diese Lektion gibt es nicht (mehr).'));
}
