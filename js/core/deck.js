/** Kartenstapel-Verwaltung (über srs.js). */
import { state, update } from './state.js';
import { makeCard } from './srs.js';
import { checkAchievements } from './gamify.js';

const keyOf = (front, lang) => `${lang}:${front.trim().toLowerCase()}`;

export function findCard(front, lang = 'en') {
  const k = keyOf(front, lang);
  return Object.values(state.cards).find((c) => !c.reverse && keyOf(c.front, c.lang) === k) || null;
}

/** Legt eine Karte an (ohne Duplikate). → { card, created } */
export function addCard(fields) {
  const existing = findCard(fields.front, fields.lang);
  if (existing) return { card: existing, created: false };
  const card = makeCard(fields);
  update((s) => {
    s.cards[card.id] = card;
    if (s.settings.reverseCards) {
      const rev = makeCard({ ...fields, front: fields.back, back: fields.front, reverse: true, pair: card.id });
      s.cards[rev.id] = rev;
    }
  });
  checkAchievements();
  return { card, created: true };
}

export function updateCard(id, patch) {
  update((s) => { if (s.cards[id]) s.cards[id] = { ...s.cards[id], ...patch }; });
}

export function deleteCard(id) {
  update((s) => {
    delete s.cards[id];
    for (const c of Object.values(s.cards)) if (c.pair === id) delete s.cards[c.id];
  });
}

/** Song-Vokabeln als Karten. → Anzahl neu angelegter Karten */
export function addSongVocab(song) {
  let n = 0;
  for (const v of song.vocab) {
    const { created } = addCard({ front: v.term, back: v.de, note: v.note || '', lang: song.lang, songId: song.id });
    if (created) n++;
  }
  return n;
}
