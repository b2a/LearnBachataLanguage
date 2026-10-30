/**
 * Bachatalingo – Einstiegspunkt.
 * Routen registrieren, App-Hülle aufbauen, Musikordner wiederherstellen.
 *
 * Neue Seite hinzufügen: View in js/views/ anlegen und hier mit route() registrieren.
 */
import { route, startRouter } from './core/router.js';
import { mountShell } from './ui/shell.js';
import { applyTheme } from './core/theme.js';
import { restoreFolder, probeAllLocal } from './core/library.js';
import { checkAchievements } from './core/gamify.js';

import { homeView } from './views/home.js';
import { songView } from './views/song.js';
import { listenView } from './views/listen.js';
import { titleView } from './views/title.js';
import { readView } from './views/read.js';
import { practiceView } from './views/practice.js';
import { shadowView } from './views/shadow.js';
import { editView } from './views/edit.js';
import { lessonView } from './views/lesson.js';
import { reviewView } from './views/review.js';
import { wordsView } from './views/words.js';
import { tipsView } from './views/tips.js';
import { libraryView } from './views/library.js';
import { profileView } from './views/profile.js';

route('#/', homeView);
route('#/song/:id', songView);
route('#/song/:id/listen', listenView);
route('#/song/:id/title', titleView);
route('#/song/:id/read', readView);
route('#/song/:id/practice', practiceView);
route('#/song/:id/shadow', shadowView);
route('#/song/:id/edit', editView);
route('#/lesson/:id', lessonView);
route('#/review', reviewView);
route('#/words', wordsView);
route('#/tips', tipsView);
route('#/library', libraryView);
route('#/profile', profileView);

applyTheme();
const outlet = mountShell(document.getElementById('app'));
startRouter(outlet);
checkAchievements();

restoreFolder().catch(() => {}).finally(() => probeAllLocal().catch(() => {}));
