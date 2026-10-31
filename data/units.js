/**
 * Die Lernreise: Units mit Stationen.
 * Eine Station ist entweder ein Song ({ song: 'id' }) oder eine Lektion ({ lesson: 'id' }).
 * Reihenfolge = Reihenfolge auf dem Pfad. Einfach umsortieren oder neue Units anlegen.
 * lang = Lernsprache, zu der die Unit gehört. Songs aus dem Katalog, die in keiner
 * Unit stehen, ordnet js/core/journey.js automatisch in weitere Units ein.
 */
export const UNITS = [
  {
    id: 'u1',
    lang: 'en',
    title: 'Erste Gefühle',
    goal: 'Kurze Titel, große Gefühle. Du lernst Songs mit wenigen Worten zu entschlüsseln.',
    hue: 12,
    stops: [
      { lesson: 'song-englisch-1' },
      { song: 'bad' },
      { song: 'feel-so-cold' },
      { song: 'high' },
      { song: 'im-your-fool' },
      { song: 'dive' },
    ],
  },
  {
    id: 'u2',
    lang: 'en',
    title: 'Liebe in allen Farben',
    goal: 'Die Sprache der Nähe: Zärtlichkeit, Sehnsucht und Hingabe.',
    hue: 340,
    stops: [
      { song: 'at-your-worst' },
      { song: 'learn-to-love' },
      { lesson: 'song-englisch-2' },
      { song: 'lips-on-you' },
      { song: 'elastic-heart' },
      { song: 'love-in-the-dark' },
      { song: 'keeping-me-alive' },
    ],
  },
  {
    id: 'u3',
    lang: 'en',
    title: 'Naturgewalten',
    goal: 'Stürme, Wasser, Feuer: wie Songs mit Bildern arbeiten, und wie du sie schneller hörst.',
    hue: 195,
    stops: [
      { lesson: 'verschleifungen' },
      { song: 'hurricane' },
      { song: 'drown' },
      { song: 'blow' },
      { song: 'radioactive' },
      { song: 'star-walkin' },
    ],
  },
  {
    id: 'u4',
    lang: 'en',
    title: 'Innere Kämpfe',
    goal: 'Schnellere Texte, tiefere Themen. Hier wird es anspruchsvoll.',
    hue: 255,
    stops: [
      { lesson: 'song-grammatik' },
      { song: 'whats-left-of-you' },
      { song: 'show-me-the-part' },
      { song: 'power' },
      { song: 'running' },
      { song: 'devils-cigarette' },
    ],
  },
  {
    id: 'es1',
    lang: 'es',
    title: 'Primeros pasos',
    goal: 'Die Wörter, die in jeder Bachata vorkommen, und die Klassiker, mit denen alles anfängt.',
    hue: 20,
    stops: [
      { lesson: 'bachata-espanol' },
      { song: 'no-te-vayas' },
      { lesson: 'es-imperativ' },
    ],
  },
  {
    id: 'ro1',
    lang: 'ro',
    title: 'Dor de dans',
    goal: 'Ein Ausflug ins Rumänische: Liebe, Sehnsucht und fremde Arme.',
    hue: 50,
    stops: [{ song: 'brate-straine' }],
  },
];

/**
 * Lektionen, die der Lernpfad automatisch zwischen die Katalog-Songs streut
 * (eine pro Unit, in dieser Reihenfolge).
 */
export const AUTO_LESSONS = {
  es: ['es-pronomen', 'es-caribe', 'es-subjuntivo'],
  en: [],
  pt: ['pt-basics'],
};

/** Namen für automatisch erzeugte Units je Sprache. */
export const UNIT_NAMES = {
  es: ['Corazón', 'Bajo la luna', 'Noche de baile', 'Amor prohibido', 'Mariposas', 'Sin censura', 'Fuego lento', 'Sudor y calor', 'Mar Caribe', 'Para siempre', 'Última canción', 'Madrugada'],
  en: ['Late Night Remixes', 'Heartbeats', 'Slow Burn', 'Neon Lights', 'Afterglow', 'Encore'],
  pt: ['Saudade', 'Coração', 'Noite'],
  ro: ['Dor'],
};
