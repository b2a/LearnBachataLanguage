/**
 * Hash-Router: route('#/song/:id', view)
 * Eine View ist eine Funktion (ctx) => HTMLElement | Promise<HTMLElement>.
 * ctx = { params, query, onLeave(fn) }. onLeave-Funktionen laufen beim Verlassen.
 */
import { emit } from './events.js';
import { clear } from './dom.js';

const routes = [];
let outlet;
let cleanups = [];
let navId = 0;

export function route(pattern, view) {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/^#/, '').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$',
  );
  routes.push({ re, keys, view });
}

export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

export function startRouter(el) {
  outlet = el;
  window.addEventListener('hashchange', render);
  render();
}

export function currentPath() {
  return (location.hash || '#/').slice(1).split('?')[0] || '/';
}

async function render() {
  const id = ++navId;
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  let match;
  const r = routes.find((x) => (match = path.match(x.re))) || routes.find((x) => x.keys.length === 0 && x.re.test('/'));
  const params = {};
  if (match) r.keys.forEach((k, i) => (params[k] = decodeURIComponent(match[i + 1])));

  cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  cleanups = [];
  const ctx = { params, query, path, onLeave: (fn) => cleanups.push(fn) };

  let view;
  try {
    view = await r.view(ctx);
  } catch (err) {
    console.error(err);
    view = document.createElement('div');
    view.className = 'page';
    view.innerHTML = '<h1>Da ist etwas schiefgelaufen</h1><p class="muted">Lade die Seite neu. Deine Fortschritte sind gespeichert.</p>';
  }
  if (id !== navId) return; // inzwischen weiter navigiert

  clear(outlet);
  // Eintritt: kurzer Fade + 8px nach oben (siehe motion.css), bei reduced motion nur Fade
  view.classList.add('view-enter');
  outlet.append(view);
  window.scrollTo({ top: 0, behavior: 'instant' });
  const heading = view.querySelector('h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
  emit('route', { path, params });
}
