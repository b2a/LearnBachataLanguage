/**
 * Songs aus Text anlegen: "Interpret1,Interpret2 - Titel - Zusatz" (eine Zeile pro Song)
 * oder aus Dateinamen ("Interpret - Titel (Bachata Remix).mp3").
 * Gleiche Logik wie tools/build_catalog.py.
 */
const EXTRA = /\b(bachata|versi[oó]n|remix|mashup|sensual|piano|feat\.?|ft\.?|tribute|english|spanish|sweet|\d+\s?kbit|aac|opus)\b/i;

export const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'song';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function parseSongLine(line, { file = '', lang = 'es' } = {}) {
  let raw = line.replace(/\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  let artistsPart = '';
  let rest = raw;
  const i = raw.indexOf(' - ');
  if (i > 0) { artistsPart = raw.slice(0, i); rest = raw.slice(i + 3); }
  const parts = rest.split(' - ').map((p) => p.trim());
  let title = parts[0];
  const extras = parts.slice(1);
  for (const m of title.match(/\(([^)]*)\)/g) || []) {
    if (EXTRA.test(m)) { extras.push(m.slice(1, -1)); title = title.replace(m, '').trim(); }
  }
  title = title.replace(/\s+/g, ' ').replace(/^[-\s]+|[-\s]+$/g, '');
  const artists = artistsPart.split(',').map((a) => a.trim()).filter(Boolean);
  const spanish = /spanish/i.test(raw);
  return {
    id: slugify(title),
    title,
    artist: artists.join(', ') || 'Unbekannt',
    remix: extras.filter((e) => e && !/kbit|aac|opus/i.test(e)).join(' · '),
    lang: spanish ? 'es' : lang,
    file,
    match: [norm(`${artists[0] || ''} ${title}`), norm(title)].filter((m) => m.length > 2),
    lyrics: { track: title, artist: artists[0] || '' },
  };
}

export function parseSongList(text, opts) {
  return text.split(/\r?\n/).map((l) => parseSongLine(l, opts)).filter(Boolean);
}
