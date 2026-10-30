/**
 * Station 3 – Mitlesen (Karaoke):
 * Songtext synchron zur Musik, Übersetzung pro Zeile, Wörter antippen und sammeln,
 * Zeilen in Schleife, Tempo und Versatz anpassen, eigene Übersetzung notieren.
 */
import { h, clear, fmtTime, prefersReducedMotion, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { player } from '../core/player.js';
import { on } from '../core/events.js';
import { state, update } from '../core/state.js';
import { getLyrics, saveLyrics, activeIndex, lineSpan, chorusLines } from '../core/lyrics.js';
import { tokenize, normWord, normAnswer } from '../core/text.js';
import { translateMany } from '../core/translate.js';
import { lemma } from '../core/lexicon.js';
import { openWordCard, closeWordCard } from '../ui/wordcard.js';
import { stageHeader, finishStage, tipBox } from './common.js';
import { notFound } from './song.js';
import { btn, iconBtn } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

export const RATES = [0.5, 0.75, 0.9, 1, 1.1];

export function readView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  let lyr = getLyrics(song.id);
  if (!lyr) { location.replace(`#/song/${song.id}/edit?then=read`); return h('div'); }

  let view = state.settings.lyricView || 'both';
  let follow = true;
  let loopLine = false;
  let active = -1;
  let hasAudio = false;
  const chorus = chorusLines(lyr);

  const deckWords = () => new Set(Object.values(state.cards).filter((c) => c.lang === song.lang).map((c) => c.front.toLowerCase()));
  let saved = deckWords();

  /* ---------- Steuerleiste ---------- */
  const playBtn = iconBtn('play', 'Abspielen (Leertaste)', () => toggle(), { cls: 'ctl-play', size: 24 });
  const timeEl = h('span.ctl-time', '0:00');
  const rateSel = h('select.select.select-sm', { 'aria-label': 'Tempo', onChange: (e) => player.setRate(Number(e.target.value)) },
    RATES.map((r) => h('option', { value: r, selected: (state.settings.rate || 1) === r }, `${r}×`)));
  const loopBtn = iconBtn('loop', 'Aktuelle Zeile wiederholen (L)', () => setLoop(!loopLine), { pressable: true });
  const followBtn = iconBtn('sync', 'Automatisch mitscrollen', () => { follow = !follow; followBtn.classList.toggle('is-active', follow); followBtn.setAttribute('aria-pressed', String(follow)); }, { pressable: true, active: true });
  const offsetEl = h('span.ctl-offset', { title: 'Versatz der Zeitstempel' }, offsetLabel());
  const viewSeg = h('div.seg', { role: 'group', 'aria-label': 'Textansicht' },
    [['orig', 'Original'], ['both', '+ Deutsch'], ['tr', 'Deutsch']].map(([k, label]) =>
      h(`button.seg-btn${view === k ? '.is-on' : ''}`, { type: 'button', 'aria-pressed': String(view === k), onClick: () => setView(k) }, label)));

  const controls = h('div.karaoke-controls',
    h('div.ctl-group',
      iconBtn('back5', '5 s zurück (←)', () => player.skip(-5)),
      playBtn,
      iconBtn('fwd5', '5 s vor (→)', () => player.skip(5)),
      timeEl,
    ),
    h('div.ctl-group',
      loopBtn,
      followBtn,
      rateSel,
      h('div.ctl-offset-group',
        iconBtn('chevronLeft', 'Text früher (−0,25 s)', () => shiftOffset(-0.25), { size: 16 }),
        offsetEl,
        iconBtn('chevronRight', 'Text später (+0,25 s)', () => shiftOffset(0.25), { size: 16 }),
      ),
    ),
  );

  const audioNotice = h('div');
  const trBar = h('div.tr-bar');
  const list = h('ol.lyrics', { 'aria-label': 'Songtext' });
  const savedCount = h('span');

  /* ---------- Songtext rendern ---------- */
  function renderLines() {
    clear(list);
    list.dataset.view = view;
    lyr.lines.forEach((line, i) => {
      if (!line.text) { list.append(h('li.lyric.is-gap', { 'data-i': i }, h('span.gap-dots', '· · ·'))); return; }
      const isChorus = chorus.has(normAnswer(line.text));
      const tr = line.mine || line.tr || '';
      const wordsEl = h('p.lyric-text', { lang: song.lang }, tokenize(line.text).map((t) => {
        if (!t.word) return t.text;
        const nw = normWord(t.text);
        const isSaved = saved.has(nw) || saved.has(lemma(nw));
        return h(`button.w${isSaved ? '.is-saved' : ''}`, { type: 'button', onClick: (e) => { e.stopPropagation(); openWordCard({ word: t.text, lang: song.lang, anchor: e.currentTarget, line: line.text, lineTr: tr, songId: song.id }); } }, t.text);
      }));
      const trEl = h('p.lyric-tr', { lang: 'de' }, tr);
      const editTr = iconBtn('edit', 'Eigene Übersetzung', () => editTranslation(i, trEl), { size: 16, cls: 'lyric-edit' });
      list.append(h('li.lyric', { 'data-i': i },
        h('div.lyric-gutter',
          line.t != null && hasAudio ? iconBtn('play', `Ab ${fmtTime(line.t + (lyr.offset || 0))} abspielen`, () => playLine(i), { size: 14, cls: 'lyric-play' }) : null,
          isChorus ? h('span.chorus-mark', { title: 'Refrain: kommt mehrmals vor' }, icon('chorus', 14)) : null,
        ),
        h('div.lyric-body', wordsEl, trEl),
        editTr,
      ));
    });
    savedCount.textContent = `${countSavedInSong()} Wörter aus diesem Song gesammelt`;
    highlight(active, true);
  }

  function countSavedInSong() {
    return Object.values(state.cards).filter((c) => c.songId === song.id).length;
  }

  function editTranslation(i, trEl) {
    const line = lyr.lines[i];
    const input = h('input.input.input-sm', { value: line.mine || line.tr || '', 'aria-label': 'Deine Übersetzung' });
    let cancelled = false;
    const saveIt = () => {
      if (cancelled) return;
      const v = input.value.trim();
      lyr.lines[i] = { ...line, mine: v && v !== line.tr ? v : undefined };
      lyr = saveLyrics(song.id, lyr);
      fill(trEl, lyr.lines[i].mine || lyr.lines[i].tr || '');
      if (v) toast('Deine Übersetzung ist gespeichert. Später fragt dich die Rückübersetzung danach.', { kind: 'ok' });
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelled = true; fill(trEl, line.mine || line.tr || ''); }
    });
    input.addEventListener('blur', saveIt, { once: true });
    fill(trEl, input);
    input.focus();
    input.select();
  }

  function highlight(idx, force = false) {
    if (idx === active && !force) return;
    list.querySelector('.lyric.is-active')?.classList.remove('is-active');
    active = idx;
    const li = list.querySelector(`.lyric[data-i="${idx}"]`);
    if (!li) return;
    li.classList.add('is-active');
    if (follow && !force) li.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  /* ---------- Wiedergabe ---------- */
  async function toggle() {
    if (!hasAudio) return;
    if (player.songId !== song.id) await player.load(song.id);
    if (loopLine && !player.playing && active >= 0) return playLine(active);
    player.toggle();
  }

  function playLine(i) {
    const span = lineSpan(lyr, i, player.duration || Infinity);
    if (!span) return;
    highlight(i);
    if (loopLine) player.playSegment(span.start, span.end, { loop: true });
    else { player.stopSegment(); player.seek(span.start); player.play(); }
  }

  function setLoop(v) {
    loopLine = v;
    loopBtn.classList.toggle('is-active', v);
    loopBtn.setAttribute('aria-pressed', String(v));
    if (v && active >= 0 && player.playing) playLine(active);
    if (!v) player.stopSegment();
  }

  function setView(k) {
    view = k;
    update((s) => (s.settings.lyricView = k));
    [...viewSeg.children].forEach((b, j) => {
      const on = ['orig', 'both', 'tr'][j] === k;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    list.dataset.view = k;
  }

  function offsetLabel() {
    const o = lyr.offset || 0;
    return `${o > 0 ? '+' : ''}${o.toFixed(2)} s`;
  }

  function shiftOffset(d) {
    lyr.offset = Math.round(((lyr.offset || 0) + d) * 100) / 100;
    lyr = saveLyrics(song.id, lyr);
    offsetEl.textContent = offsetLabel();
  }

  function moveLine(d) {
    const timed = lyr.lines.map((l, i) => (l.t != null && l.text ? i : -1)).filter((i) => i >= 0);
    const pos = timed.indexOf(active);
    const target = timed[Math.max(0, Math.min(timed.length - 1, (pos < 0 ? 0 : pos) + d))];
    if (target != null) playLine(target);
  }

  /* ---------- Übersetzung ---------- */
  function renderTrBar() {
    const missing = lyr.lines.filter((l) => l.text && !l.tr && !l.mine).length;
    clear(trBar);
    if (!missing || song.lang === 'de') return;
    const b = btn(`Übersetzung laden (${missing} Zeilen)`, { size: 'sm', ic: 'translate', onClick: async () => {
      b.disabled = true;
      const idx = lyr.lines.map((l, i) => (l.text && !l.tr ? i : -1)).filter((i) => i >= 0);
      try {
        const out = await translateMany(idx.map((i) => lyr.lines[i].text), song.lang, 'de', (n, total) => {
          b.querySelector('span').textContent = `Übersetze … ${n}/${total}`;
        });
        idx.forEach((i, k) => (lyr.lines[i] = { ...lyr.lines[i], tr: out[k] }));
        lyr = saveLyrics(song.id, lyr);
        renderLines();
        renderTrBar();
        toast('Übersetzung geladen. Maschinell, also mit Vorsicht genießen und gern selbst verbessern.', { kind: 'ok', ms: 4500 });
      } catch (err) {
        // Teilergebnisse sichern
        toast(err.message || 'Übersetzung fehlgeschlagen.', { kind: 'err', ms: 5000 });
        b.disabled = false;
      }
    } });
    trBar.append(h('div.notice', icon('translate', 20), h('div', h('strong', 'Noch keine Übersetzung'), h('p.muted', 'Lade eine maschinelle Übersetzung oder schreib deine eigene, über den Stift neben jeder Zeile.')), b));
  }

  /* ---------- Events ---------- */
  ctx.onLeave(on('player:tick', ({ t, duration }) => {
    if (player.songId !== song.id) return;
    timeEl.textContent = `${fmtTime(t)} / ${fmtTime(duration)}`;
    if (player.segment?.loop) return; // in Schleife bleibt die Zeile markiert
    highlight(activeIndex(lyr, t));
  }));
  ctx.onLeave(on('player:state', ({ playing }) => {
    const mine = player.songId === song.id;
    fill(playBtn, icon(playing && mine ? 'pause' : 'play', 24));
    playBtn.setAttribute('aria-label', playing && mine ? 'Pause (Leertaste)' : 'Abspielen (Leertaste)');
  }));
  ctx.onLeave(on('state', () => {
    const now = deckWords();
    if (now.size !== saved.size) { saved = now; renderLines(); }
  }));
  const onKey = (e) => {
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); player.skip(-5); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); player.skip(5); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveLine(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveLine(1); }
    else if (e.key.toLowerCase() === 'l') setLoop(!loopLine);
  };
  document.addEventListener('keydown', onKey);
  ctx.onLeave(() => { document.removeEventListener('keydown', onKey); closeWordCard(); player.stopSegment(); });

  (async () => {
    hasAudio = await player.load(song.id);
    clear(audioNotice);
    if (!hasAudio) {
      audioNotice.append(h('div.notice', icon('music', 20), h('div', h('strong', 'Ohne Audio'), h('p.muted', 'Du kannst trotzdem lesen und Wörter sammeln. Für Karaoke verbinde deinen Musikordner.')), btn('Musik verbinden', { size: 'sm', href: '#/library' })));
      controls.classList.add('is-disabled');
    } else if (!lyr.synced) {
      audioNotice.append(h('div.notice', icon('sync', 20), h('div', h('strong', 'Text ohne Zeitstempel'), h('p.muted', 'Mit Tap-Sync tippst du im Takt mit, und schon läuft der Text mit der Musik.')), btn('Tap-Sync', { size: 'sm', href: `#/song/${song.id}/edit?sync=1` })));
    }
    renderLines();
    if (player.songId === song.id) highlight(activeIndex(lyr, player.time));
  })();

  renderLines();
  renderTrBar();

  return h('div.page.page-stage.page-read',
    stageHeader(song, 'read'),
    audioNotice,
    trBar,
    h('div.karaoke-bar', controls, viewSeg),
    h('p.small.muted.kbd-hint', 'Tippe auf ein Wort, um es nachzuschlagen. Tastatur: Leertaste, ← →, ↑ ↓ für Zeilen, L für Schleife.'),
    list,
    tipBox('Steve Kaufmann', 'Sammle Wörter aus Inhalten, die du magst, und hör denselben Song mehrmals. Mit jeder Runde verstehst du mehr.'),
    h('div.stage-foot',
      h('span.muted', savedCount),
      h('a.btn.btn-ghost', { href: `#/song/${song.id}/edit` }, icon('edit', 18), h('span', 'Text bearbeiten')),
      btn('Station abschließen', { kind: 'primary', ic: 'check', onClick: () => (location.hash = finishStage(song, 'read', 15)) }),
    ),
  );
}
