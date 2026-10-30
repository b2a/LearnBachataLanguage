/**
 * Die Lernreise: Units mit Stationen.
 * Eine Station ist entweder ein Song ({ song: 'id' }) oder eine Lektion ({ lesson: 'id' }).
 * Reihenfolge = Reihenfolge auf dem Pfad. Einfach umsortieren oder neue Units anlegen.
 */
export const UNITS = [
  {
    id: 'u1',
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
    id: 'u5',
    title: 'Weltreise',
    goal: 'Bachata ist zuhause in der Karibik. Ein Ausflug ins Spanische und Rumänische.',
    hue: 40,
    stops: [
      { lesson: 'bachata-espanol' },
      { song: 'no-te-vayas' },
      { song: 'brate-straine' },
    ],
  },
];
