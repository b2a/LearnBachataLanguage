/**
 * Station 5 – Shadowing (nach Alexander Arguelles):
 * Zeile hören → laut mitsprechen/singen → optional aufnehmen und vergleichen.
 */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { player } from '../core/player.js';
import { update, state } from '../core/state.js';
import { getLyrics, lineSpan, chorusLines } from '../core/lyrics.js';
import { normAnswer } from '../core/text.js';
import { speak, stopSpeaking } from '../core/speech.js';
import { stageHeader, finishStage, tipBox } from './common.js';
import { notFound } from './song.js';
import { btn, iconBtn, bar } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { pop } from '../ui/fx.js';
import { sfx } from '../core/sfx.js';

export function shadowView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  const lyr = getLyrics(song.id);
  if (!lyr) { location.replace(`#/song/${song.id}/edit?then=shadow`); return h('div'); }

  const chorus = chorusLines(lyr);
  const all = lyr.lines.map((l, i) => ({ ...l, i })).filter((l) => l.text && l.text.split(' ').length >= 2);
  let onlyChorus = false;
  let lines = all;
  let pos = 0;
  let hasAudio = false;
  let reps = 3;
  let rate = 0.9;
  const doneLines = new Set();
  const goal = Math.min(8, all.length);

  let recorder = null;
  let recUrl = null;
  let stream = null;

  const lineEl = h('p.shadow-line', { lang: song.lang });
  const trEl = h('p.shadow-tr.muted');
  const posEl = h('span.muted');
  const progress = bar(0);
  const progLabel = h('span.small.muted');
  const recBtn = h('button.btn.btn-secondary', { type: 'button', onClick: toggleRec }, icon('mic', 18), h('span', 'Aufnehmen'));
  const myBtn = h('button.btn.btn-ghost', { type: 'button', disabled: true, onClick: playMine }, icon('play', 18), h('span', 'Meine Aufnahme'));
  const finishBtn = btn('Station abschließen', { kind: 'primary', ic: 'check', onClick: () => (location.hash = finishStage(song, 'shadow', 20)) });

  const repSel = h('select.select.select-sm', { 'aria-label': 'Wiederholungen', onChange: (e) => (reps = Number(e.target.value)) },
    [1, 2, 3, 5].map((n) => h('option', { value: n, selected: n === reps }, `${n}× hören`)));
  const rateSel = h('select.select.select-sm', { 'aria-label': 'Tempo', onChange: (e) => (rate = Number(e.target.value)) },
    [0.6, 0.75, 0.9, 1].map((r) => h('option', { value: r, selected: r === rate }, `${r}×`)));
  const chorusBtn = h('button.chip', { type: 'button', 'aria-pressed': 'false', onClick: () => {
    onlyChorus = !onlyChorus;
    lines = onlyChorus ? all.filter((l) => chorus.has(normAnswer(l.text))) : all;
    if (!lines.length) { lines = all; onlyChorus = false; toast('Keine wiederholten Zeilen gefunden.', { kind: 'info' }); }
    chorusBtn.classList.toggle('is-on', onlyChorus);
    chorusBtn.setAttribute('aria-pressed', String(onlyChorus));
    pos = 0;
    render();
  } }, icon('chorus', 14), ' Nur Refrain');

  function render() {
    const l = lines[pos];
    if (!l) return;
    lineEl.textContent = l.text;
    trEl.textContent = l.mine || l.tr || '';
    posEl.textContent = `Zeile ${pos + 1} von ${lines.length}`;
    progress.set(doneLines.size / goal);
    progLabel.textContent = doneLines.size >= goal ? 'Ziel erreicht. Du kannst die Station abschließen.' : `${doneLines.size}/${goal} Zeilen geschafft`;
    finishBtn.disabled = doneLines.size < goal;
    lineEl.classList.remove('line-enter');
    void lineEl.offsetWidth;
    lineEl.classList.add('line-enter');
    resetRec();
  }

  async function playOnce() {
    const l = lines[pos];
    const span = hasAudio && lyr.synced ? lineSpan(lyr, l.i, player.duration || Infinity) : null;
    if (span) {
      player.audio.playbackRate = rate;
      await player.playSegment(span.start, span.end);
      player.audio.playbackRate = state.settings.rate || 1;
    } else {
      await speak(l.text, song.lang, rate * 0.95);
    }
  }

  let playing = false;
  async function playLine() {
    if (playing) { stop(); return; }
    playing = true;
    lineEl.classList.add('is-playing');
    for (let k = 0; k < reps && playing; k++) {
      await playOnce();
      if (k < reps - 1 && playing) await new Promise((r) => setTimeout(r, 700)); // Pause zum Nachsprechen
    }
    playing = false;
    lineEl.classList.remove('is-playing');
  }
  function stop() {
    playing = false;
    player.stopSegment();
    player.pause();
    stopSpeaking();
    lineEl.classList.remove('is-playing');
  }

  function go(d) {
    stop();
    pos = Math.max(0, Math.min(lines.length - 1, pos + d));
    render();
  }

  function markDone() {
    const l = lines[pos];
    if (!doneLines.has(l.i)) {
      doneLines.add(l.i);
      update((s) => (s.profile.shadowLines = (s.profile.shadowLines || 0) + 1));
      sfx('ok');
      pop(lineEl);
    }
    if (pos < lines.length - 1) go(1); else render();
  }

  /* ---------- Aufnahme ---------- */
  async function toggleRec() {
    if (recorder?.state === 'recording') { recorder.stop(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast('Kein Zugriff aufs Mikrofon. Du kannst trotzdem laut mitsprechen.', { kind: 'err' });
      return;
    }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recUrl) URL.revokeObjectURL(recUrl);
      recUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      myBtn.disabled = false;
      fill(recBtn, icon('mic', 18), h('span', 'Neu aufnehmen'));
      recBtn.classList.remove('is-recording');
      playMine();
    };
    recorder.start();
    fill(recBtn, icon('stop', 18), h('span', 'Stopp'));
    recBtn.classList.add('is-recording');
  }
  function playMine() {
    if (!recUrl) return;
    new Audio(recUrl).play();
  }
  function resetRec() {
    if (recorder?.state === 'recording') recorder.stop();
    myBtn.disabled = !recUrl;
  }

  const onKey = (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === ' ') { e.preventDefault(); playLine(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Enter') { e.preventDefault(); markDone(); }
    else if (e.key.toLowerCase() === 'r') toggleRec();
  };
  document.addEventListener('keydown', onKey);
  ctx.onLeave(() => {
    document.removeEventListener('keydown', onKey);
    stop();
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    if (recUrl) URL.revokeObjectURL(recUrl);
  });

  player.load(song.id).then((ok) => { hasAudio = ok; player.pause(); });
  render();

  return h('div.page.page-stage',
    stageHeader(song, 'shadow'),
    h('div.shadow-options', repSel, rateSel, chorusBtn),
    h('section.shadow-card', { style: { '--h': song.hue } },
      h('div.shadow-top', posEl, iconBtn('volume', 'Mit Sprachausgabe vorlesen', () => speak(lines[pos].text, song.lang, rate))),
      lineEl,
      trEl,
      h('div.shadow-controls',
        iconBtn('chevronLeft', 'Vorherige Zeile (←)', () => go(-1), { size: 24 }),
        h('button.big-play', { type: 'button', 'aria-label': 'Zeile abspielen (Leertaste)', onClick: playLine }, icon('play', 34)),
        iconBtn('chevronRight', 'Nächste Zeile (→)', () => go(1), { size: 24 }),
      ),
      h('div.shadow-actions', recBtn, myBtn, h('button.btn.btn-primary', { type: 'button', onClick: markDone }, icon('check', 18), h('span', 'Mitgesprochen'))),
    ),
    h('div.shadow-progress', progress, progLabel),
    h('ol.steps-hint',
      h('li', h('strong', 'Hören: '), 'Spiel die Zeile ab, mehrmals und gern langsamer.'),
      h('li', h('strong', 'Schatten: '), 'Sprich oder sing gleichzeitig mit, wie ein Echo.'),
      h('li', h('strong', 'Vergleichen: '), 'Nimm dich auf und hör den Unterschied.'),
    ),
    tipBox('Alexander Arguelles', 'Sprich laut, deutlich und aufrecht, am besten im Gehen. Erst mit Text, später ohne. Lieber kurze Abschnitte oft als lange einmal.'),
    h('div.stage-foot', h('span.small.muted', 'Tastatur: Leertaste spielt, Enter = mitgesprochen, R = Aufnahme'), finishBtn),
  );
}
