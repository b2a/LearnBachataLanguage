/** Station 2 – Titel-Lektion: Titel zerlegen, Grammatik-Trick, Wortfeld, Mini-Quiz. */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SONG_BY_ID } from '../../data/songs.js';
import { speak } from '../core/speech.js';
import { addSongVocab } from '../core/deck.js';
import { titleQuiz, topWords } from '../exercises/generate.js';
import { getLyrics } from '../core/lyrics.js';
import { lookup } from '../core/lexicon.js';
import { words, normWord } from '../core/text.js';
import { addCard } from '../core/deck.js';
import { update, songProgress } from '../core/state.js';
import { shuffle, sample } from '../core/dom.js';
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

  if (!tl) return autoWordsView(ctx, song);
  if (ctx.query.quiz) quiz(); else lessonPage();
  return root;
}

/**
 * Station „Wörter“ für Katalog-Songs ohne handgeschriebene Lektion:
 * Titelwörter + die häufigsten Wörter aus dem Songtext, automatisch übersetzt, dann ein Quiz.
 */
function autoWordsView(ctx, song) {
  const lang = song.lang;
  const root = h('div.page.page-stage');
  const lyr = getLyrics(song.id);
  const say = (t) => speak(t, lang);
  const titleWords = [...new Set(words(song.title).map(normWord))].filter((w) => w.length > 1).slice(0, 6);
  const top = topWords(lyr, lang, 10).filter((w) => !titleWords.includes(w.term));
  const vocab = new Map(); // term → de
  let alive = true;
  ctx.onLeave(() => (alive = false));

  const quizBtn = btn('Quiz starten', { kind: 'primary', ic: 'puzzle', onClick: quiz, disabled: true });
  const status = h('p.small.muted', 'Übersetze …');

  const partEls = titleWords.map((w, i) => {
    const gloss = h('span.phrase-gloss', '…');
    const el = h('button.phrase-part', { type: 'button', style: { '--i': i }, onClick: () => say(w) }, h('span.phrase-word', w), gloss);
    el.gloss = gloss;
    el.term = w;
    return el;
  });
  const rows = top.map((t) => {
    const de = h('div.muted', '…');
    const row = h('li.example',
      h('button.icon-btn', { type: 'button', 'aria-label': `„${t.term}“ vorlesen`, onClick: () => say(t.term) }, icon('volume', 18)),
      h('div', h('strong', t.term), h('span.small.muted', ` · ${t.count}×`), de),
    );
    row.de = de;
    row.term = t.term;
    return row;
  });

  fill(root,
    stageHeader(song, 'title'),
    h('section.phrase-card', { style: { '--h': song.hue } },
      h('div.phrase-top', h('p.eyebrow', 'Der Titel'), h('button.icon-btn', { type: 'button', 'aria-label': 'Titel vorlesen', onClick: () => say(song.title) }, icon('volume', 22))),
      h('div.phrase-parts', partEls),
    ),
    h('section.card',
      h('p.eyebrow', 'Die häufigsten Wörter'),
      h('h2.card-title', 'Diese Wörter tragen den Song'),
      lyr
        ? h('p.muted', 'Automatisch aus dem Songtext ermittelt und übersetzt. Nach dem Quiz landen sie in deinem Kartenstapel.')
        : h('div.notice', icon('text', 20), h('div', h('strong', 'Noch kein Songtext'), h('p.muted', 'Mit Songtext findet die App die wichtigsten Wörter automatisch.')), btn('Songtext', { size: 'sm', href: `#/song/${song.id}/edit?then=title` })),
      rows.length ? h('ul.examples', rows) : null,
      status,
    ),
    h('div.stage-foot', quizBtn),
  );

  (async () => {
    const all = [...partEls.map((p) => [p.term, p.gloss]), ...rows.map((r) => [r.term, r.de])];
    for (const [term, el] of all) {
      if (!alive) return;
      const r = await lookup(term, lang);
      if (r.de) vocab.set(term, r.de);
      el.textContent = r.de || '–';
    }
    status.textContent = vocab.size ? `${vocab.size} Wörter übersetzt (maschinell, mit Vorsicht genießen).` : 'Übersetzung gerade nicht erreichbar.';
    quizBtn.disabled = vocab.size < 2;
  })();

  function quiz() {
    const list = [...vocab].map(([term, de]) => ({ term, de }));
    const items = [];
    if (list.length >= 4) items.push({ type: 'pairs', pairs: sample(list, 5).map((v) => [v.term, v.de]) });
    for (const v of sample(list, Math.min(5, list.length))) {
      const wrong = sample(list.filter((x) => x !== v && x.de !== v.de), 3).map((x) => x.de);
      const options = shuffle([v.de, ...wrong]);
      items.push({ type: 'mc', kicker: 'Was bedeutet das?', prompt: v.term, speak: v.term, lang, options, answer: options.indexOf(v.de) });
    }
    const lv = sample(list, 1)[0];
    if (lv && list.length >= 3) {
      const options = shuffle([lv.term, ...sample(list.filter((x) => x !== lv), 3).map((x) => x.term)]);
      items.push({ type: 'listen', speak: lv.term, lang, options, answer: options.indexOf(lv.term) });
    }
    let next = null;
    const run = runSession({
      title: `Wörter: ${song.title}`,
      items,
      backHref: `#/song/${song.id}`,
      onComplete: () => {
        update(() => (songProgress(song.id).vocab = list));
        let n = 0;
        for (const v of list) {
          const line = lyr?.lines.find((l) => words(l.text).map(normWord).includes(v.term));
          if (addCard({ front: v.term, back: v.de, lang, songId: song.id, example: line?.text || '', exampleTr: line?.tr || '' }).created) n++;
        }
        if (n) toast(`${n} Wörter aus „${song.title}“ sind jetzt in deinem Kartenstapel.`, { kind: 'ok' });
        next = finishStage(song, 'title', 10);
      },
      onExit: () => (location.hash = next || `#/song/${song.id}`),
    });
    ctx.onLeave(run.cleanup);
    fill(root, run);
  }

  return root;
}
