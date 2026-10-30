/** Musik: Ordner verbinden und sehen, welche Songs eine Audiodatei haben. */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONGS } from '../../data/songs.js';
import { supportsFolderAccess, pickFolder, addFiles, libraryStatus, getSource, restoreWithGesture, forgetFolder, assignFile, youtubeSearch } from '../core/library.js';
import { hasLyrics } from '../core/lyrics.js';
import { player } from '../core/player.js';
import { on } from '../core/events.js';
import { pageHeader, btn, cover } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

export function libraryView(ctx) {
  const head = h('section.card.lib-connect');
  const list = h('div.lib-list');
  const unmatchedBox = h('div');

  const dirInput = h('input', { type: 'file', multiple: true, webkitdirectory: true, hidden: true, onChange: (e) => report(addFiles(e.target.files)) });
  const filesInput = h('input', { type: 'file', multiple: true, accept: 'audio/*', hidden: true, onChange: (e) => report(addFiles(e.target.files)) });

  function report({ matched, unmatched }) {
    toast(`${matched.length} Song${matched.length === 1 ? '' : 's'} zugeordnet${unmatched.length ? `, ${unmatched.length} Datei${unmatched.length === 1 ? '' : 'en'} unbekannt` : ''}.`, { kind: matched.length ? 'ok' : 'info' });
    clear(unmatchedBox);
    if (unmatched.length) {
      unmatchedBox.append(h('details.card.collapsible',
        h('summary', h('h2.card-title', `Nicht zugeordnet (${unmatched.length})`), icon('chevronDown', 18)),
        h('p.muted', 'Diese Dateien passen zu keinem Song in data/songs.js. Ordne sie unten per „Datei wählen“ zu, oder lege einen neuen Song an (siehe README).'),
        h('ul.small', unmatched.map((n) => h('li', n))),
      ));
    }
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
            : 'Wähle den Ordner mit deinen MP3s. Die Dateien bleiben auf deinem Gerät und werden nirgends hochgeladen. Die App ordnet sie anhand des Dateinamens automatisch zu.'),
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
      supportsFolderAccess() ? h('p.small.muted', 'Chrome und Edge merken sich den Ordner. In Firefox, Safari und auf dem Handy wählst du ihn nach jedem Neuladen neu aus.') : h('p.small.muted', 'Dein Browser merkt sich den Ordner nicht dauerhaft. Wähle ihn nach dem Neuladen einfach erneut aus. Chrome oder Edge am Computer können ihn sich merken.'),
    );
  }

  function renderList() {
    fill(list, SONGS.map((s) => {
      const src = getSource(s.id);
      const pick = h('input', { type: 'file', accept: 'audio/*', hidden: true, onChange: (e) => { const f = e.target.files[0]; if (f) { assignFile(s.id, f); toast(`„${f.name}“ → ${s.title}`, { kind: 'ok' }); } } });
      return h(`div.lib-row${src ? '.is-ok' : ''}`,
        cover(s, 'sm'),
        h('div.lib-main',
          h('a.lib-title', { href: `#/song/${s.id}` }, s.title),
          h('div.small.muted', s.artist),
          h('div.small.muted.lib-file', { title: s.file }, src ? src.name : s.file),
        ),
        h('div.lib-flags',
          h(`span.flag${src ? '.is-on' : ''}`, { title: src ? 'Audio verbunden' : 'Audio fehlt' }, icon('music', 14), h('span.sr-only', src ? 'Audio verbunden' : 'Audio fehlt')),
          h(`span.flag${hasLyrics(s.id) ? '.is-on' : ''}`, { title: hasLyrics(s.id) ? 'Songtext vorhanden' : 'Songtext fehlt' }, icon('text', 14), h('span.sr-only', hasLyrics(s.id) ? 'Songtext vorhanden' : 'Songtext fehlt')),
        ),
        h('div.lib-actions',
          src
            ? h('button.icon-btn', { type: 'button', 'aria-label': `${s.title} abspielen`, title: 'Abspielen', onClick: async () => { await player.load(s.id); player.play(); } }, icon('play', 18))
            : h('a.icon-btn', { href: youtubeSearch(s), target: '_blank', rel: 'noopener', 'aria-label': `${s.title} auf YouTube suchen`, title: 'Auf YouTube suchen' }, icon('external', 18)),
          h('button.icon-btn', { type: 'button', 'aria-label': `Datei für ${s.title} wählen`, title: 'Datei wählen', onClick: () => pick.click() }, icon('folder', 18)),
          pick,
        ),
      );
    }));
  }

  ctx.onLeave(on('library', () => { renderHead(); renderList(); }));
  renderHead();
  renderList();

  return h('div.page.page-library',
    pageHeader('Musik', 'Deine Bachata-Remixe, verbunden mit der Lernreise.'),
    head,
    unmatchedBox,
    h('h2.section-title', 'Alle Songs'),
    list,
    h('section.card',
      h('h2.card-title', 'Für Fortgeschrittene: Ordner im Projekt'),
      h('p.muted', 'Wenn du die App lokal startest, kannst du die Dateien auch in den Ordner music/ im Projekt legen (exakter Dateiname wie in data/songs.js). Dieser Ordner wird nie zu GitHub hochgeladen.'),
    ),
  );
}
