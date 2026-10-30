/** Gemeinsame Bausteine der Stationsseiten. */
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { STAGES, STAGE_INFO, stageDone, completeStage } from '../core/progress.js';
import { addXP } from '../core/gamify.js';
import { toast } from '../ui/toast.js';
import { cover } from '../ui/widgets.js';
import { confetti } from '../ui/fx.js';
import { sfx } from '../core/sfx.js';

export function stageHeader(song, stage) {
  return h('header.stage-head',
    h('a.icon-btn', { href: `#/song/${song.id}`, 'aria-label': 'Zurück zum Song', title: 'Zurück zum Song' }, icon('chevronLeft', 22)),
    cover(song, 'sm'),
    h('div.stage-head-text',
      h('p.eyebrow', `Station ${STAGES.indexOf(stage) + 1} · ${STAGE_INFO[stage].label}`),
      h('h1', song.title),
    ),
    h('nav.stage-dots', { 'aria-label': 'Stationen' }, STAGES.map((st) =>
      h(`a.stage-dot${st === stage ? '.is-current' : ''}${stageDone(song.id, st) ? '.is-done' : ''}`,
        { href: `#/song/${song.id}/${st}`, title: STAGE_INFO[st].label, 'aria-label': `${STAGE_INFO[st].label}${stageDone(song.id, st) ? ' (erledigt)' : ''}`, 'aria-current': st === stage ? 'step' : null },
        icon(STAGE_INFO[st].ic, 16)))),
  );
}

/** Station abschließen + XP + Feedback. Gibt die Route der nächsten Station zurück. */
export function finishStage(song, stage, xp = 15) {
  const fresh = completeStage(song.id, stage);
  if (fresh) {
    addXP(xp, `${song.title}: ${STAGE_INFO[stage].label}`);
    sfx('done');
    const allDone = STAGES.every((s) => stageDone(song.id, s));
    if (allDone) {
      confetti();
      toast(`„${song.title}“ komplett gemeistert!`, { kind: 'gold', icon: 'star', ms: 5000 });
    } else {
      toast(`Station „${STAGE_INFO[stage].label}“ geschafft.`, { kind: 'ok' });
    }
  }
  const idx = STAGES.indexOf(stage);
  const nxt = STAGES.slice(idx + 1).find((s) => !stageDone(song.id, s)) || STAGES.find((s) => !stageDone(song.id, s));
  return nxt ? `#/song/${song.id}/${nxt}` : `#/song/${song.id}`;
}

export function tipBox(person, text) {
  return h('aside.tipbox', icon('bulb', 18), h('p', h('strong', `${person}: `), text));
}
