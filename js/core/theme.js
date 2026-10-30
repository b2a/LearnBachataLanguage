/** Hell/Dunkel: 'auto' folgt dem System, sonst fest. */
import { state } from './state.js';

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
