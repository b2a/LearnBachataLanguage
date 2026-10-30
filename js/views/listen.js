/** Station 1 – Hören: blind hören, Stimmung wählen, verstandene Wörter notieren. */
import { h, clear, fmtTime, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { player } from '../core/player.js';
import { on } from '../core/events.js';
import { update, songProgress, state } from '../core/state.js';
import { getLyrics } from '../core/lyrics.js';
import { normAnswer, words } from '../core/text.js';
import { youtubeSearch, getSource } from '../core/library.js';
import { stageHeader, finishStage, tipBox } from './common.js';
import { notFound } from './song.js';
import { btn } from '../ui/widgets.js';

const MOODS = ['verliebt', 'sehnsüchtig', 'traurig', 'kraftvoll', 'düster', 'verspielt', 'sinnlich', 'hoffnungsvoll', 'wütend', 'euphorisch'];

export function listenView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  const prog = state.progress[song.id] || {};
  const picked = new Set(prog.mood || []);
  let listened = 0;
  let lastT = null;

  const playBtn = h('button.big-play', { type: 'button', 'aria-label': 'Abspielen', onClick: toggle }, icon('play', 36));
  const timeEl = h('div.big-time.muted', '0:00');
  const waveFill = h('div.wave-fill');
  const wave = h('div.wave', { 'aria-hidden': 'true' }, waveBars(), waveFill);
  const audioBox = h('div.listen-player');
  const doneBtn = btn('Station abschließen', { kind: 'primary', ic: 'check', onClick: done });
  const result = h('div.listen-result');

  const notes = h('textarea.input', { rows: 4, placeholder: 'z. B. love, heart, tonight …', 'aria-label': 'Verstandene Wörter' });
  notes.value = prog.listenNotes || '';

  const moods = h('div.chips', MOODS.map((m) => {
    const b = h(`button.chip${picked.has(m) ? '.is-on' : ''}`, { type: 'button', 'aria-pressed': String(picked.has(m)), onClick: () => {
      picked.has(m) ? picked.delete(m) : picked.add(m);
      b.classList.toggle('is-on', picked.has(m));
      b.setAttribute('aria-pressed', String(picked.has(m)));
    } }, m);
    return b;
  }));

  async function setupAudio() {
    const ok = await player.load(song.id);
    if (ok) {
      fill(audioBox, h('div.listen-row', playBtn, h('div.listen-wave', wave, timeEl)));
    } else {
      fill(audioBox, h('div.notice',
        icon('music', 20),
        h('div', h('strong', 'Keine Audiodatei verbunden'), h('p.muted', 'Verbinde deinen Musikordner, oder hör den Song woanders und komm dann zurück.')),
        h('div.notice-actions',
          btn('Musik verbinden', { size: 'sm', href: '#/library' }),
          h('a.btn.btn-ghost.btn-sm', { href: youtubeSearch(song), target: '_blank', rel: 'noopener' }, 'Auf YouTube', icon('external', 14)),
        ),
      ));
    }
  }

  function toggle() {
    if (player.songId !== song.id) player.load(song.id).then(() => player.play());
    else player.toggle();
  }

  ctx.onLeave(on('player:state', ({ playing }) => {
    fill(playBtn, icon(playing && player.songId === song.id ? 'pause' : 'play', 36));
  }));
  ctx.onLeave(on('player:tick', ({ t, duration }) => {
    if (player.songId !== song.id) return;
    if (lastT != null && t > lastT && t - lastT < 1) listened += t - lastT;
    lastT = t;
    waveFill.style.transform = `scaleX(${duration ? t / duration : 0})`;
    timeEl.textContent = `${fmtTime(t)} / ${fmtTime(duration)} · ${Math.round(listened)} s gehört`;
  }));

  function done() {
    update(() => {
      const p = songProgress(song.id);
      p.listenNotes = notes.value;
      p.mood = [...picked];
    });
    const lyr = getLyrics(song.id);
    const next = finishStage(song, 'listen', 10);
    const caught = caughtWords(notes.value, lyr);
    fill(result, h('div.notice.is-ok',
      icon('check', 20),
      h('div',
        h('strong', 'Gut gehört!'),
        lyr && caught.length ? h('p', `Du hast ${caught.length} Wort${caught.length === 1 ? '' : 'e'} erkannt, die wirklich im Text stehen: `, h('em', caught.join(', '))) : h('p.muted', 'Beim Mitlesen siehst du gleich, wie viel du schon herausgehört hast.'),
      ),
      btn('Weiter', { kind: 'primary', href: next }),
    ));
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  setupAudio();

  return h('div.page.page-stage',
    stageHeader(song, 'listen'),
    h('section.card',
      h('h2.card-title', 'Hör den Song ohne Text'),
      h('p.muted', 'Schließ die Augen oder tanz dazu. Du musst noch nichts verstehen, nur hinhören.'),
      audioBox,
    ),
    h('section.card',
      h('h2.card-title', 'Welche Stimmung hat der Song?'),
      h('p.muted', 'Es gibt kein Richtig oder Falsch. Musik versteht man zuerst mit dem Bauch.'),
      moods,
    ),
    h('section.card',
      h('h2.card-title', 'Welche Wörter hast du verstanden?'),
      h('p.muted', 'Schreib alles auf, was du heraushörst, auch Bruchstücke.'),
      notes,
    ),
    tipBox('Stephen Krashen', 'Erst hören, dann lesen. Wenn du ohne Text hinhörst, sucht dein Gehirn aktiv nach Bekanntem. Genau so entsteht verständlicher Input.'),
    h('div.stage-foot', doneBtn),
    result,
  );
}

function caughtWords(text, lyr) {
  if (!lyr || !text.trim()) return [];
  const lyricWords = new Set(lyr.lines.flatMap((l) => words(l.text).map((w) => normAnswer(w))));
  return [...new Set(normAnswer(text).split(' ').filter((w) => w.length > 1 && lyricWords.has(w)))];
}

function waveBars() {
  // dekorative, aber statische Wellenform (kein Loop)
  const bars = h('div.wave-bars');
  for (let i = 0; i < 48; i++) {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.17));
    bars.append(h('i', { style: { transform: `scaleY(${v.toFixed(2)})` } }));
  }
  return bars;
}
