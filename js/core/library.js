/**
 * Musikbibliothek: verbindet deine lokalen Audiodateien mit den Songs.
 *
 * Drei Wege:
 *  1. Ordner verbinden (Chrome/Edge, File System Access API): wird gemerkt.
 *  2. Ordner/Dateien auswählen (alle Browser, auch mobil): gilt bis zum Neuladen.
 *  3. Dateien in den Projektordner music/ legen und die App lokal starten.
 *
 * Die Dateien verlassen dabei nie deinen Rechner.
 */
import { SONGS } from '../../data/songs.js';
import { idbGet, idbSet, idbDel } from './idb.js';
import { normName } from './text.js';
import { emit } from './events.js';

const AUDIO_EXT = /\.(mp3|m4a|aac|mp4|ogg|oga|opus|webm|wav|flac)$/i;
const sources = new Map(); // songId → { url, name, via }
let folderName = null;
let pendingHandle = null; // gespeicherter Handle, der noch eine Berechtigung braucht

export const supportsFolderAccess = () => 'showDirectoryPicker' in window;

/** Song zu einem Dateinamen finden. Exakter Name gewinnt, sonst längster Suchbegriff. */
export function matchFile(filename) {
  const n = normName(filename);
  let best = null;
  let bestScore = 0;
  for (const s of SONGS) {
    if (normName(s.file) === n) return s;
    for (const m of [s.title, ...(s.match || [])]) {
      const key = normName(m);
      if (key.length < 3) continue;
      if (` ${n} `.includes(` ${key} `) && key.length > bestScore) { best = s; bestScore = key.length; }
    }
  }
  return best;
}

function register(file, via) {
  const song = matchFile(file.name);
  if (!song) return null;
  const old = sources.get(song.id);
  if (old?.url?.startsWith('blob:')) URL.revokeObjectURL(old.url);
  sources.set(song.id, { url: URL.createObjectURL(file), name: file.name, via });
  return song;
}

/** Weg 2: FileList aus <input type=file>. */
export function addFiles(fileList) {
  const matched = [];
  const unmatched = [];
  for (const f of fileList) {
    if (!AUDIO_EXT.test(f.name)) continue;
    const s = register(f, 'auswahl');
    if (s) matched.push(s); else unmatched.push(f.name);
  }
  emit('library', { matched, unmatched });
  return { matched, unmatched };
}

/** Einzelne Datei manuell einem Song zuordnen. */
export function assignFile(songId, file) {
  const old = sources.get(songId);
  if (old?.url?.startsWith('blob:')) URL.revokeObjectURL(old.url);
  sources.set(songId, { url: URL.createObjectURL(file), name: file.name, via: 'manuell' });
  emit('library', { matched: [songId], unmatched: [] });
}

/** Weg 1: Ordner auswählen und merken. */
export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ id: 'bachata-music', mode: 'read' });
  await idbSet('musicDir', handle);
  return scanHandle(handle);
}

async function scanHandle(handle) {
  folderName = handle.name;
  const files = [];
  async function walk(dir, depth) {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && AUDIO_EXT.test(entry.name)) files.push(await entry.getFile());
      else if (entry.kind === 'directory' && depth < 2) await walk(entry, depth + 1);
    }
  }
  await walk(handle, 0);
  const matched = [];
  const unmatched = [];
  for (const f of files) {
    const s = register(f, 'ordner');
    if (s) matched.push(s); else unmatched.push(f.name);
  }
  pendingHandle = null;
  emit('library', { matched, unmatched });
  return { matched, unmatched };
}

/**
 * Beim Start: gemerkten Ordner wiederherstellen.
 * Hat der Browser die Berechtigung vergessen, gibt es { needsPermission: true }.
 * Dann muss restoreWithGesture() aus einem Klick heraus aufgerufen werden.
 */
export async function restoreFolder() {
  if (!supportsFolderAccess()) return { restored: false };
  const handle = await idbGet('musicDir');
  if (!handle) return { restored: false };
  folderName = handle.name;
  const perm = await handle.queryPermission?.({ mode: 'read' });
  if (perm === 'granted') {
    await scanHandle(handle);
    return { restored: true };
  }
  pendingHandle = handle;
  emit('library', { matched: [], unmatched: [] });
  return { restored: false, needsPermission: true };
}

export async function restoreWithGesture() {
  if (!pendingHandle) return false;
  const perm = await pendingHandle.requestPermission({ mode: 'read' });
  if (perm !== 'granted') return false;
  await scanHandle(pendingHandle);
  return true;
}

export async function forgetFolder() {
  await idbDel('musicDir');
  folderName = null;
  pendingHandle = null;
  for (const [id, src] of sources) {
    if (src.via === 'ordner') { URL.revokeObjectURL(src.url); sources.delete(id); }
  }
  emit('library', { matched: [], unmatched: [] });
}

/**
 * Weg 3: Projektordner music/ (nur wenn die App lokal gehostet wird).
 * Liest die Verzeichnisliste des lokalen Servers (z. B. python -m http.server)
 * mit einer einzigen Anfrage und ordnet alle Audiodateien zu.
 */
// Auf GitHub Pages liegen keine Musikdateien, dort sparen wir uns die Anfrage.
const CAN_PROBE = location.protocol.startsWith('http') && !/github\.io$/.test(location.hostname);
let probing = null;

export function probeAllLocal() {
  if (!CAN_PROBE) return Promise.resolve();
  probing ??= (async () => {
    try {
      const res = await fetch('music/', { cache: 'no-store' });
      if (!res.ok || !/html/.test(res.headers.get('content-type') || '')) return;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      for (const a of doc.querySelectorAll('a[href]')) {
        const href = a.getAttribute('href');
        const name = decodeURIComponent(href.split('/').pop() || '');
        if (!AUDIO_EXT.test(name)) continue;
        const song = matchFile(name);
        if (song && !sources.has(song.id)) sources.set(song.id, { url: `music/${href.split('/').pop()}`, name, via: 'projektordner' });
      }
      emit('library', { matched: [], unmatched: [] });
    } catch { /* kein lokaler Ordner – völlig normal */ }
  })();
  return probing;
}

export function getSource(songId) {
  return sources.get(songId) || null;
}

/** Quelle eines Songs, wartet ggf. auf die einmalige Ordner-Prüfung beim Start. */
export async function resolveSource(song) {
  if (!sources.has(song.id)) await probeAllLocal();
  return sources.get(song.id) || null;
}

export function libraryStatus() {
  return {
    folderName,
    needsPermission: !!pendingHandle,
    count: sources.size,
    total: SONGS.length,
  };
}

/** YouTube-Suche als Notlösung, falls die Datei fehlt. */
export function youtubeSearch(song) {
  const q = `${song.artist.replace(/\(.*?\)/g, '')} ${song.title} ${song.remix || ''} bachata`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q.replace(/\s+/g, ' ').trim())}`;
}
