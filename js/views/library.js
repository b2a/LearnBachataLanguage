/**
 * Musik: Ordner verbinden, Songs hinzufügen, Songtexte gesammelt laden,
 * und sehen, welche Songs Audio und Text haben.
 */
import { h, clear, fill, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONGS, LANGS, addUserSongs } from '../../data/songs.js';
import {
  supportsFolderAccess, pickFolder, addFiles, libraryStatus, getSource, restoreWithGesture,
  forgetFolder, assignFile, youtubeSearch, unmatchedCount, adoptUnmatched,
} from '../core/library.js';
import { hasLyrics, startBatch, stopBatch, batchState } from '../core/lyrics.js';
import { parseSongList } from '../core/songparse.js';
import { clearJourneyCache, targetLang } from '../core/journey.js';
import { player } from '../core/player.js';
import { on } from '../core/events.js';
import { pageHeader, btn, cover, bar } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

export function libraryView(ctx) {
  const head = h('section.card.lib-connect');
  const unmatchedBox = h('div');
  const lyricsBox = h('section.card');
  const list = h('div.lib-list');
  const countEl = h('span.small.muted');
  let filterLang = targetLang();
  let query = '';
  let onlyMissing = false;
  let shown = 60;

  const dirInput = h('input', { type: 'file', multiple: true, webkitdirectory: true, hidden: true, onChange: (e) => report(addFiles(e.target.files)) });
  const filesInput = h('input', { type: 'file', multiple: true, accept: 'audio/*', hidden: true, onChange: (e) => report(addFiles(e.target.files)) });

  /* ---------- Ordner ---------- */
  function report({ matched, unmatched }) {
    toast(`${matched.length} Song${matched.length === 1 ? '' : 's'} zugeordnet${unmatched.length ? `, ${unmatched.length} Datei${unmatched.length === 1 ? '' : 'en'} unbekannt` : ''}.`, { kind: matched.length ? 'ok' : 'info' });
    renderUnmatched(unmatched);
  }

  function renderUnmatched(names = []) {
    clear(unmatchedBox);
    if (!unmatchedCount()) return;
    unmatchedBox.append(h('section.card.is-highlight',
      h('h2.card-title', icon('plus', 18), ` ${unmatchedCount()} neue Dateien gefunden`),
      h('p.muted', 'Diese Dateien passen zu keinem Song in der App. Übernimm sie als neue Songs: Titel und Interpret kommen aus dem Dateinamen, Songtext und Sprache findet die App selbst.'),
      names.length ? h('details', h('summary.small.muted', 'Dateien anzeigen'), h('ul.small', names.slice(0, 200).map((n) => h('li', n)))) : null,
      h('div.btn-row', btn('Als neue Songs übernehmen', { kind: 'primary', ic: 'plus', onClick: () => {
        const created = adoptUnmatched(targetLang());
        clearJourneyCache();
        toast(`${created.length} Songs angelegt. Die Songtexte lädst du unten gesammelt.`, { kind: 'ok', ms: 4500 });
        renderUnmatched();
        renderLyricsBox();
        renderList();
      } })),
    ));
  }

  function renderHead() {
    const st = libraryStatus();
    fill(head,
      h('div.lib-connect-main',
        h('div.tile-icon.is-lg', icon('folder', 28)),
        h('div',
          h('h2.card-title', st.folderName ? `Ordner: ${st.folderName}` : 'Musikordner verbinden'),
          h('p.muted', st.needsPermission
            ? 'Der Browser braucht deine Erlaubnis, um den gemerkten Ordner wieder zu lesen.'
            : 'Wähle den Ordner mit deinen MP3s. Die Dateien bleiben auf deinem Gerät. Die App ordnet sie über den Dateinamen zu und bietet unbekannte Dateien als neue Songs an.'),
          h('p.lib-count', h('strong', `${st.count} von ${st.total}`), ' Songs mit Audio'),
        ),
      ),
      h('div.btn-row',
        st.needsPermission ? btn('Ordner wieder freigeben', { kind: 'primary', ic: 'refresh', onClick: async () => { if (await restoreWithGesture()) toast('Musikordner ist wieder verbunden.', { kind: 'ok' }); } }) : null,
        supportsFolderAccess()
          ? btn(st.folderName ? 'Anderen Ordner wählen' : 'Ordner verbinden', { kind: st.needsPermission ? 'secondary' : 'primary', ic: 'folder', onClick: async () => {
            try { report(await pickFolder()); } catch (err) { if (err.name !== 'AbortError') toast('Der Ordner ließ sich nicht öffnen.', { kind: 'err' }); }
          } })
          : btn('Ordner auswählen', { kind: 'primary', ic: 'folder', onClick: () => dirInput.click() }),
        btn('Einzelne Dateien', { kind: 'ghost', ic: 'music', onClick: () => filesInput.click() }),
        st.folderName ? btn('Ordner vergessen', { kind: 'ghost', ic: 'x', onClick: async () => { await forgetFolder(); toast('Ordner vergessen.', { kind: 'info' }); } }) : null,
        dirInput, filesInput,
      ),
      h('p.small.muted', supportsFolderAccess()
        ? 'Chrome und Edge merken sich den Ordner. In Firefox, Safari und auf dem Handy wählst du ihn nach jedem Neuladen neu aus.'
        : 'Dein Browser merkt sich den Ordner nicht dauerhaft. Wähle ihn nach dem Neuladen erneut aus. Chrome oder Edge am Computer können ihn sich merken.'),
    );
  }

  /* ---------- Songtexte gesammelt laden ---------- */
  function renderLyricsBox() {
    const lang = targetLang();
    const songs = SONGS.filter((s) => s.lang === lang);
    const have = songs.filter((s) => hasLyrics(s.id)).length;
    const candidates = songs.filter((s) => !hasLyrics(s.id) && !s.noAutoLyrics && (s.lrclib || s.user));
    const b = batchState();
    const running = b?.running;
    const progress = bar(running ? b.done / Math.max(1, b.total) : songs.length ? have / songs.length : 0);

    let statusEl;
    if (running) {
      statusEl = h('div.batch-status', { role: 'status', 'aria-live': 'polite' },
        h('div.batch-line',
          h('span.spinner', { 'aria-hidden': 'true' }),
          h('strong', b.round === 2 ? `Zweiter Versuch ${b.done}/${b.total}` : `Lade ${b.done}/${b.total}`),
          b.current ? h('span.muted.batch-current', `· ${b.current.title}`) : null,
        ),
        b.retrying ? h('p.small.warn-text', 'LRCLIB ist gerade überlastet. Die App wartet kurz und versucht es automatisch erneut …') : null,
        counters(b),
      );
    } else if (b && b.done) {
      statusEl = h('div.batch-status', { role: 'status' },
        h('div.batch-line', icon(b.failed.length ? 'info' : 'check', 18), h('strong', b.aborted ? 'Abgebrochen.' : 'Fertig.')),
        counters(b),
        b.failed.length ? h('p.small.muted', `${b.failed.length === 1 ? '1 Song konnte' : `${b.failed.length} Songs konnten`} wegen Serverproblemen nicht geladen werden. Das liegt an LRCLIB, nicht an dir. Versuch es in ein paar Minuten nochmal.`) : null,
      );
    } else {
      statusEl = h('span.small.muted', `${have} von ${songs.length} Songtexten auf ${LANGS[lang]?.label} geladen`);
    }

    const actions = running
      ? [btn('Abbrechen', { kind: 'ghost', ic: 'x', onClick: () => stopBatch() })]
      : [
        btn(`Alle Songtexte laden (${candidates.length})`, { kind: 'primary', ic: 'download', disabled: !candidates.length, onClick: () => startBatch(candidates) }),
        b?.failed?.length ? btn(`Fehlgeschlagene erneut versuchen (${b.failed.length})`, { kind: 'secondary', ic: 'refresh', onClick: () => startBatch(b.failed) }) : null,
      ];

    fill(lyricsBox,
      h('h2.card-title', icon('text', 18), ' Songtexte'),
      h('p.muted', 'Die App holt die Texte aus der freien Datenbank LRCLIB, meist mit Zeitstempeln für Karaoke. Das passiert automatisch, sobald du einen Song öffnest. Hier lädst du alle auf einmal. Das läuft im Hintergrund weiter, auch wenn du die Seite wechselst.'),
      h('div.lyrics-progress', progress),
      statusEl,
      h('div.btn-row', actions),
    );
  }

  function counters(b) {
    return h('div.batch-counts',
      h('span.ok-text', icon('check', 14), ` ${b.ok} geladen`),
      h('span.muted', icon('x', 14), ` ${b.missing} nicht gefunden`),
      b.failed.length ? h('span.warn-text', icon('info', 14), ` ${b.failed.length} Serverfehler${b.running ? ', zweiter Versuch folgt' : ''}`) : null,
    );
  }

  /* ---------- Songs hinzufügen ---------- */
  function addBox() {
    const ta = h('textarea.input.mono', { id: 'add-songs', rows: 6, placeholder: 'Eine Zeile pro Song, z. B.\nRomeo Santos - Propuesta Indecente\nPrince Royce, Shakira - Deja vu' });
    const langSel = h('select.select', { id: 'add-lang', 'aria-label': 'Sprache' },
      Object.entries(LANGS).filter(([, l]) => l.learnable).map(([k, l]) => h('option', { value: k, selected: k === targetLang() }, l.label)));
    return h('details.card.collapsible',
      h('summary', h('h2.card-title', icon('plus', 18), ' Songs hinzufügen'), icon('chevronDown', 18)),
      h('p.muted', 'Füg eine Liste ein (Format „Interpret - Titel“). Die Songtexte sucht die App automatisch, und die Sprache erkennt sie am Text.'),
      h('label.sr-only', { for: 'add-songs' }, 'Songliste'),
      ta,
      h('div.btn-row',
        h('label.small.muted', { for: 'add-lang' }, 'Vermutete Sprache'), langSel,
        btn('Hinzufügen', { kind: 'primary', ic: 'plus', onClick: () => {
          const parsed = parseSongList(ta.value, { lang: langSel.value });
          if (!parsed.length) { toast('Füge zuerst eine Liste ein.', { kind: 'info' }); ta.focus(); return; }
          const added = addUserSongs(parsed);
          clearJourneyCache();
          ta.value = '';
          toast(`${added.length} neue Songs${parsed.length - added.length ? `, ${parsed.length - added.length} waren schon da` : ''}.`, { kind: 'ok' });
          renderLyricsBox();
          renderList();
        } }),
      ),
    );
  }

  /* ---------- Liste ---------- */
  function renderList() {
    const q = query.toLowerCase();
    const all = SONGS
      .filter((s) => filterLang === 'all' || s.lang === filterLang)
      .filter((s) => !q || `${s.title} ${s.artist}`.toLowerCase().includes(q))
      .filter((s) => !onlyMissing || !getSource(s.id));
    countEl.textContent = `${all.length} Songs`;
    clear(list);
    all.slice(0, shown).forEach((s) => list.append(row(s)));
    if (all.length > shown) {
      list.append(h('div.lib-more', btn(`Weitere ${Math.min(60, all.length - shown)} anzeigen`, { kind: 'ghost', onClick: () => { shown += 60; renderList(); } })));
    }
    if (!all.length) list.append(h('p.muted.empty-inline', 'Keine Songs für diesen Filter.'));
  }

  function row(s) {
    const src = getSource(s.id);
    const lyr = hasLyrics(s.id);
    const pick = h('input', { type: 'file', accept: 'audio/*', hidden: true, onChange: (e) => { const f = e.target.files[0]; if (f) { assignFile(s.id, f); toast(`„${f.name}“ → ${s.title}`, { kind: 'ok' }); } } });
    return h(`div.lib-row${src ? '.is-ok' : ''}`,
      cover(s, 'sm'),
      h('div.lib-main',
        h('a.lib-title', { href: `#/song/${s.id}` }, s.title),
        h('div.small.muted', s.artist),
        src ? h('div.small.muted.lib-file', { title: src.name }, src.name) : null,
      ),
      h('div.lib-flags',
        h('span.flag.is-lang', { title: LANGS[s.lang]?.label }, LANGS[s.lang]?.short || s.lang),
        h(`span.flag${src ? '.is-on' : ''}`, { title: src ? 'Audio verbunden' : 'Audio fehlt' }, icon('music', 14), h('span.sr-only', src ? 'Audio verbunden' : 'Audio fehlt')),
        h(`span.flag${lyr ? '.is-on' : s.lrclib ? '.is-ready' : ''}`, { title: lyr ? 'Songtext geladen' : s.lrclib ? 'Songtext gefunden, lädt beim Öffnen' : 'Kein Songtext gefunden' }, icon('text', 14), h('span.sr-only', lyr ? 'Songtext geladen' : 'Songtext fehlt')),
      ),
      h('div.lib-actions',
        src
          ? h('button.icon-btn', { type: 'button', 'aria-label': `${s.title} abspielen`, title: 'Abspielen', onClick: async () => { await player.load(s.id); player.play(); } }, icon('play', 18))
          : h('a.icon-btn', { href: youtubeSearch(s), target: '_blank', rel: 'noopener', 'aria-label': `${s.title} auf YouTube suchen`, title: 'Auf YouTube suchen' }, icon('external', 18)),
        h('button.icon-btn', { type: 'button', 'aria-label': `Datei für ${s.title} wählen`, title: 'Datei wählen', onClick: () => pick.click() }, icon('folder', 18)),
        pick,
      ),
    );
  }

  const search = h('input.input', { type: 'search', placeholder: 'Titel oder Interpret …', 'aria-label': 'Songs durchsuchen', onInput: debounce((e) => { query = e.target.value.trim(); shown = 60; renderList(); }, 150) });
  const langFilter = h('select.select', { 'aria-label': 'Sprache filtern', onChange: (e) => { filterLang = e.target.value; shown = 60; renderList(); } },
    h('option', { value: 'all' }, 'Alle Sprachen'),
    Object.entries(LANGS).filter(([, l]) => l.learnable).map(([k, l]) => h('option', { value: k, selected: k === filterLang }, `${l.label} (${SONGS.filter((s) => s.lang === k).length})`)));
  const missingToggle = h('label.chip', h('input', { type: 'checkbox', onChange: (e) => { onlyMissing = e.target.checked; renderList(); } }), ' Nur ohne Audio');

  ctx.onLeave(on('library', () => { renderHead(); renderList(); renderUnmatched(); }));
  ctx.onLeave(on('lyricsBatch', (b) => { renderLyricsBox(); if (!b.running) { clearJourneyCache(); renderList(); } }));
  renderHead();
  renderUnmatched();
  renderLyricsBox();
  renderList();

  return h('div.page.page-library',
    pageHeader('Musik', 'Deine Bachata-Sammlung, verbunden mit der Lernreise.'),
    head,
    unmatchedBox,
    lyricsBox,
    addBox(),
    h('div.section-head', h('h2.section-title', 'Alle Songs'), countEl),
    h('div.toolbar', h('div.search-wrap', icon('search', 18), search), langFilter, missingToggle),
    list,
    h('p.small.muted', 'Für Fortgeschrittene: Lokal gestartet liest die App auch den Projektordner music/. Der wird nie zu GitHub hochgeladen. Neue Songs für alle: Zeilen in tools/song-list.txt ergänzen und python3 tools/build_catalog.py ausführen.'),
  );
}
