/** App-Hülle: Navigation, Statusleiste (Streak, XP, Tagesziel) und Mini-Player. */
import { cardsInTarget } from '../core/deck.js';
import { h, clear, fmtTime, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { on } from '../core/events.js';
import { state } from '../core/state.js';
import { countDue } from '../core/srs.js';
import { currentStreak, goalPct, levelInfo, todayXP } from '../core/gamify.js';
import { player } from '../core/player.js';
import { LANGS } from '../../data/songs.js';
import { ring, cover } from './widgets.js';
import { currentPath } from '../core/router.js';
import { toast } from './toast.js';
import { confetti, floatText } from './fx.js';

const NAV = [
  { href: '#/', label: 'Lernreise', ic: 'map', match: (p) => p === '/' || p.startsWith('/song') || p.startsWith('/lesson') },
  { href: '#/review', label: 'Wiederholen', ic: 'repeat', badge: true, match: (p) => p.startsWith('/review') },
  { href: '#/words', label: 'Wörter', ic: 'cards', match: (p) => p.startsWith('/words') },
  { href: '#/tips', label: 'Tipps', ic: 'bulb', match: (p) => p.startsWith('/tips') },
  { href: '#/library', label: 'Musik', ic: 'music', match: (p) => p.startsWith('/library') },
  { href: '#/profile', label: 'Profil', ic: 'user', match: (p) => p.startsWith('/profile') },
];

export function mountShell(root) {
  const brand = h('a.brand', { href: '#/', 'aria-label': 'Bachatalingo Startseite' },
    h('span.brand-mark', { 'aria-hidden': 'true' }, logo()),
    h('span.brand-name', 'Bachata', h('em', 'lingo')),
  );

  const navLinks = NAV.map((n) => {
    const badge = n.badge ? h('span.nav-badge', { hidden: true }) : null;
    const a = h('a.nav-link', { href: n.href }, icon(n.ic, 22), h('span.nav-label', n.label), badge);
    a._match = n.match;
    a._badge = badge;
    return a;
  });

  const langEl = h('a.stat-chip.stat-lang', { href: '#/', title: 'Lernsprache (auf der Startseite ändern)' });
  const streakEl = h('a.stat-chip.stat-streak', { href: '#/profile', title: 'Tage in Folge' });
  const xpEl = h('a.stat-chip.stat-xp', { href: '#/profile', title: 'Erfahrungspunkte' });
  const goalEl = h('a.stat-goal', { href: '#/profile', title: 'Tagesziel' });

  const sidebar = h('nav.sidebar', { 'aria-label': 'Hauptnavigation' }, brand, h('div.nav-list', navLinks.slice()));
  const tabbar = h('nav.tabbar', { 'aria-label': 'Navigation' }, NAV.filter((n) => n.href !== '#/library').map((n) => {
    const a = h('a.tab-link', { href: n.href }, icon(n.ic, 22), h('span', n.label));
    a._match = n.match;
    if (n.badge) { a._badge = h('span.nav-badge', { hidden: true }); a.append(a._badge); }
    return a;
  }));

  const topbar = h('header.topbar',
    h('a.brand.brand-compact', { href: '#/', 'aria-label': 'Startseite' }, h('span.brand-mark', { 'aria-hidden': 'true' }, logo()), h('span.brand-name', 'Bachata', h('em', 'lingo'))),
    h('div.topbar-stats', langEl, streakEl, xpEl, goalEl),
  );

  const outlet = h('main.outlet', { id: 'main', tabindex: '-1' });
  const mini = miniPlayer();

  fill(root, 
    h('a.skip-link', { href: '#main' }, 'Zum Inhalt springen'),
    sidebar,
    h('div.main-col', topbar, outlet),
    mini,
    tabbar,
  );

  function renderStats() {
    const tl = LANGS[state.settings.targetLang || 'es'];
    fill(langEl, h('span', { 'aria-hidden': 'true' }, tl.flag), h('span', tl.short));
    langEl.setAttribute('aria-label', `Lernsprache: ${tl.label}`);
    const streak = currentStreak();
    const lv = levelInfo();
    fill(streakEl, icon('flame', 18), h('span', String(streak)));
    streakEl.classList.toggle('is-lit', todayXP() > 0);
    streakEl.setAttribute('aria-label', `${streak} Tage in Folge`);
    fill(xpEl, icon('bolt', 18), h('span', `Lv ${lv.level}`));
    xpEl.setAttribute('aria-label', `Level ${lv.level}, ${state.profile.xp} XP`);
    const pct = goalPct();
    fill(goalEl, ring(pct, { size: 34, stroke: 4 }), h('span.goal-text', `${todayXP()}/${state.profile.dailyGoal}`));
    goalEl.setAttribute('aria-label', `Tagesziel: ${todayXP()} von ${state.profile.dailyGoal} XP`);
    const due = countDue(cardsInTarget(), { newLimit: state.settings.newPerDay, newSeenToday: newSeenToday() });
    [...navLinks, ...tabbar.children].forEach((a) => {
      if (!a._badge) return;
      a._badge.hidden = !due;
      a._badge.textContent = due > 99 ? '99+' : String(due);
    });
  }

  function markActive() {
    const p = currentPath();
    [...navLinks, ...tabbar.children].forEach((a) => {
      const act = a._match?.(p);
      a.classList.toggle('is-active', !!act);
      if (act) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  on('state', renderStats);
  on('route', markActive);
  on('xp', ({ amount }) => floatText(`+${amount} XP`, xpEl));
  on('levelup', ({ level }) => { toast(`Level ${level} erreicht!`, { kind: 'gold', icon: 'bolt' }); confetti({ y: 0.2 }); });
  on('goal', ({ streak }) => toast(`Tagesziel geschafft! ${streak} Tag${streak === 1 ? '' : 'e'} in Folge.`, { kind: 'gold', icon: 'flame', ms: 4500 }));
  on('achievement', (a) => toast(h('span', h('strong', 'Abzeichen: '), a.title, h('br'), h('span.muted', a.text)), { kind: 'gold', icon: 'trophy', ms: 5000 }));
  renderStats();
  markActive();
  return outlet;
}

export function newSeenToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Object.values(state.cards).filter((c) => c.state !== 'new' && c.firstSeen && c.firstSeen >= d.getTime()).length;
}

function logo() {
  const s = h('span');
  s.innerHTML = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <circle cx="16" cy="16" r="15" fill="var(--accent)"/>
    <path d="M12 22.5V10l10-2.5v12.2" fill="none" stroke="var(--accent-ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="10" cy="22.5" r="2.6" fill="var(--accent-ink)"/><circle cx="20" cy="19.8" r="2.6" fill="var(--accent-ink)"/>
  </svg>`;
  return s.firstElementChild;
}

/** Mini-Player: erscheint, sobald ein Song geladen ist. */
function miniPlayer() {
  const coverSlot = h('a.mini-cover', { href: '#/', 'aria-label': 'Zum Song' });
  const title = h('div.mini-title');
  const artist = h('div.mini-artist');
  const time = h('div.mini-time');
  const playBtn = h('button.icon-btn.mini-play', { type: 'button', 'aria-label': 'Abspielen', onClick: () => player.toggle() }, icon('play', 22));
  const progFill = h('div.mini-progress-fill');
  const prog = h('div.mini-progress', { 'aria-hidden': 'true' }, progFill);
  const eq = h('span.eq', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const el = h('div.mini', { hidden: true, role: 'region', 'aria-label': 'Musik-Player' },
    prog,
    h('div.mini-inner',
      coverSlot,
      h('div.mini-meta', h('div.mini-title-row', eq, title), artist),
      time,
      h('button.icon-btn', { type: 'button', 'aria-label': '5 Sekunden zurück', title: '5 s zurück', onClick: () => player.skip(-5) }, icon('back5', 20)),
      playBtn,
      h('button.icon-btn', { type: 'button', 'aria-label': 'Player schließen', title: 'Schließen', onClick: () => player.unload() }, icon('x', 20)),
    ),
  );
  on('player:song', ({ songId }) => {
    const s = player.song;
    el.hidden = !songId;
    document.body.classList.toggle('has-mini', !!songId);
    if (!s) return;
    fill(coverSlot, cover(s, 'xs'));
    coverSlot.href = `#/song/${s.id}/read`;
    title.textContent = s.title;
    artist.textContent = s.artist;
  });
  on('player:state', ({ playing }) => {
    fill(playBtn, icon(playing ? 'pause' : 'play', 22));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    eq.classList.toggle('is-playing', playing);
  });
  on('player:tick', ({ t, duration }) => {
    progFill.style.transform = `scaleX(${duration ? t / duration : 0})`;
    time.textContent = `${fmtTime(t)} / ${fmtTime(duration)}`;
  });
  return el;
}
