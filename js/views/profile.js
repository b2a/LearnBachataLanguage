/** Profil: Statistik, Abzeichen, Einstellungen, Sicherung. */
import { h, clear, download, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { state, update, exportAll, importAll, resetAll } from '../core/state.js';
import { levelInfo, currentStreak, lastDays, todayXP } from '../core/gamify.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { SONGS } from '../../data/songs.js';
import { songPct } from '../core/progress.js';
import { on } from '../core/events.js';
import { pageHeader, bar, btn, langPicker } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { applyTheme } from '../core/theme.js';

export function profileView(ctx) {
  const root = h('div.page.page-profile');

  function render() {
    const lv = levelInfo();
    const days = lastDays(14);
    const max = Math.max(state.profile.dailyGoal, ...days.map((d) => d.xp));
    const songsDone = SONGS.filter((s) => songPct(s.id) === 1).length;
    const cards = Object.values(state.cards).filter((c) => !c.reverse);
    const mastered = cards.filter((c) => c.state === 'review' && c.interval >= 21).length;

    fill(root, 
      pageHeader('Profil', 'Dein Fortschritt und deine Einstellungen.'),
      h('section.stats-grid',
        stat('flame', currentStreak(), 'Tage Streak', `Rekord: ${state.profile.bestStreak}`),
        stat('bolt', state.profile.xp, 'XP gesamt', `Level ${lv.level}`),
        stat('star', `${songsDone}/${SONGS.length}`, 'Songs gemeistert'),
        stat('cards', cards.length, 'Wörter', `${mastered} sicher (≥ 3 Wochen)`),
      ),
      h('section.card',
        h('div.section-head', h('h2.card-title', `Level ${lv.level}`), h('span.muted', `${lv.into}/${lv.need} XP bis Level ${lv.level + 1}`)),
        bar(lv.pct, 'bar-lg'),
      ),
      h('section.card',
        h('h2.card-title', 'Letzte 14 Tage'),
        h('div.activity', { role: 'img', 'aria-label': `XP der letzten 14 Tage, heute ${todayXP()} XP` },
          h('div.activity-goal', { style: { '--g': state.profile.dailyGoal / max } }),
          days.map((d) => h('div.activity-col', { title: `${d.date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.xp} XP` },
            h(`div.activity-bar${d.xp >= state.profile.dailyGoal ? '.is-goal' : ''}`, { style: { transform: `scaleY(${d.xp / max})` } }),
            h('span.activity-day', d.date.toLocaleDateString('de-DE', { weekday: 'narrow' })),
          )),
        ),
        h('p.small.muted', 'Die gestrichelte Linie ist dein Tagesziel.'),
      ),
      h('section.card',
        h('h2.card-title', 'Abzeichen'),
        h('div.badges', ACHIEVEMENTS.map((a) => {
          const got = state.profile.achievements[a.id];
          return h(`div.badge${got ? '.is-got' : ''}`, { title: got ? `Freigeschaltet am ${got}` : 'Noch gesperrt' },
            h('span.badge-icon', icon(got ? 'trophy' : 'lock', 22)),
            h('strong', a.title), h('span.small.muted', a.text));
        })),
      ),
      settingsCard(),
      backupCard(),
    );
  }

  function settingsCard() {
    const goal = h('select.select', { id: 'set-goal', onChange: (e) => update((s) => (s.profile.dailyGoal = Number(e.target.value))) },
      [[10, 'Locker · 10 XP'], [30, 'Normal · 30 XP'], [50, 'Ernsthaft · 50 XP'], [80, 'Intensiv · 80 XP']].map(([v, l]) => h('option', { value: v, selected: state.profile.dailyGoal === v }, l)));
    const newPer = h('select.select', { id: 'set-new', onChange: (e) => update((s) => (s.settings.newPerDay = Number(e.target.value))) },
      [5, 10, 15, 20, 30].map((v) => h('option', { value: v, selected: state.settings.newPerDay === v }, `${v} neue Karten pro Tag`)));
    const theme = h('select.select', { id: 'set-theme', onChange: (e) => { update((s) => (s.settings.theme = e.target.value)); applyTheme(); } },
      [['auto', 'Wie das System'], ['dark', 'Dunkel'], ['light', 'Hell']].map(([v, l]) => h('option', { value: v, selected: state.settings.theme === v }, l)));
    const toggle = (key, label, hint) => {
      const id = `set-${key}`;
      const cb = h('input', { type: 'checkbox', id, checked: state.settings[key] !== false, onChange: (e) => update((s) => (s.settings[key] = e.target.checked)) });
      return h('div.check-field', cb, h('label', { for: id }, h('strong', label), hint ? h('span.small.muted', hint) : null));
    };
    return h('section.card',
      h('h2.card-title', 'Einstellungen'),
      h('p.field-label', 'Lernsprache'),
      langPicker({ compact: true }),
      h('div.form-grid', { style: { marginTop: '16px' } },
        h('div.field', h('label', { for: 'set-goal' }, 'Tagesziel'), goal),
        h('div.field', h('label', { for: 'set-new' }, 'Neue Karten'), newPer),
        h('div.field', h('label', { for: 'set-theme' }, 'Darstellung'), theme),
      ),
      toggle('reverseCards', 'Auch Rückrichtung abfragen', 'Neue Karten zusätzlich Deutsch → Songsprache (aktives Erinnern).'),
      toggle('autoSpeak', 'Karten automatisch vorlesen', 'Aussprache von Anfang an (Gabriel Wyner).'),
      toggle('sounds', 'Soundeffekte', 'Kurze Töne bei richtig/falsch.'),
    );
  }

  function backupCard() {
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        importAll(await f.text());
        toast('Sicherung geladen. Die App startet neu.', { kind: 'ok' });
        setTimeout(() => location.reload(), 900);
      } catch (err) {
        toast(err.message || 'Die Datei ließ sich nicht lesen.', { kind: 'err' });
      }
    } });
    return h('section.card',
      h('h2.card-title', 'Sicherung'),
      h('p.muted', 'Alles wird nur in diesem Browser gespeichert. Mit einer Sicherung nimmst du Fortschritt, Karten und Songtexte auf ein anderes Gerät mit.'),
      h('div.btn-row',
        btn('Sicherung herunterladen', { ic: 'download', onClick: () => download(`bachatalingo-${new Date().toISOString().slice(0, 10)}.json`, exportAll(), 'application/json') }),
        btn('Sicherung laden', { ic: 'upload', kind: 'ghost', onClick: () => file.click() }),
        btn('Alles zurücksetzen', { ic: 'trash', kind: 'danger-ghost', onClick: () => {
          const word = prompt('Das löscht Fortschritt, Karten und Songtexte. Tippe LÖSCHEN zum Bestätigen.');
          if (word?.trim().toUpperCase() !== 'LÖSCHEN') return;
          resetAll();
          location.reload();
        } }),
        file,
      ),
    );
  }

  ctx.onLeave(on('state', () => {
    // Nur neu zeichnen, wenn kein Eingabefeld fokussiert ist
    if (!root.contains(document.activeElement) || document.activeElement === document.body) render();
  }));
  render();
  return root;
}

function stat(ic, value, label, sub) {
  return h('div.stat-card', h('span.stat-icon', icon(ic, 20)), h('span.stat-value', String(value)), h('span.stat-label', label), sub ? h('span.small.muted', sub) : null);
}
