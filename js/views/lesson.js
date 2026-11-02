/** Grammatik-/Hör-Lektion: Erklärung + Spickzettel, danach Übungen. */
import { h, clear, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { LESSON_BY_ID } from '../../data/lessons.js';
import { speak } from '../core/speech.js';
import { completeLesson, nextStop, lessonDone } from '../core/progress.js';
import { runSession } from '../exercises/runner.js';
import { backLink, btn } from '../ui/widgets.js';
import { notFound } from './song.js';

export function lessonView(ctx) {
  const lesson = LESSON_BY_ID[ctx.params.id];
  if (!lesson) return notFound();
  const root = h('div.page.page-lesson');
  const lang = lesson.lang || 'en';

  function intro() {
    fill(root, 
      backLink('#/', 'Lernreise'),
      h('header.lesson-hero',
        h('div.lesson-badge.is-lg', icon('book', 32)),
        h('div', h('p.eyebrow', lessonDone(lesson.id) ? 'Lektion · abgeschlossen' : 'Lektion'), h('h1', lesson.title), h('p.page-sub', lesson.subtitle)),
      ),
      h('section.card', lesson.intro.map((p) => h('p', p))),
      lesson.table?.length ? h('section.card',
        h('h2.card-title', 'Spickzettel'),
        h('table.cheat',
          h('thead', h('tr', h('th', 'Im Song'), h('th', 'Standard'), h('th', 'Deutsch'), h('th', h('span.sr-only', 'Anhören')))),
          h('tbody', lesson.table.map(([a, b, c]) => h('tr',
            h('td', h('strong', a)),
            h('td', b),
            h('td.muted', c),
            h('td', h('button.icon-btn', { type: 'button', 'aria-label': `„${a}“ anhören`, onClick: () => speak(a.split('/')[0].replace(/[.…]+$/, '').trim(), lang) }, icon('volume', 18))),
          ))),
        ),
      ) : null,
      h('div.stage-foot', btn('Übungen starten', { kind: 'primary', ic: 'puzzle', onClick: run })),
    );
  }

  function run() {
    let fresh = false;
    const r = runSession({
      title: lesson.title,
      items: lesson.exercises.map((e) => ({ lang, ...e })),
      backHref: `#/lesson/${lesson.id}`,
      finishLabel: 'Weiter auf der Reise',
      onComplete: (res) => { fresh = completeLesson(lesson.id, res.accuracy); },
      onExit: () => {
        const nx = nextStop();
        if (!nx) location.hash = '#/';
        else location.hash = nx.stop.song ? `#/song/${nx.stop.song}` : `#/lesson/${nx.stop.lesson}`;
        void fresh;
      },
    });
    ctx.onLeave(r.cleanup);
    fill(root, r);
  }

  intro();
  return root;
}
