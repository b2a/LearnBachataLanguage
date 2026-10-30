/**
 * Ein globaler Audio-Player für die ganze App (Mini-Player bleibt beim Navigieren aktiv).
 *
 * Events (über events.js):
 *  'player:song'   neuer Song geladen
 *  'player:state'  play/pause/ended
 *  'player:tick'   ~60×/s während der Wiedergabe, { t, duration }
 */
import { SONG_BY_ID } from '../../data/songs.js';
import { resolveSource } from './library.js';
import { emit } from './events.js';
import { state, update } from './state.js';

const audio = new Audio();
audio.preload = 'metadata';
audio.preservesPitch = true;

let songId = null;
let raf = 0;
let segment = null; // { start, end, loop, resolve }

function tick() {
  const t = audio.currentTime;
  if (segment && t >= segment.end) {
    if (segment.loop) {
      audio.currentTime = segment.start;
    } else {
      const s = segment;
      segment = null;
      audio.pause();
      s.resolve?.();
    }
  }
  emit('player:tick', { t: audio.currentTime, duration: audio.duration || 0 });
  if (!audio.paused) raf = requestAnimationFrame(tick);
}

audio.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); emit('player:state', { playing: true }); });
audio.addEventListener('pause', () => { cancelAnimationFrame(raf); emit('player:state', { playing: false }); emit('player:tick', { t: audio.currentTime, duration: audio.duration || 0 }); });
audio.addEventListener('ended', () => emit('player:state', { playing: false, ended: true }));
audio.addEventListener('loadedmetadata', () => emit('player:tick', { t: audio.currentTime, duration: audio.duration || 0 }));
audio.addEventListener('seeked', () => emit('player:tick', { t: audio.currentTime, duration: audio.duration || 0 }));
audio.addEventListener('error', () => emit('player:error', { songId }));

export const player = {
  audio,
  get songId() { return songId; },
  get song() { return SONG_BY_ID[songId] || null; },
  get playing() { return !audio.paused; },
  get time() { return audio.currentTime; },
  get duration() { return audio.duration || 0; },
  get rate() { return audio.playbackRate; },

  /** Lädt einen Song. → true, wenn eine Audiodatei gefunden wurde. */
  async load(id) {
    if (songId === id && audio.src) return true;
    const song = SONG_BY_ID[id];
    const src = song && (await resolveSource(song));
    if (!src) return false;
    segment = null;
    songId = id;
    audio.src = src.url;
    audio.playbackRate = state.settings.rate || 1;
    emit('player:song', { songId: id });
    return true;
  },

  async play() {
    try { await audio.play(); } catch (err) { console.warn(err); }
  },
  pause() { audio.pause(); },
  toggle() { return audio.paused ? this.play() : this.pause(); },
  seek(t) {
    audio.currentTime = Math.max(0, Math.min(t, audio.duration || t));
  },
  skip(d) { this.seek(audio.currentTime + d); },

  setRate(r) {
    audio.playbackRate = r;
    update((s) => (s.settings.rate = r));
    emit('player:rate', { rate: r });
  },

  /** Spielt einen Abschnitt ab. Mit loop: true in Schleife, sonst Promise bis zum Ende. */
  playSegment(start, end, { loop = false } = {}) {
    segment?.resolve?.();
    return new Promise((resolve) => {
      segment = { start, end, loop, resolve };
      audio.currentTime = start;
      this.play();
    });
  },
  stopSegment() {
    const s = segment;
    segment = null;
    s?.resolve?.();
  },
  get segment() { return segment; },

  unload() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    songId = null;
    emit('player:song', { songId: null });
  },
};
