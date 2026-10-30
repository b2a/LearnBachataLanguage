/**
 * Abzeichen. `test` bekommt den App-State und gibt true zurück, sobald es freigeschaltet ist.
 */
export const ACHIEVEMENTS = [
  { id: 'first-step', title: 'Erster Schritt', text: 'Deine erste Station abgeschlossen.', test: (s) => countStages(s) >= 1 },
  { id: 'first-song', title: 'Erster Song', text: 'Alle Stationen eines Songs geschafft.', test: (s) => completedSongs(s) >= 1 },
  { id: 'five-songs', title: 'Playlist', text: 'Fünf Songs komplett gemeistert.', test: (s) => completedSongs(s) >= 5 },
  { id: 'collector', title: 'Wortsammler:in', text: '25 Wörter im Kartenstapel.', test: (s) => Object.keys(s.cards).length >= 25 },
  { id: 'reviewer', title: 'Dranbleiber:in', text: '100 Karten wiederholt.', test: (s) => s.profile.reviews >= 100 },
  { id: 'streak-3', title: 'Im Takt', text: '3 Tage in Folge gelernt.', test: (s) => s.profile.bestStreak >= 3 },
  { id: 'streak-7', title: 'Eine Woche Rhythmus', text: '7 Tage in Folge gelernt.', test: (s) => s.profile.bestStreak >= 7 },
  { id: 'streak-30', title: 'Tanzmarathon', text: '30 Tage in Folge gelernt.', test: (s) => s.profile.bestStreak >= 30 },
  { id: 'shadow', title: 'Schattentänzer:in', text: '20 Zeilen im Shadowing nachgesprochen.', test: (s) => (s.profile.shadowLines || 0) >= 20 },
  { id: 'xp-500', title: 'Aufwärmen beendet', text: '500 XP gesammelt.', test: (s) => s.profile.xp >= 500 },
  { id: 'xp-2000', title: 'Social-Dance-Profi', text: '2000 XP gesammelt.', test: (s) => s.profile.xp >= 2000 },
  { id: 'polyglot', title: 'Polyglott', text: 'Einen Song in einer dritten Sprache gemeistert.', test: (s) => ['no-te-vayas', 'brate-straine'].some((id) => isSongDone(s, id)) },
];

export const STAGES = ['listen', 'title', 'read', 'practice', 'shadow'];

function countStages(s) {
  return Object.values(s.progress).reduce((n, p) => n + Object.values(p.stages || {}).filter(Boolean).length, 0);
}
export function isSongDone(s, id) {
  const st = s.progress[id]?.stages || {};
  return STAGES.every((k) => st[k]);
}
function completedSongs(s) {
  return Object.keys(s.progress).filter((id) => isSongDone(s, id)).length;
}
