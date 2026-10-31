/**
 * Erzeugt Übungen automatisch aus Song-Daten, Songtext und Kartenstapel.
 * Funktioniert für jeden neuen Song ohne Zusatzarbeit.
 */
import { SONGS, LANGS } from '../../data/songs.js';
import { dictFor, stopsFor, STOPS } from '../../data/dictionary.js';
import { state } from '../core/state.js';
import { shuffle, sample } from '../core/dom.js';
import { tokenize, words, normAnswer, normWord } from '../core/text.js';
import { chorusLines, lineSpan } from '../core/lyrics.js';

const INTERJECTION = /^(oh+|ooh+|ah+|yeah+|hey+|la+|na+|uh+|woah+|whoa+|mm+|ay+|eh+|ha+)$/i;

/** Ablenker-Bedeutungen: andere Vokabeln derselben Sprache, danach Wörterbuch. */
function distractorsDe(correct, lang, n = 3) {
  const pool = new Set();
  SONGS.filter((s) => s.lang === lang).forEach((s) => s.vocab.forEach((v) => pool.add(v.de)));
  Object.values(dictFor(lang)).forEach((d) => pool.add(d));
  if (pool.size < 8) Object.values(dictFor('es')).forEach((d) => pool.add(d));
  pool.delete(correct);
  return sample([...pool].filter((d) => d.length < 60), n);
}

function distractorsTerm(correct, lang, n = 3) {
  const pool = new Set();
  SONGS.filter((s) => s.lang === lang).forEach((s) => s.vocab.forEach((v) => pool.add(v.term)));
  if (pool.size < 8) Object.keys(dictFor(lang)).forEach((t) => pool.add(t));
  pool.delete(correct);
  return sample([...pool], n);
}

function mcItem(prompt, correct, wrong, extra = {}) {
  const options = shuffle([correct, ...wrong]);
  return { type: 'mc', prompt, options, answer: options.indexOf(correct), ...extra };
}

/** Brauchbare Songzeilen (keine reinen „oh-oh“-Zeilen, keine Duplikate). */
export function usableLines(lyr) {
  if (!lyr) return [];
  const seen = new Set();
  const chorus = chorusLines(lyr);
  return lyr.lines
    .map((l, i) => ({ ...l, i }))
    .filter((l) => {
      const ws = words(l.text);
      const content = ws.filter((w) => !INTERJECTION.test(w));
      const key = normAnswer(l.text);
      if (content.length < 3 || ws.length > 14 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((l) => ({ ...l, chorus: chorus.has(normAnswer(l.text)) }));
}

/** Inhaltswort für eine Lücke wählen (bevorzugt bekannte Vokabeln). */
function pickGapWord(text, lang) {
  const toks = tokenize(text);
  const cand = toks
    .map((t, idx) => ({ ...t, idx }))
    .filter((t) => t.word && t.text.length >= 3 && !stopsFor(lang).has(normWord(t.text)) && !INTERJECTION.test(t.text));
  if (!cand.length) return null;
  const known = cand.filter((t) => dictFor(lang)[normWord(t.text)]);
  const chosen = (known.length ? known : cand)[Math.floor(Math.random() * (known.length || cand.length))];
  return { toks, chosen };
}

function clozeFromLine(line, lang, allWords, withOptions) {
  const g = pickGapWord(line.text, lang);
  if (!g) return null;
  const before = g.toks.slice(0, g.chosen.idx).map((t) => t.text).join('');
  const after = g.toks.slice(g.chosen.idx + 1).map((t) => t.text).join('');
  const answer = g.chosen.text;
  const item = { type: 'cloze', before, after, answer, lang, tr: line.mine || line.tr || '' };
  if (withOptions) {
    const others = shuffle([...new Set(allWords.filter((w) => normWord(w) !== normWord(answer) && w.length >= 3 && !stopsFor(lang).has(normWord(w))))]);
    // ähnlich lange Wörter sind die besseren Ablenker
    others.sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length));
    const wrong = others.slice(0, 3);
    if (wrong.length < 3) return { ...item };
    item.options = shuffle([answer, ...wrong]);
  }
  return item;
}

/**
 * Übungsmix für einen Song.
 * opts.audio: Song-Audio ist geladen (dann Diktat mit Originalaufnahme)
 */
export function songPractice(song, lyr, { audio = false, duration = Infinity } = {}) {
  const lang = song.lang;
  const items = [];
  const vocab = songVocab(song);

  // 1) Wortschatz (nur wenn genug Wörter bekannt sind)
  if (vocab.length >= 4) {
  sample(vocab, 2).forEach((v) => items.push(mcItem(`Was bedeutet „${v.term}“?`, v.de, distractorsDe(v.de, lang), { speak: v.term.replace(/^to /, ''), lang, kicker: 'Wortschatz' })));
  const rv = sample(vocab, 1)[0];
  items.push(mcItem(`Wie heißt „${rv.de}“ auf ${LANGS[lang]?.label || lang}?`, rv.term, distractorsTerm(rv.term, lang), { lang, kicker: 'Wortschatz' }));
  items.push({ type: 'pairs', pairs: sample(vocab, Math.min(5, vocab.length)).map((v) => [v.term, v.de]) });
  }

  // 2) Aus dem Songtext
  const lines = usableLines(lyr);
  if (lines.length) {
    const allWords = lines.flatMap((l) => words(l.text));
    const chorusFirst = [...shuffle(lines.filter((l) => l.chorus)), ...shuffle(lines.filter((l) => !l.chorus))];
    const used = new Set();
    const take = (filter) => {
      const l = chorusFirst.find((x) => !used.has(x.i) && filter(x));
      if (l) used.add(l.i);
      return l;
    };

    for (let k = 0; k < 3; k++) {
      const l = take(() => true);
      const it = l && clozeFromLine(l, lang, allWords, k < 2);
      if (it) items.push(it);
    }
    for (let k = 0; k < 2; k++) {
      const l = take((x) => words(x.text).length >= 4 && words(x.text).length <= 9);
      if (l) {
        const extra = sample(allWords.filter((w) => !words(l.text).includes(w) && w.length > 2), 2);
        items.push({ type: 'order', prompt: l.mine || l.tr || 'Bau die Songzeile nach', answer: l.text, extra, lang, speakPrompt: true, tr: l.mine || l.tr });
      }
    }
    for (let k = 0; k < 2; k++) {
      const l = take((x) => words(x.text).length <= 10 && (!audio || x.t != null));
      if (!l) continue;
      const span = audio && lyr.synced ? lineSpan(lyr, l.i, duration) : null;
      items.push({ type: 'dictation', answer: l.text, lang, songId: span ? song.id : null, start: span?.start, end: span?.end });
    }
    const withTr = lines.filter((l) => (l.mine || l.tr) && !used.has(l.i));
    if (withTr.length) {
      const l = sample(withTr, 1)[0];
      items.push({ type: 'backtranslate', de: l.mine || l.tr, answer: l.text, lang });
    }
  }

  // 3) Hören
  if (vocab.length) {
    const lv = sample(vocab, 1)[0];
    const opts = shuffle([lv.term, ...distractorsTerm(lv.term, lang)]);
    items.push({ type: 'listen', speak: lv.term.replace(/^to /, ''), options: opts, answer: opts.indexOf(lv.term), lang });
  }

  // Paare und Wortschatz zuerst (Aufwärmen), dann gemischt
  const warm = items.slice(0, vocab.length >= 4 ? 4 : 0);
  return [...warm, ...shuffle(items.slice(4))];
}

/** Mini-Quiz zur Titel-Lektion. */
export function titleQuiz(song) {
  const tl = song.title_lesson;
  const lang = song.lang;
  const items = [];
  if (tl.parts.length > 1) {
    items.push({ type: 'pairs', pairs: tl.parts.map((p) => [p.w, p.g]) });
  } else {
    const p = tl.parts[0];
    items.push(mcItem(`Was bedeutet „${p.w}“?`, p.g, distractorsDe(p.g, lang), { speak: p.w, lang }));
  }
  const ex = tl.grammar.examples.filter((e) => e.en.split(' ').length > 1);
  sample(ex, 2).forEach((e) => {
    const wrong = sample(tl.grammar.examples.filter((x) => x !== e).map((x) => x.de), 3);
    if (wrong.length < 3) wrong.push(...distractorsDe(e.de, lang, 3 - wrong.length).filter((d) => !wrong.includes(d)));
    items.push(mcItem(e.en, e.de, wrong, { speak: e.en, lang, kicker: 'Was bedeutet das?' }));
  });
  const oe = ex.find((e) => words(e.en).length >= 3 && words(e.en).length <= 8);
  if (oe) items.push({ type: 'order', prompt: oe.de, answer: oe.en, extra: sample(distractorsTerm('', lang).flatMap((t) => words(t)), 2), lang });
  sample(song.vocab, 2).forEach((v) => items.push(mcItem(`„${v.de}“`, v.term, distractorsTerm(v.term, lang), { lang, kicker: 'Welches Wort passt?' })));
  return items;
}

/** Schnelle Wiederholungsrunde aus beliebigen Karten. */
export function cardsQuiz(cards) {
  const list = sample(cards, Math.min(8, cards.length));
  return list.map((c, i) => {
    if (i % 3 === 2 && c.example) {
      const g = { text: c.example };
      const it = clozeFromLine(g, c.lang, words(c.example), false);
      if (it) return it;
    }
    return mcItem(`Was bedeutet „${c.front}“?`, c.back, distractorsDe(c.back, c.lang), { speak: c.front, lang: c.lang });
  });
}

/**
 * Wortfeld eines Songs: kuratierte Vokabeln, sonst die in der Station „Wörter“
 * gesammelten Wörter, sonst die Karten, die aus diesem Song stammen.
 */
export function songVocab(song) {
  if (song.vocab?.length) return song.vocab;
  const saved = state.progress[song.id]?.vocab;
  if (saved?.length) return saved;
  return Object.values(state.cards).filter((c) => c.songId === song.id && !c.reverse).map((c) => ({ term: c.front, de: c.back }));
}

/** Häufigste Inhaltswörter eines Songtexts (für die Station „Wörter“ bei Katalog-Songs). */
export function topWords(lyr, lang, n = 10) {
  const count = new Map();
  for (const l of lyr?.lines || []) {
    for (const w of words(l.text)) {
      const k = normWord(w);
      if (k.length < 3 || INTERJECTION.test(k) || Object.values(STOPS).some((set) => set.has(k))) continue;
      count.set(k, (count.get(k) || 0) + 1);
    }
  }
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w, c]) => ({ term: w, count: c }));
}
