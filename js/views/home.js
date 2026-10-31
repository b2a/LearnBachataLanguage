/** Startseite: Begrüßung, Tagesimpuls und der Lernpfad (Units mit Stationen). */
import { cardsInTarget } from '../core/deck.js';
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { unitsFor, targetLang } from '../core/journey.js';
import { langPicker } from '../ui/widgets.js';
import { LANGS } from '../../data/songs.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { LESSON_BY_ID } from '../../data/lessons.js';
import { DAILY_TIPS } from '../../data/tips.js';
import { state } from '../core/state.js';
import { countDue } from '../core/srs.js';
import { currentStreak, todayXP } from '../core/gamify.js';
import { nextStop, songPct, lessonDone, unitPct, nextStage, STAGE_INFO } from '../core/progress.js';
import { getSource, libraryStatus } from '../core/library.js';
import { cover, ring, bar } from '../ui/widgets.js';
import { newSeenToday } from '../ui/shell.js';

export function homeView() {
  const next = nextStop();
  const due = countDue(cardsInTarget(), { newLimit: state.settings.newPerDay, newSeenToday: newSeenToday() });
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_TIPS.length;
  const lib = libraryStatus();
  const units = unitsFor();

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'Guten Morgen';
    if (hr < 18) return 'Hallo';
    return 'Guten Abend';
  })();

  const continueCard = next ? continueTile(next) : h('div.tile.tile-continue', h('h3', 'Alles geschafft!'), h('p.muted', 'Du hast die ganze Reise gemeistert. Füge neue Songs in data/songs.js hinzu.'));

  const el = h('div.page.page-home',
    h('section.home-hero',
      h('div.home-hello',
        h('p.eyebrow', greeting),
        h('h1', `Deine Lernreise: ${LANGS[targetLang()]?.label || ''}`),
        h('p.page-sub', 'Verstehe die Songs, zu denen du tanzt. Station für Station, Zeile für Zeile.'),
        langPicker(),
      ),
      h('div.home-tiles',
        continueCard,
        h('a.tile.tile-review', { href: '#/review' },
          h('div.tile-icon', icon('repeat', 22)),
          h('div', h('strong', due ? `${due} Karte${due === 1 ? '' : 'n'} fällig` : 'Keine Karten fällig'), h('p.muted', due ? 'Ein paar Minuten reichen.' : 'Sammle Wörter beim Mitlesen.')),
          icon('chevronRight', 18),
        ),
        h('div.tile.tile-tip',
          h('div.tile-icon', icon('bulb', 22)),
          h('div', h('strong', 'Tipp des Tages'), h('p', DAILY_TIPS[dayIndex])),
        ),
        !lib.count ? h('a.tile.tile-music', { href: '#/library' },
          h('div.tile-icon', icon('music', 22)),
          h('div', h('strong', lib.needsPermission ? 'Musikordner wieder freigeben' : 'Verbinde deine Musik'), h('p.muted', lib.needsPermission ? 'Ein Klick und deine Songs sind wieder da.' : 'Wähle den Ordner mit deinen Bachata-Remixen.')),
          icon('chevronRight', 18),
        ) : null,
      ),
      h('div.home-today.muted', h('span', icon('flame', 16), ` ${currentStreak()} Tage Streak`), h('span', icon('bolt', 16), ` ${todayXP()} XP heute`)),
    ),
    ...(units.length ? units.map((u, ui) => unitSection(u, ui, next && { ...next, unitIndex: units.indexOf(next.unit) })) : [emptyLang()]),
  );
  return el;
}

function emptyLang() {
  return h('div.empty',
    h('h3', `Noch keine Songs auf ${LANGS[targetLang()]?.label}`),
    h('p.muted', 'Füge Songs hinzu: als Liste einfügen oder Dateien aus deinem Musikordner übernehmen. Die Sprache erkennt die App am Songtext.'),
    h('a.btn.btn-primary', { href: '#/library' }, 'Songs hinzufügen'),
  );
}

function continueTile(next) {
  const { stop } = next;
  if (stop.lesson) {
    const l = LESSON_BY_ID[stop.lesson];
    return h('a.tile.tile-continue', { href: `#/lesson/${l.id}` },
      h('div.lesson-badge', icon('book', 26)),
      h('div', h('p.eyebrow', 'Als Nächstes'), h('strong.tile-title', l.title), h('p.muted', l.subtitle)),
      h('span.btn.btn-primary', 'Start'),
    );
  }
  const s = SONG_BY_ID[stop.song];
  const st = nextStage(s.id);
  return h('a.tile.tile-continue', { href: `#/song/${s.id}${st ? '/' + st : ''}` },
    cover(s, 'md'),
    h('div', h('p.eyebrow', 'Als Nächstes'), h('strong.tile-title', s.title), h('p.muted', st ? `Station: ${STAGE_INFO[st].label}` : s.artist)),
    h('span.btn.btn-primary', songPct(s.id) > 0 ? 'Weiter' : 'Start'),
  );
}

function unitSection(unit, ui, next) {
  const pct = unitPct(unit);
  let n = 0;
  // Offen: Units mit Fortschritt, die aktuelle und die nächste. Der Rest ist zugeklappt.
  const open = pct > 0 || ui <= (next ? next.unitIndex + 1 : 1);
  return h(`details.unit${unit.muted ? '.is-muted' : ''}`, { style: { '--uh': unit.hue }, open: open || null },
    h('summary.unit-head',
      h('div',
        h('p.eyebrow', `Unit ${ui + 1}`),
        h('h2', { id: `unit-${unit.id}` }, unit.title),
        h('p.muted', unit.goal),
      ),
      h('div.unit-progress', bar(pct), h('span.muted', `${Math.round(pct * 100)} %`), h('span.unit-count.muted', `${unit.stops.length} Stationen`), icon('chevronDown', 18)),
    ),
    h('ol.path', unit.stops.map((stop) => {
      const isNext = next && next.stop === stop;
      const i = n++;
      // Zickzack wie ein Tanzschritt: links – Mitte – rechts – Mitte
      const offset = [0, 1, 0, -1][i % 4];
      return h('li.path-stop', { style: { '--x': offset, '--i': Math.min(i, 6) } }, stop.song ? songNode(SONG_BY_ID[stop.song], isNext) : lessonNode(LESSON_BY_ID[stop.lesson], isNext));
    })),
  );
}

function songNode(song, isNext) {
  if (!song) return null;
  const pct = songPct(song.id);
  const hasAudio = !!getSource(song.id);
  const st = nextStage(song.id);
  return h(`a.node${pct === 1 ? '.is-done' : ''}${isNext ? '.is-next' : ''}`, { href: `#/song/${song.id}`, style: { '--h': song.hue }, 'aria-label': `${song.title} von ${song.artist}, ${Math.round(pct * 5)} von 5 Stationen` },
    isNext ? h('span.node-bubble', st && pct > 0 ? 'Weiter' : 'Start') : null,
    h('span.node-disc',
      ring(pct, { size: 84, stroke: 5 }),
      h('span.node-face', pct === 1 ? icon('star', 30) : h('span.node-initial', song.title.replace(/^the\s+/i, '')[0])),
    ),
    h('span.node-label',
      h('span.node-title', song.title),
      h('span.node-artist', song.artist.replace(/\s*\(.*\)/, ''), hasAudio ? h('span.node-audio', { title: 'Audiodatei verbunden' }, icon('music', 12)) : null),
    ),
  );
}

function lessonNode(lesson, isNext) {
  if (!lesson) return null;
  const done = lessonDone(lesson.id);
  return h(`a.node.node-lesson${done ? '.is-done' : ''}${isNext ? '.is-next' : ''}`, { href: `#/lesson/${lesson.id}`, 'aria-label': `Lektion: ${lesson.title}${done ? ', abgeschlossen' : ''}` },
    isNext ? h('span.node-bubble', 'Start') : null,
    h('span.node-disc', h('span.node-face', icon(done ? 'check' : 'book', 28))),
    h('span.node-label', h('span.node-title', lesson.title), h('span.node-artist', lesson.subtitle)),
  );
}
