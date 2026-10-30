/**
 * Maschinelle Übersetzung über die kostenlose MyMemory-API (mit lokalem Cache).
 * Freies Kontingent: ca. 5000 Zeichen pro Tag. Darum wird alles gecacht.
 */
const CACHE_KEY = 'bachatalingo.tcache';
let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { cache = {}; }

function persist() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* voll – egal */ }
}

export async function translate(text, from = 'en', to = 'de') {
  const clean = text.trim();
  if (!clean) return '';
  const key = `${from}|${to}|${clean.toLowerCase()}`;
  if (cache[key]) return cache[key];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Übersetzung nicht erreichbar (${res.status})`);
  const data = await res.json();
  if (data.quotaFinished) throw new Error('Das Tageskontingent des Übersetzers ist aufgebraucht. Morgen geht es weiter.');
  let out = data.responseData?.translatedText || '';
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) throw new Error('Übersetzer meldet ein Limit. Bitte später erneut versuchen.');
  out = decodeEntities(out);
  cache[key] = out;
  persist();
  return out;
}

/** Übersetzt viele Zeilen nacheinander (schont das Kontingent), mit Fortschritts-Callback. */
export async function translateMany(lines, from, to, onProgress) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    out.push(l.trim() ? await translate(l, from, to) : '');
    onProgress?.(i + 1, lines.length);
  }
  return out;
}

function decodeEntities(s) {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

export function externalLinks(text, from = 'en') {
  const q = encodeURIComponent(text);
  return {
    deepl: `https://www.deepl.com/translator#${from}/de/${q}`,
    google: `https://translate.google.com/?sl=${from}&tl=de&text=${q}`,
    dict: from === 'en' ? `https://www.dict.cc/?s=${q}` : `https://${from}.wiktionary.org/wiki/${q}`,
    youglish: from === 'en' ? `https://youglish.com/pronounce/${q}/english` : null,
  };
}
