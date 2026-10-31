/** Wort nachschlagen: Offline-Wörterbuch → Song-Vokabeln → Online-Übersetzung. */
import { DICT, IRREGULAR, dictFor } from '../../data/dictionary.js';
import { SONGS } from '../../data/songs.js';
import { normWord } from './text.js';
import { translate } from './translate.js';

/** Grundform raten (sehr einfache Regeln, gut genug für Songtexte). */
export function lemma(word) {
  const w = normWord(word);
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (DICT[w]) return w;
  let x = w.replace(/in'$/, 'ing');
  const tries = [
    x,
    x.replace(/'s$/, ''),
    x.replace(/ies$/, 'y'),
    x.replace(/es$/, ''),
    x.replace(/s$/, ''),
    x.replace(/ied$/, 'y'),
    x.replace(/ed$/, ''),
    x.replace(/ed$/, 'e'),
    x.replace(/(.)\1ed$/, '$1'),
    x.replace(/ing$/, ''),
    x.replace(/ing$/, 'e'),
    x.replace(/(.)\1ing$/, '$1'),
    x.replace(/ly$/, ''),
  ];
  return tries.find((t) => DICT[t]) || x;
}

function songVocab(word, lang) {
  const w = normWord(word);
  for (const s of SONGS) {
    if (s.lang !== lang) continue;
    for (const v of s.vocab) {
      const terms = v.term.toLowerCase().replace(/^to /, '').split(/\s*\/\s*/);
      if (terms.includes(w)) return v.de;
    }
  }
  return null;
}

/** Sofortige Offline-Antwort oder null. */
export function lookupOffline(word, lang = 'en') {
  const w = normWord(word);
  if (lang === 'en') {
    if (IRREGULAR[w] && IRREGULAR[w].includes(' ')) return { lemma: IRREGULAR[w], de: DICT[IRREGULAR[w]] || null, form: true };
    const l = lemma(w);
    if (DICT[l]) return { lemma: l, de: DICT[l] };
    const sv = songVocab(l, lang);
    if (sv) return { lemma: l, de: sv };
    return { lemma: l, de: null };
  }
  // Spanisch & Co.: Wörterbuch der Sprache, dann einfache Plural-Regeln
  const d = dictFor(lang);
  const plain = w.replace(/'+$/, '');
  for (const t of [plain, plain.replace(/es$/, ''), plain.replace(/s$/, '')]) {
    if (d[t]) return { lemma: t, de: d[t] };
  }
  return { lemma: plain, de: songVocab(plain, lang) };
}

/** Vollständiges Nachschlagen inkl. Online-Übersetzung. */
export async function lookup(word, lang = 'en') {
  const off = lookupOffline(word, lang);
  if (off.de) return { ...off, source: 'offline' };
  try {
    const de = await translate(off.lemma || word, lang, 'de');
    return { ...off, de, source: 'online' };
  } catch (err) {
    return { ...off, de: null, error: err.message };
  }
}

/** Englische Definition + Lautschrift (dictionaryapi.dev). */
export async function definition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const [entry] = await res.json();
    const phon = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '';
    const audio = entry.phonetics?.find((p) => p.audio)?.audio || '';
    const m = entry.meanings?.[0];
    return { phonetic: phon, audio, pos: m?.partOfSpeech || '', def: m?.definitions?.[0]?.definition || '' };
  } catch {
    return null;
  }
}
