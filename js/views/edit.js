/**
 * Songtext laden & bearbeiten:
 *  1. Suche in LRCLIB (freie Datenbank mit synchronisierten Lyrics)
 *  2. Text oder .lrc-Datei einfügen
 *  3. Tap-Sync: im Takt tippen, um Zeitstempel für den Remix zu setzen
 */
import { h, clear, fmtTime, download, prefersReducedMotion, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID, LANGS, setSongLang } from '../../data/songs.js';
import { clearJourneyCache } from '../core/journey.js';
import { getLyrics, saveLyrics, deleteLyrics, searchLRCLIB, fromLRCLIB, parseAny, toLRC } from '../core/lyrics.js';
import { player } from '../core/player.js';
import { on } from '../core/events.js';
import { backLink, btn, iconBtn, cover } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { notFound } from './song.js';

export function editView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  const then = ctx.query.then;
  const afterSave = () => {
    if (then) location.hash = `#/song/${song.id}/${then}`;
    else render();
  };

  const root = h('div.page.page-edit');
  let autoSync = !!ctx.query.sync;

  function render() {
    const lyr = getLyrics(song.id);
    fill(root, 
      backLink(`#/song/${song.id}`, song.title),
      h('header.page-head',
        h('div.edit-title', cover(song, 'sm'), h('div', h('h1', 'Songtext'), h('p.page-sub', `${song.title} · ${song.artist}`))),
      ),
      h('p.notice.notice-plain', icon('lock', 18), h('span', 'Songtexte sind urheberrechtlich geschützt. Sie werden nur in deinem Browser gespeichert und nicht veröffentlicht.')),
      langRow(),
      lyr ? currentBox(lyr) : null,
      searchBox(!lyr),
      pasteBox(lyr),
    );
    if (autoSync && lyr) { autoSync = false; openSync(); }
  }

  /* ---------- Sprache des Songs ---------- */
  function langRow() {
    const sel = h('select.select.select-sm', { id: 'song-lang', onChange: (e) => {
      setSongLang(song.id, e.target.value);
      clearJourneyCache();
      toast(`„${song.title}“ gehört jetzt zur Lernsprache ${LANGS[e.target.value].label}.`, { kind: 'ok' });
    } }, Object.entries(LANGS).filter(([, l]) => l.learnable).map(([k, l]) => h('option', { value: k, selected: k === song.lang }, l.label)));
    return h('div.lang-row', h('label.small', { for: 'song-lang' }, 'Sprache des Songtexts'), sel);
  }

  /* ---------- Aktueller Stand ---------- */
  function currentBox(lyr) {
    return h('section.card',
      h('div.section-head',
        h('div', h('h2.card-title', 'Gespeicherter Text'), h('p.muted', `${lyr.lines.length} Zeilen · ${lyr.synced ? 'mit Zeitstempeln' : 'ohne Zeitstempel'}${lyr.sourceName ? ` · Quelle: ${lyr.sourceName}` : ''}`)),
      ),
      h('div.btn-row',
        btn('Tap-Sync', { ic: 'sync', kind: 'primary', onClick: openSync }),
        btn('Mitlesen', { ic: 'book', href: `#/song/${song.id}/read` }),
        btn('Als .lrc speichern', { ic: 'download', kind: 'ghost', onClick: () => download(`${song.id}.lrc`, toLRC(lyr, song)) }),
        btn('Löschen', { ic: 'trash', kind: 'ghost', onClick: () => {
          if (!confirm(`Songtext von „${song.title}“ löschen? Deine eigenen Übersetzungen gehen dabei verloren.`)) return;
          deleteLyrics(song.id);
          toast('Songtext gelöscht.', { kind: 'info' });
          render();
        } }),
      ),
      h('p.small.muted', 'Remixe haben oft ein längeres Intro als das Original. Läuft der Text konstant zu früh oder zu spät, reicht der Versatz in der Mitlese-Ansicht. Passt das Tempo nicht, nutze Tap-Sync.'),
    );
  }

  /* ---------- LRCLIB-Suche ---------- */
  function searchBox(open) {
    const track = h('input.input', { id: 'lr-track', value: song.lyrics?.track || song.title });
    const artist = h('input.input', { id: 'lr-artist', value: song.lyrics?.artist || '' });
    const results = h('div.results', { 'aria-live': 'polite' });
    const go = h('button.btn.btn-primary', { type: 'submit' }, icon('search', 18), h('span', 'Suchen'));

    const form = h('form.search-form', { onSubmit: async (e) => {
      e.preventDefault();
      go.disabled = true;
      fill(results, h('div.skeleton-list', h('div.skeleton'), h('div.skeleton'), h('div.skeleton')));
      try {
        const list = await searchLRCLIB({ track: track.value.trim(), artist: artist.value.trim() });
        clear(results);
        if (!list.length) {
          results.append(h('div.empty-inline', h('strong', 'Nichts gefunden.'), h('p.muted', 'Versuch es ohne Interpret oder mit einer anderen Schreibweise. Oder füg den Text unten selbst ein.')));
        }
        list.forEach((r) => results.append(resultRow(r)));
      } catch (err) {
        fill(results, h('div.empty-inline', h('strong', 'Die Lyrics-Datenbank ist gerade nicht erreichbar.'), h('p.muted', `${err.message} Prüfe deine Internetverbindung oder füg den Text unten ein.`)));
      } finally {
        go.disabled = false;
      }
    } },
      h('div.field', h('label', { for: 'lr-track' }, 'Titel'), track),
      h('div.field', h('label', { for: 'lr-artist' }, 'Interpret (optional)'), artist),
      go,
    );

    return h('details.card.collapsible', { open: open || null },
      h('summary', h('h2.card-title', icon('search', 18), ' In LRCLIB suchen'), icon('chevronDown', 18)),
      h('p.muted', 'LRCLIB ist eine freie Community-Datenbank mit Songtexten, oft mit Zeitstempeln. Gesucht wird nach dem Original, nicht nach dem Remix.'),
      form,
      results,
    );
  }

  function resultRow(r) {
    return h('div.result',
      h('div.result-main',
        h('strong', r.trackName),
        h('span.muted', ` · ${r.artistName}`),
        h('div.small.muted', [r.albumName, r.duration ? fmtTime(r.duration) : null].filter(Boolean).join(' · ')),
        h('p.result-preview', (r.plainLyrics || '').split('\n').slice(0, 2).join(' / ')),
      ),
      h('div.result-side',
        r.syncedLyrics ? h('span.tag.tag-ok', icon('sync', 12), ' synchron') : h('span.tag', 'nur Text'),
        btn('Übernehmen', { size: 'sm', kind: 'primary', onClick: () => {
          const existing = getLyrics(song.id);
          if (existing && !confirm('Den gespeicherten Songtext ersetzen? Eigene Übersetzungen gehen verloren.')) return;
          saveLyrics(song.id, fromLRCLIB(r));
          toast(`Songtext übernommen (${r.syncedLyrics ? 'mit Zeitstempeln' : 'ohne Zeitstempel'}).`, { kind: 'ok' });
          afterSave();
        } }),
      ),
    );
  }

  /* ---------- Einfügen ---------- */
  function pasteBox(lyr) {
    const ta = h('textarea.input.mono', { id: 'lr-paste', rows: 10, placeholder: 'Songtext einfügen, eine Zeile pro Zeile.\nOder LRC mit Zeitstempeln: [00:12.34] Zeile …' });
    const file = h('input', { type: 'file', accept: '.lrc,.txt,text/plain', hidden: true, onChange: async (e) => {
      const f = e.target.files[0];
      if (f) ta.value = await f.text();
    } });
    return h('details.card.collapsible', { open: !lyr || null },
      h('summary', h('h2.card-title', icon('edit', 18), ' Selbst einfügen'), icon('chevronDown', 18)),
      h('label.sr-only', { for: 'lr-paste' }, 'Songtext'),
      ta,
      h('div.btn-row',
        btn('Speichern', { kind: 'primary', ic: 'check', onClick: () => {
          if (!ta.value.trim()) { toast('Füge zuerst einen Text ein.', { kind: 'info' }); ta.focus(); return; }
          const parsed = parseAny(ta.value);
          if (lyr && !confirm('Den gespeicherten Songtext ersetzen?')) return;
          saveLyrics(song.id, { ...parsed, source: 'manual' });
          toast(`${parsed.lines.length} Zeilen gespeichert.`, { kind: 'ok' });
          afterSave();
        } }),
        btn('.lrc-Datei laden', { kind: 'ghost', ic: 'upload', onClick: () => file.click() }),
        file,
      ),
    );
  }

  /* ---------- Tap-Sync ---------- */
  async function openSync() {
    const lyr = getLyrics(song.id);
    if (!lyr) return;
    const hasAudio = await player.load(song.id);
    if (!hasAudio) {
      toast('Für Tap-Sync braucht es die Audiodatei. Verbinde zuerst deine Musik.', { kind: 'err', action: { label: 'Musik', onClick: () => (location.hash = '#/library') } });
      return;
    }
    // Versatz in die Zeitstempel übernehmen, damit Tap-Zeiten direkt passen
    const lines = lyr.lines.filter((l) => l.text).map((l) => ({ ...l, t: l.t != null ? Math.max(0, l.t + (lyr.offset || 0)) : null }));
    let ptr = 0;
    const hist = [];

    const list = h('ol.sync-list');
    const playBtn = iconBtn('play', 'Abspielen/Pause (P)', () => player.toggle(), { size: 24, cls: 'ctl-play' });
    const timeEl = h('span.ctl-time', '0:00');
    const tapBtn = h('button.tap-btn', { type: 'button', onClick: tap }, h('span', 'TAP'), h('small', 'Leertaste'));

    function draw() {
      fill(list, lines.map((l, i) => h(`li.sync-line${i === ptr ? '.is-current' : ''}${l.t != null && i < ptr ? '.is-set' : ''}`,
        { onClick: () => { ptr = i; if (l.t != null) player.seek(Math.max(0, l.t - 2)); draw(); } },
        h('span.sync-time', l.t != null ? fmtTime(l.t) + '.' + String(Math.floor((l.t % 1) * 10)) : '--:--'),
        h('span', l.text))));
      list.querySelector('.is-current')?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    function tap() {
      if (ptr >= lines.length) return;
      if (!player.playing) player.play();
      hist.push({ ptr, t: lines[ptr].t });
      lines[ptr].t = Math.max(0, player.time - 0.15); // kleine Reaktionszeit-Korrektur
      ptr += 1;
      tapBtn.classList.remove('is-tapped');
      void tapBtn.offsetWidth;
      tapBtn.classList.add('is-tapped');
      draw();
    }
    function undo() {
      const last = hist.pop();
      if (!last) return;
      ptr = last.ptr;
      lines[ptr].t = last.t;
      player.seek(Math.max(0, player.time - 3));
      draw();
    }
    function saveSync() {
      // Zeilen ohne Zeit bekommen die Zeit der Vorgängerzeile + 2 s
      let prev = 0;
      const out = lines.map((l) => { const t = l.t != null ? l.t : prev + 2; prev = t; return { ...l, t }; });
      out.sort((a, b) => a.t - b.t);
      saveLyrics(song.id, { ...lyr, lines: out, offset: 0 });
      toast('Zeitstempel gespeichert. Jetzt läuft der Text synchron zum Remix.', { kind: 'ok' });
      close();
      afterSave();
    }

    const onKey = (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === ' ') { e.preventDefault(); tap(); }
      else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
      else if (e.key.toLowerCase() === 'p') player.toggle();
      else if (e.key === 'Escape') close();
    };
    const offTick = on('player:tick', ({ t, duration }) => (timeEl.textContent = `${fmtTime(t)} / ${fmtTime(duration)}`));
    const offState = on('player:state', ({ playing }) => fill(playBtn, icon(playing ? 'pause' : 'play', 24)));

    const overlay = h('div.sync-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tap-Sync' },
      h('div.sync-panel',
        h('header.sync-head',
          h('div', h('h2', 'Tap-Sync'), h('p.muted', 'Spiel den Song ab und tippe genau dann, wenn die markierte Zeile beginnt.')),
          iconBtn('x', 'Schließen (Esc)', () => close()),
        ),
        h('div.sync-controls',
          iconBtn('back5', '5 s zurück', () => player.skip(-5)),
          playBtn,
          timeEl,
          btn('Rückgängig', { size: 'sm', kind: 'ghost', ic: 'back5', onClick: undo }),
          btn('Von vorn', { size: 'sm', kind: 'ghost', ic: 'refresh', onClick: () => { ptr = 0; player.seek(0); draw(); } }),
        ),
        list,
        h('footer.sync-foot', tapBtn, btn('Speichern', { kind: 'primary', ic: 'check', onClick: saveSync })),
      ),
    );

    function close() {
      document.removeEventListener('keydown', onKey);
      offTick();
      offState();
      player.pause();
      overlay.classList.add('is-leaving');
      setTimeout(() => overlay.remove(), 150);
    }

    document.addEventListener('keydown', onKey);
    ctx.onLeave(() => overlay.isConnected && close());
    document.body.append(overlay);
    draw();
    tapBtn.focus();
  }

  render();
  return root;
}
