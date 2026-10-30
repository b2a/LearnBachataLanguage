/** Station 2 – Titel-Lektion: Titel zerlegen, Grammatik-Trick, Wortfeld, Mini-Quiz. */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { speak } from '../core/speech.js';
import { addSongVocab } from '../core/deck.js';
import { titleQuiz } from '../exercises/generate.js';
import { runSession } from '../exercises/runner.js';
import { stageHeader, finishStage } from './common.js';
import { notFound } from './song.js';
import { btn } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

export function titleView(ctx) {
  const song = SONG_BY_ID[ctx.params.id];
  if (!song) return notFound();
  const tl = song.title_lesson;
  const lang = song.lang;
  const root = h('div.page.page-stage');

  const say = (t) => speak(t.replace(/^to /, ''), lang);

  function lessonPage() {
    fill(root, 
      stageHeader(song, 'title'),
      h('section.phrase-card', { style: { '--h': song.hue } },
        h('div.phrase-top',
          h('p.eyebrow', 'Der Titel'),
          h('button.icon-btn', { type: 'button', 'aria-label': 'Titel vorlesen', onClick: () => say(tl.phrase) }, icon('volume', 22)),
        ),
        h('div.phrase-parts', tl.parts.map((p, i) =>
          h('button.phrase-part', { type: 'button', style: { '--i': i }, onClick: () => say(p.w), 'aria-label': `${p.w}: ${p.g}` },
            h('span.phrase-word', p.w), h('span.phrase-gloss', p.g)))),
        h('p.phrase-meaning', tl.meaning),
      ),
      h('section.card.grammar',
        h('p.eyebrow', 'Grammatik-Trick'),
        h('h2.card-title', tl.grammar.title),
        h('p', tl.grammar.text),
        h('ul.examples', tl.grammar.examples.map((e) =>
          h('li.example',
            h('button.icon-btn', { type: 'button', 'aria-label': `„${e.en}“ vorlesen`, onClick: () => say(e.en) }, icon('volume', 18)),
            h('div', h('strong', e.en), h('div.muted', e.de)),
          ))),
      ),
      h('section.card',
        h('p.eyebrow', 'Wortfeld'),
        h('h2.card-title', 'Wörter rund um den Song'),
        h('p.muted', 'Nach dem Quiz landen sie automatisch in deinem Kartenstapel.'),
        h('ul.examples', song.vocab.map((v) =>
          h('li.example',
            h('button.icon-btn', { type: 'button', 'aria-label': `„${v.term}“ vorlesen`, onClick: () => say(v.term) }, icon('volume', 18)),
            h('div', h('strong', v.term), h('div.muted', v.de), v.note ? h('div.small.muted', v.note) : null),
          ))),
      ),
      h('div.stage-foot', btn('Quiz starten', { kind: 'primary', ic: 'puzzle', onClick: quiz })),
    );
  }

  function quiz() {
    const run = runSession({
      title: `Titel-Quiz: ${song.title}`,
      items: titleQuiz(song),
      backHref: `#/song/${song.id}`,
      onComplete: () => {
        const n = addSongVocab(song);
        if (n) toast(`${n} Wörter aus „${song.title}“ sind jetzt in deinem Kartenstapel.`, { kind: 'ok' });
        root.nextHref = finishStage(song, 'title', 10);
      },
      onExit: () => (location.hash = root.nextHref || `#/song/${song.id}`),
    });
    ctx.onLeave(run.cleanup);
    fill(root, run);
  }

  if (ctx.query.quiz) quiz(); else lessonPage();
  return root;
}
