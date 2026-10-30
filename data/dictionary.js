/**
 * Mini-Wörterbuch Englisch → Deutsch mit den häufigsten Wörtern in Pop- und Bachata-Remix-Songs.
 * Wird offline für Wort-Nachschlagen und für Ablenker in Übungen genutzt.
 * Fehlt ein Wort, fragt die App einen Online-Übersetzer.
 *
 * Format: eine Zeile pro Eintrag "englisch = deutsch". Ergänzen ist ausdrücklich erwünscht.
 */
const RAW = `
a = ein, eine
about = über, ungefähr
afraid = ängstlich, sich fürchten
again = wieder, noch einmal
against = gegen
air = Luft
alive = lebendig, am Leben
all = alle, alles
alone = allein
always = immer
angel = Engel
anymore = nicht mehr
anything = irgendetwas
apart = auseinander, getrennt
arms = Arme
ask = fragen, bitten
away = weg, fort
baby = Baby, Schatz
back = zurück; Rücken
bad = schlecht, schlimm
beat = Schlag, Beat; schlagen
beautiful = schön, wunderschön
because = weil
bed = Bett
begin = beginnen
believe = glauben
belong = gehören
better = besser
between = zwischen
blind = blind
blood = Blut
blow = blasen, wehen
blue = blau; traurig
body = Körper
bone = Knochen
breath = Atem
breathe = atmen
break = brechen
broken = gebrochen, kaputt
burn = brennen
call = rufen, anrufen
calm = ruhig; Ruhe
can = können
care = sich kümmern; Sorge
catch = fangen
chance = Chance, Gelegenheit
change = ändern; Veränderung
chase = jagen, verfolgen
close = nah; schließen
cold = kalt; Kälte
come = kommen
control = Kontrolle
crazy = verrückt
cry = weinen; Schrei
dance = tanzen; Tanz
dark = dunkel
darkness = Dunkelheit
day = Tag
dead = tot
deep = tief
desire = Verlangen, Begierde
devil = Teufel
die = sterben
dive = tauchen, springen
door = Tür
down = unten, hinunter
dream = Traum; träumen
drink = trinken; Getränk
drown = ertrinken
dust = Staub
end = Ende; enden
enough = genug
every = jede(r, s)
everything = alles
eyes = Augen
face = Gesicht; sich stellen
fade = verblassen
fall = fallen
far = weit
fear = Angst
feel = fühlen
feeling = Gefühl
fight = kämpfen; Kampf
find = finden
fine = gut, in Ordnung
fire = Feuer
flame = Flamme
fly = fliegen
follow = folgen
fool = Narr, Dummkopf
forever = für immer
forget = vergessen
forgive = vergeben
free = frei
friend = Freund(in)
from = von, aus
game = Spiel
get = bekommen, werden
girl = Mädchen
give = geben
go = gehen
gold = Gold
gone = weg, fort
good = gut
goodbye = auf Wiedersehen
grow = wachsen
hand = Hand
hands = Hände
happy = glücklich
hard = hart, schwer
hate = hassen
head = Kopf
hear = hören
heart = Herz
heaven = Himmel (religiös)
hell = Hölle
help = helfen; Hilfe
here = hier
hide = verstecken
high = hoch
hold = halten
home = Zuhause
hope = Hoffnung; hoffen
hurt = verletzen, wehtun
ice = Eis
inside = drinnen, innen
kiss = Kuss; küssen
know = wissen, kennen
last = letzte(r); dauern
late = spät
leave = verlassen, gehen
left = übrig; links
let = lassen
lie = Lüge; lügen; liegen
life = Leben
light = Licht; leicht
like = wie; mögen
lips = Lippen
little = klein, wenig
live = leben
lonely = einsam
look = schauen; Blick
lose = verlieren
lost = verloren
love = Liebe; lieben
lover = Geliebte(r)
low = niedrig, tief
mad = verrückt; wütend
make = machen
maybe = vielleicht
mean = bedeuten; gemein
mind = Verstand, Kopf
mine = meins
miss = vermissen; verpassen
moment = Moment
moon = Mond
more = mehr
morning = Morgen
move = bewegen
much = viel
music = Musik
my = mein
name = Name
need = brauchen
never = nie
new = neu
night = Nacht
nobody = niemand
nothing = nichts
now = jetzt
ocean = Ozean
off = aus, weg
old = alt
only = nur
open = öffnen; offen
out = aus, hinaus
over = über, vorbei
own = eigen
pain = Schmerz
part = Teil
past = Vergangenheit; vorbei
play = spielen
please = bitte
power = Macht, Kraft
pray = beten
pull = ziehen
push = drücken, schieben
rain = Regen
reach = erreichen
ready = bereit
real = echt
remember = sich erinnern
rest = Rest; ausruhen
right = richtig; rechts
rise = aufsteigen
river = Fluss
road = Straße, Weg
run = rennen, laufen
running = rennend
sad = traurig
safe = sicher
same = gleich, derselbe
save = retten
say = sagen
scared = verängstigt
sea = Meer
see = sehen
shadow = Schatten
shake = schütteln, zittern
shine = scheinen, strahlen
show = zeigen
side = Seite
silence = Stille
sing = singen
sink = sinken
skin = Haut
sky = Himmel
sleep = schlafen
slow = langsam
smile = lächeln
smoke = Rauch
something = etwas
song = Lied
soul = Seele
sound = Klang
space = Raum, Weltall
stand = stehen
star = Stern
stay = bleiben
still = immer noch; still
stop = aufhören, anhalten
storm = Sturm
strong = stark
sun = Sonne
take = nehmen
talk = reden
taste = schmecken; Geschmack
tear = Träne; reißen
tears = Tränen
tell = erzählen, sagen
thing = Ding, Sache
think = denken
through = durch
tight = fest, eng
time = Zeit
tired = müde
together = zusammen
tonight = heute Nacht
touch = berühren; Berührung
true = wahr
trust = vertrauen
truth = Wahrheit
try = versuchen
turn = drehen; abbiegen
until = bis
up = hoch, auf
wait = warten
wake = aufwachen
walk = gehen, laufen
wall = Wand, Mauer
want = wollen
war = Krieg
warm = warm
water = Wasser
way = Weg, Art
weak = schwach
wild = wild
wind = Wind
wish = Wunsch; wünschen
with = mit
without = ohne
word = Wort
world = Welt
worst = schlimmste(r)
worse = schlimmer
wrong = falsch
year = Jahr
yesterday = gestern
young = jung
your = dein, euer, Ihr
alright = in Ordnung
anyone = irgendjemand
behind = hinter
beside = neben
better = besser
bright = hell, strahlend
burning = brennend
cause = weil (kurz für because)
chest = Brust
cloud = Wolke
colors = Farben
cross = überqueren; Kreuz
crown = Krone
darling = Liebling
dawn = Morgendämmerung
edge = Rand, Kante
empty = leer
escape = entkommen
fault = Schuld, Fehler
flesh = Fleisch
ghost = Geist
glow = glühen
gonna = werde (going to)
gotta = muss (got to)
grace = Anmut, Gnade
gun = Waffe
honey = Schatz, Honig
hunger = Hunger
lies = Lügen
lights = Lichter
midnight = Mitternacht
mirror = Spiegel
nowhere = nirgendwo
promise = Versprechen; versprechen
rush = Rausch; eilen
scream = schreien
secret = Geheimnis
sorry = Entschuldigung, tut mir leid
spark = Funke
stranger = Fremde(r)
sugar = Zucker; Süße(r)
sweet = süß
thunder = Donner
wanna = will (want to)
waves = Wellen
whisper = flüstern
wings = Flügel
wonder = sich fragen; Wunder
`;

export const DICT = {};
for (const line of RAW.split('\n')) {
  const i = line.indexOf('=');
  if (i < 1) continue;
  const en = line.slice(0, i).trim().toLowerCase();
  const de = line.slice(i + 1).trim();
  if (en && de && !DICT[en]) DICT[en] = de;
}

/** Unregelmäßige Formen → Grundform (für das Nachschlagen). */
export const IRREGULAR = {
  was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be',
  had: 'have', has: 'have', did: 'do', does: 'do', done: 'do',
  went: 'go', gone: 'go', came: 'come', saw: 'see', seen: 'see',
  felt: 'feel', left: 'leave', lost: 'lose', made: 'make', said: 'say',
  told: 'tell', took: 'take', taken: 'take', gave: 'give', given: 'give',
  knew: 'know', known: 'know', thought: 'think', fell: 'fall', fallen: 'fall',
  broke: 'break', broken: 'break', ran: 'run', held: 'hold', kept: 'keep',
  found: 'find', got: 'get', gotten: 'get', heard: 'hear', hid: 'hide', hidden: 'hide',
  blew: 'blow', blown: 'blow', flew: 'fly', flown: 'fly', woke: 'wake', woken: 'wake',
  sank: 'sink', sunk: 'sink', tore: 'tear', torn: 'tear', shone: 'shine', rose: 'rise', risen: 'rise',
  burnt: 'burn', meant: 'mean', slept: 'sleep', bought: 'buy', brought: 'bring', caught: 'catch',
  taught: 'teach', fought: 'fight', sang: 'sing', sung: 'sing', froze: 'freeze', frozen: 'freeze',
  bent: 'bend', drove: 'drive', driven: 'drive', wrote: 'write', written: 'write', lay: 'lie',
  children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth',
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "don't": 'do not', "can't": 'cannot', "won't": 'will not', "ain't": 'am not',
  "i'll": 'i will', "i've": 'i have', "it's": 'it is', "that's": 'that is',
  "what's": 'what is', "let's": 'let us', "i'd": 'i would', "'cause": 'because', cuz: 'because',
  "'til": 'until', ya: 'you', "'em": 'them', tryna: 'trying to', lemme: 'let me', gimme: 'give me',
  kinda: 'kind of', outta: 'out of', dunno: "don't know", "c'mon": 'come on',
};

/** Funktionswörter, die in Übungen nicht als Lücke gewählt werden. */
export const STOPWORDS = new Set(
  `a an the and or but so to of in on at by for with from is am are was were be been it its i me my you your he she him her his we us our they them their this that these those do does did not no yes oh ooh ah yeah hey la na uh woah whoa ay`.split(' '),
);
