/** Station 4 – Üben: automatisch erzeugte Übungen aus Songtext und Wortfeld. */
import { h, clear, fill } from '../core/dom.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { getLyrics } from '../core/lyrics.js';
import { player } from '../core/player.js';
import { songPractice } from '../exercises/generate.js';
import { runSession } from '../exercises/runner.js';
import { finishStage } from './common.js';
import { notFound } from './song.js';

export function practiceView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  const root = h('div.page.page-run');

  (async () => {
    const lyr = getLyrics(song.id);
    const audio = await player.load(song.id);
    if (audio && !player.duration) await new Promise((r) => { player.audio.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 1500); });
    player.pause();
    const items = songPractice(song, lyr, { audio, duration: player.duration || Infinity });
    let next = null;
    const run = runSession({
      title: `Üben: ${song.title}${lyr ? '' : ' (nur Wortschatz, lade den Songtext für mehr)'}`,
      items,
      backHref: `#/song/${song.id}`,
      onComplete: () => { next = finishStage(song, 'practice', 15); },
      onExit: () => (location.hash = next || `#/song/${song.id}`),
    });
    ctx.onLeave(run.cleanup);
    fill(root, run);
  })();

  return root;
}
