# Bachatalingo 💃🎧

**Sprachen lernen mit den Songs, zu denen du tanzt.**
Eine Lern-Web-App im Stil von Duolingo und Anki, gebaut um Bachata-Remixe herum:
Songtexte verstehen, Vokabeln sammeln, mitsingen. Mit Methoden von Polyglotten.

Kein Build-Schritt, keine Abhängigkeiten, kein Server: reines HTML, CSS und JavaScript (ES-Module).

**Lernsprachen:** Spanisch (Standard), Englisch, Portugiesisch, Rumänisch. Umschalten auf der Startseite oder im Profil.
Jede Sprache hat ihren eigenen Lernpfad, eigene Lektionen und eigene Karteikarten.

---

## Die Lernreise

Jeder Song ist eine Station mit fünf Schritten, inspiriert von Polyglotten-Methoden:

| # | Station | Methode | Was passiert |
|---|---------|---------|--------------|
| 1 | **Hören** | Krashen: verständlicher Input | Blind hören, Stimmung wählen, verstandene Wörter notieren. Später zeigt die App, wie viele davon wirklich im Text stehen. |
| 2 | **Titel** | Grammatik im Kontext | Der Songtitel als Mini-Lektion: Wort für Wort zerlegt, ein Grammatik-Trick, Wortfeld, Quiz. |
| 3 | **Mitlesen** | Kaufmann: Wörter sammeln | Karaoke-Text synchron zur Musik, Übersetzung pro Zeile, Wort antippen → Übersetzung, Aussprache, Karte. |
| 4 | **Üben** | Duolingo-Stil | Automatisch erzeugt: Lückentext, Satzbau, Diktat mit Original-Audio, Rückübersetzung (Lampariello), Paare, Hören. |
| 5 | **Shadowing** | Arguelles: Shadowing | Zeile in Schleife (auch langsamer), laut mitsprechen, eigene Stimme aufnehmen und vergleichen. |

Dazu kommen:

- **Lektionen** zwischen den Songs: Song-Englisch (gonna, wanna, 'cause, -in'), Verschleifungen (gotcha, wanchu), Song-Grammatik (ain't, doppelte Verneinung) und Bachata-Spanisch.
- **Wiederholen** wie Anki: Spaced Repetition (SM-2), Bewertung mit Nochmal/Schwer/Gut/Einfach, Eselsbrücken-Feld, optional Rückrichtung.
- **Tipps**: 12 Methoden von Polyglotten und Sprachforschern, jeweils verknüpft mit der passenden Funktion.
- **Motivation**: XP, Level, Streak, Tagesziel, Abzeichen, Konfetti. Alles respektiert „Bewegung reduzieren“.

## Starten

### Online (GitHub Pages)
1. Im Repo: **Settings → Pages → Source: GitHub Actions**.
2. Den Workflow **„Deploy to GitHub Pages“** unter *Actions* starten (läuft auch automatisch bei jedem Push auf `main`).
3. Die App liegt dann unter `https://<dein-name>.github.io/LearnBachataLanguage/`.

### Lokal
```bash
python3 -m http.server 8000
```
Dann <http://localhost:8000> öffnen. (Direkt per `file://` funktionieren ES-Module nicht.)

## Deine Musik verbinden

Deine MP3s bleiben auf deinem Gerät und werden nirgends hochgeladen.

- **Musik → Ordner verbinden**: Chrome und Edge merken sich den Ordner dauerhaft. In Firefox, Safari und auf dem Handy wählst du ihn nach dem Neuladen erneut aus.
- Die Zuordnung läuft automatisch über den Dateinamen (Feld `file` und `match` in `data/songs.js`).
- Passt etwas nicht: auf der Song-Seite **Datei wählen**.
- Lokal kannst du die Dateien auch in den Ordner `music/` legen. Der ist per `.gitignore` von Git ausgeschlossen.

## Songtexte

Songtexte sind urheberrechtlich geschützt und liegen deshalb **nicht** im Repo.
Die App lädt sie auf Knopfdruck aus der freien Datenbank [LRCLIB](https://lrclib.net), meist mit Zeitstempeln, oder du fügst sie selbst ein (Text oder `.lrc`).
Sie werden nur im Browser (localStorage) gespeichert.

**Remix-Tipp:** Bachata-Remixe haben oft ein anderes Intro oder Tempo als das Original.
- Läuft der Text konstant zu früh oder zu spät: **Versatz** in der Mitlese-Ansicht (‹ ›).
- Passt das Tempo nicht: **Tap-Sync** im Songtext-Editor. Song abspielen und bei jedem Zeilenanfang die Leertaste drücken. Ergebnis als `.lrc` exportierbar.

Übersetzungen kommen maschinell von [MyMemory](https://mymemory.translated.net) (kostenloses Tageskontingent, wird gecacht).
Du kannst jede Zeile mit dem Stift selbst übersetzen. Diese eigene Übersetzung nutzt die Rückübersetzungs-Übung.
Wort-Definitionen und Lautschrift stammen von [dictionaryapi.dev](https://dictionaryapi.dev).

## Erweitern

Alles Inhaltliche liegt als Daten in `data/`. Für neue Inhalte musst du keinen App-Code anfassen.

### Viele Songs auf einmal (empfohlen)
- **In der App:** Musik → *Songs hinzufügen* → Liste einfügen („Interpret - Titel“, eine Zeile pro Song). Oder den Musikordner verbinden und *Als neue Songs übernehmen* klicken.
- **Für alle (im Repo):** Zeilen in `tools/song-list.txt` ergänzen und `python3 tools/build_catalog.py` ausführen.
  Das Skript sucht jeden Song in LRCLIB, erkennt die Sprache am Text und schreibt `data/catalog.js` (nur Metadaten und die LRCLIB-ID, keine Texte).
  Katalog-Songs werden automatisch in Units einsortiert (`js/core/journey.js`).

### Neuen Song von Hand (mit eigener Titel-Lektion)
1. In `data/songs.js` einen Eintrag anhängen (Vorlage: ein vorhandener Song). Pflicht sind `id`, `title`, `artist`, `lang`, `file`, `hue`, `level`, `mood`, `title_lesson` und `vocab`.
2. In `data/units.js` die ID in eine Unit eintragen: `{ song: 'meine-id' }`.
3. Fertig. Übungen, Quiz und Karten werden automatisch erzeugt.

### Neue Lektion
In `data/lessons.js` eine Lektion anlegen (Übungstypen siehe Kommentar oben in der Datei) und in `data/units.js` mit `{ lesson: 'id' }` einbinden.

### Weitere Inhalte
- **Tipps:** `data/tips.js` (inkl. `DAILY_TIPS` für die Startseite)
- **Wörterbuch:** `data/dictionary.js`, eine Zeile `englisch = deutsch` pro Wort
- **Abzeichen:** `data/achievements.js`
- **Neue Sprache:** in `LANGS` (`data/songs.js`) ergänzen, dann Songs mit `lang: 'xx'` anlegen

### Neuer Übungstyp
In `js/exercises/types.js` eine Funktion `meinTyp(item, ctx)` schreiben, die `{ el, check() }` zurückgibt, und sie in `TYPES` registrieren. Der Runner übernimmt Fortschritt, Feedback, XP und Wiederholung falscher Antworten.

### Neue Seite
View-Funktion in `js/views/` anlegen und in `js/main.js` mit `route('#/pfad/:param', view)` registrieren.

## Aufbau

```
index.html
css/
  tokens.css        Farben (hell/dunkel), Typo, Abstände, Bewegungs-Tokens
  base.css          Grundlagen, App-Hülle, Navigation, Mini-Player
  components.css    Buttons, Formulare, Übungen, Karteikarten, Toasts …
  views.css         seitenspezifische Styles
  motion.css        alle Animationen + prefers-reduced-motion
data/               Inhalte (Songs, Units, Lektionen, Tipps, Wörterbuch, Abzeichen)
js/
  main.js           Routen + Start
  core/             State, Router, Player, Lyrics, Bibliothek, SRS, XP, Übersetzung …
  exercises/        Übungstypen, Runner, automatischer Generator
  ui/               App-Hülle, Widgets, Wort-Popover, Toasts, Effekte
  views/            eine Datei pro Seite
music/              (optional, lokal, wird nicht hochgeladen)
```

**Speicherung:** Fortschritt, Karten und Songtexte liegen im `localStorage` des Browsers.
Unter **Profil → Sicherung** kannst du alles als JSON exportieren und auf einem anderen Gerät importieren.

**Animationen** folgen festen Regeln: nur `transform`/`opacity`, Dauern 100/150/200/300 ms, ease-out beim Erscheinen, kein Bounce, keine Dauerschleifen (außer dem Equalizer während der Wiedergabe).
Bei „Bewegung reduzieren“ gibt es nur kurze Überblendungen; Konfetti und 3D-Kartendrehen entfallen.

**Tastatur:** Übungen mit 1–4 und Enter, Karteikarten mit Leertaste und 1–4, Mitlesen mit Leertaste, Pfeiltasten und L (Schleife), Tap-Sync mit Leertaste und Rücktaste.
