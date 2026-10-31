#!/usr/bin/env python3
"""
Baut data/catalog.js aus tools/song-list.txt.

Für jeden Song (Format "Interpret1,Interpret2 - Titel - Zusatz"):
  1. Titel/Zusatz bereinigen, Duplikate entfernen
  2. In LRCLIB (https://lrclib.net) nach dem Songtext suchen
  3. Sprache aus dem gefundenen Text erkennen (es / en / pt / ...)
  4. Nur Metadaten speichern (LRCLIB-ID, Sprache, synchron ja/nein).
     Die Songtexte selbst lädt die App erst im Browser.

Aufruf:  python3 tools/build_catalog.py
Neue Songs: einfach Zeilen in tools/song-list.txt ergänzen und erneut ausführen.
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'https://lrclib.net/api'
UA = {'User-Agent': 'Bachatalingo catalog builder (github.com/b2a/LearnBachataLanguage)'}

STOP = {
    'es': 'que de la el en y a los se no me te mi tu por con para un una lo es yo como pero si más mas cuando quiero amor corazón contigo sin todo nada eres estoy vida porque ya está esta hoy'.split(),
    'en': "the and you i to me my it is in that on your of for be love can don't i'm just know all we what so baby when this like but with no oh".split(),
    'pt': 'você não eu meu minha que de o a com para é um uma te amor coração mais vou tudo quando sem nós isso estou também então'.split(),
    'ro': 'și nu eu tu că de la în mă te mi ce iubire inimă cu pe sunt ești dar mai am'.split(),
}


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def detect(text):
    words = re.findall(r"[\w'’]+", text.lower())
    if len(words) < 20:
        return None
    scores = {k: sum(1 for w in words if w in set(v)) / len(words) for k, v in STOP.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0.06 else None


EXTRA = re.compile(r'\b(bachata|versi[oó]n|version|remix|mashup|sensual|piano|feat\.?|ft\.?|tribute|english|spanish|sweet)\b', re.I)


def parse(line):
    artists_part, _, rest = line.partition(' - ')
    artists = [a.strip() for a in artists_part.split(',') if a.strip()]
    parts = [p.strip() for p in rest.split(' - ')]
    title = parts[0]
    extras = parts[1:]
    # Klammern mit Bachata/feat./Remix … abtrennen
    for m in re.findall(r'\(([^)]*)\)', title):
        if EXTRA.search(m):
            extras.append(m)
            title = title.replace(f'({m})', '').strip()
    remix = ' · '.join(e for e in extras if e)
    spanish_version = bool(re.search(r'spanish', line, re.I))
    return {'artists': artists, 'title': re.sub(r'\s+', ' ', title).strip(' -'), 'remix': remix, 'spanishVersion': spanish_version, 'raw': line}


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(1.5 * (i + 1))
    return []


def search(track, artist=None):
    q = {'track_name': track}
    if artist:
        q['artist_name'] = artist
    return get(f'{API}/search?{urllib.parse.urlencode(q)}') or []


def pick(results, title):
    t = norm(title)
    good = [r for r in results if (r.get('plainLyrics') or r.get('syncedLyrics')) and not r.get('instrumental')]
    exact = [r for r in good if norm(r['trackName']) == t or norm(r['trackName']).startswith(t + ' ')]
    pool = exact or []
    pool.sort(key=lambda r: (not r.get('syncedLyrics'),))
    return pool[0] if pool else None


CACHE_FILE = ROOT / 'tools/.lrclib-cache.json'
CACHE = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}


OVERRIDES = {k: v for k, v in json.loads((ROOT / 'tools/overrides.json').read_text(encoding='utf-8')).items() if not k.startswith('_')}


def resolve(song):
    if song['title'] in OVERRIDES:
        artist = OVERRIDES[song['title']]
        if artist is None:
            return dict(song)
        key = f"override|{song['title']}|{artist}"
        if key not in CACHE:
            hit = pick(search(song['title'], artist), song['title'])
            if not hit:
                return dict(song)
            text = hit.get('plainLyrics') or ''
            CACHE[key] = {'lrclib': hit['id'], 'found': f"{hit['artistName']} – {hit['trackName']}", 'synced': bool(hit.get('syncedLyrics')), 'textLang': detect(text), 'confidence': 'artist'}
        return {**song, **CACHE[key]}
    if song['raw'] in CACHE:
        return {**song, **CACHE[song['raw']]}
    out = _resolve(song)
    if out.get('lrclib'):
        CACHE[song['raw']] = {k: out[k] for k in ('lrclib', 'found', 'synced', 'textLang', 'confidence')}
    return out


def _resolve(song):
    title = song['title']
    hit, confidence = None, None
    for a in song['artists'][:4]:
        hit = pick(search(title, a), title)
        if hit:
            confidence = 'artist'
            break
    if not hit:
        for a in song['artists'][:2]:
            hit = pick(get(f"{API}/search?{urllib.parse.urlencode({'q': f'{title} {a}'})}") or [], title)
            if hit:
                confidence = 'artist'
                break
    if not hit:
        hit = pick(search(title), title)
        confidence = 'title' if hit else None
    out = dict(song)
    if hit:
        text = hit.get('plainLyrics') or re.sub(r'\[[^\]]*\]', '', hit.get('syncedLyrics') or '')
        out.update({
            'lrclib': hit['id'],
            'found': f"{hit['artistName']} – {hit['trackName']}",
            'synced': bool(hit.get('syncedLyrics')),
            'textLang': detect(text),
            'confidence': confidence,
        })
    return out


def slug(s):
    return re.sub(r'-+', '-', norm(s).replace(' ', '-')).strip('-')[:48]


def main():
    lines = [l.strip() for l in (ROOT / 'tools/song-list.txt').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
    seen, songs = set(), []
    for l in lines:
        s = parse(l)
        key = norm(s['artists'][0] + ' ' + s['title'] + ' ' + s['remix'])
        if key in seen:
            continue
        seen.add(key)
        songs.append(s)
    print(f'{len(songs)} Songs (nach Duplikat-Filter), suche Songtexte …', file=sys.stderr)
    with ThreadPoolExecutor(3) as ex:
        resolved = list(ex.map(resolve, songs))
    CACHE_FILE.write_text(json.dumps(CACHE, ensure_ascii=False))

    used = set()
    catalog = []
    for s in resolved:
        sid = slug(s['title']) or 'song'
        if sid in used:
            sid = slug(s['title'] + ' ' + s['artists'][0])
        n = 2
        base = sid
        while sid in used:
            sid, n = f'{base}-{n}', n + 1
        used.add(sid)
        # Sprache: spanische Fassung → es; sonst Textsprache; sonst Titel-Heuristik
        lang = 'es' if s['spanishVersion'] else s.get('textLang')
        if s['spanishVersion'] and s.get('textLang') and s['textLang'] != 'es':
            s.pop('lrclib', None)  # gefundener Text ist das englische Original
            s['note'] = 'Spanische Fassung: Text bitte selbst einfügen'
        if not lang:
            lang = 'es' if re.search(r'[áéíóúñ¿¡]|\b(de|la|el|mi|tu|te|me|amor|sin|que|con|los|las|por|una?)\b', s['title'], re.I) else 'en'
        entry = {
            'id': sid,
            'title': s['title'],
            'artist': ', '.join(s['artists']),
            'remix': s['remix'],
            'lang': lang,
            'match': [norm(s['artists'][0] + ' ' + s['title']), norm(s['title'])],
            'lyrics': {'track': s['title'], 'artist': s['artists'][0]},
        }
        if s.get('lrclib'):
            entry['lrclib'] = s['lrclib']
            entry['synced'] = s['synced']
            entry['lyricsFrom'] = s['found']
            if s['confidence'] == 'title':
                entry['unsure'] = True
        if s.get('note'):
            entry['note'] = s['note']
        catalog.append(entry)

    header = (
        '/**\n * Song-Katalog, automatisch erzeugt von tools/build_catalog.py. Nicht von Hand bearbeiten.\n'
        ' * Enthält nur Metadaten: Die Songtexte lädt die App im Browser über die LRCLIB-ID.\n'
        ' * unsure: true = Text wurde nur über den Titel gefunden, bitte kurz prüfen.\n */\n'
    )
    body = 'export const CATALOG = ' + json.dumps(catalog, ensure_ascii=False, indent=1) + ';\n'
    (ROOT / 'data/catalog.js').write_text(header + body, encoding='utf-8')

    found = [c for c in catalog if c.get('lrclib')]
    report = {
        'total': len(catalog),
        'found': len(found),
        'synced': sum(1 for c in found if c.get('synced')),
        'unsure': sum(1 for c in found if c.get('unsure')),
        'langs': {l: sum(1 for c in catalog if c['lang'] == l) for l in sorted({c['lang'] for c in catalog})},
        'missing': [f"{c['artist']} – {c['title']}" for c in catalog if not c.get('lrclib')],
    }
    (ROOT / 'tools/catalog-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'missing'}, ensure_ascii=False), file=sys.stderr)


if __name__ == '__main__':
    main()
