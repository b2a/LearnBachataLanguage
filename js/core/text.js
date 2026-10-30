/** Text-Werkzeuge: Tokenisieren, Normalisieren, unscharfer Vergleich. */

const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}]+)*['’]?|['’][\p{L}]+/gu;

/** Zerlegt eine Zeile in Wort- und Zwischen-Tokens: [{ text, word: true|false }] */
export function tokenize(line) {
  const out = [];
  let last = 0;
  for (const m of line.matchAll(WORD_RE)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), word: false });
  return out;
}

export function words(line) {
  return tokenize(line).filter((t) => t.word).map((t) => t.text);
}

/** Kleinbuchstaben, typografische Apostrophe vereinheitlichen ('cause und walkin' bleiben erhalten). */
export function normWord(w) {
  let x = w.toLowerCase().replace(/[’`´]/g, "'");
  if (!/^'(cause|til|em|bout)$/.test(x)) x = x.replace(/^'+/, '');
  if (!/in'$/.test(x)) x = x.replace(/'+$/, '');
  return x;
}

/** Für Antwortvergleich: ohne Akzente, Satzzeichen, Apostrophe. */
export function normAnswer(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Ähnlichkeit 0..1 */
export function similarity(a, b) {
  const x = normAnswer(a);
  const y = normAnswer(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/**
 * Prüft eine getippte Antwort mit Tippfehler-Toleranz (≈ 1 Fehler pro 7 Zeichen).
 * → { ok, exact }
 */
export function checkTyped(input, answers) {
  const x = normAnswer(input);
  let best = { ok: false, exact: false };
  for (const ans of [].concat(answers)) {
    const y = normAnswer(ans);
    if (x === y) return { ok: true, exact: true };
    const allowed = Math.floor(y.length / 7);
    if (levenshtein(x, y) <= allowed) best = { ok: true, exact: false };
  }
  return best;
}

/** Wort-für-Wort-Vergleich für Diktat-Feedback: [{ word, ok }] */
export function diffWords(input, target) {
  const a = normAnswer(input).split(' ').filter(Boolean);
  const want = words(target);
  const pool = new Map();
  a.forEach((w) => pool.set(w, (pool.get(w) || 0) + 1));
  return want.map((w) => {
    const n = normAnswer(w);
    let ok = false;
    if (pool.get(n)) { ok = true; pool.set(n, pool.get(n) - 1); }
    else {
      for (const [k, v] of pool) {
        if (v && n.length > 3 && levenshtein(k, n) <= 1) { ok = true; pool.set(k, v - 1); break; }
      }
    }
    return { word: w, ok };
  });
}

export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Dateinamen und Titel vergleichbar machen. */
export function normName(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.[a-z0-9]{2,4}$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
