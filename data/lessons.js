/**
 * Grammatik- & Hör-Lektionen, die zwischen den Songs auf der Lernreise liegen.
 *
 * Aufbau einer Lektion:
 *  id, title, subtitle, lang
 *  intro      kurzer Erklärtext (Absätze als Array)
 *  table      Spickzettel: [Song-Form, Standard-Form, Deutsch]
 *  exercises  Übungen, die der Übungs-Runner versteht (siehe js/exercises/types.js):
 *    { type: 'mc', prompt, options: [...], answer: index, explain? }
 *    { type: 'order', prompt, answer: 'satz', extra?: ['ablenkwort'] }
 *    { type: 'type', prompt, answers: ['richtig', 'auch richtig'], hint? }
 *    { type: 'pairs', pairs: [['links', 'rechts'], ...] }
 *    { type: 'listen', speak: 'text', options: [...], answer: index }
 */
export const LESSONS = [
  {
    id: 'song-englisch-1',
    title: 'Song-Englisch 1',
    subtitle: 'gonna, wanna, gotta & Co.',
    lang: 'en',
    intro: [
      'Songtexte sind gesprochene Sprache mit Rhythmus. Deshalb werden Wörter zusammengezogen, bis sie in den Takt passen. Diese Formen stehen kaum in Schulbüchern, aber in fast jedem Song.',
      'Wer sie kennt, versteht plötzlich ganze Zeilen, die vorher wie Brei klangen.',
    ],
    table: [
      ['gonna', 'going to', 'werden / vorhaben'],
      ['wanna', 'want to / want a', 'wollen'],
      ['gotta', '(have) got to', 'müssen'],
      ['kinda', 'kind of', 'irgendwie'],
      ['outta', 'out of', 'aus … heraus'],
      ['lemme', 'let me', 'lass mich'],
      ['gimme', 'give me', 'gib mir'],
      ['dunno', "don't know", 'weiß nicht'],
    ],
    exercises: [
      { type: 'mc', prompt: '„I\'m gonna love you“ bedeutet …', options: ['Ich werde dich lieben', 'Ich habe dich geliebt', 'Ich muss dich lieben', 'Ich liebe dich nicht'], answer: 0, explain: 'gonna = going to → Zukunft / Vorhaben' },
      { type: 'mc', prompt: 'Welche Standardform steckt in „gotta“?', options: ['go to', 'got to', 'good to', 'get a'], answer: 1 },
      { type: 'pairs', pairs: [['wanna', 'want to'], ['lemme', 'let me'], ['gimme', 'give me'], ['outta', 'out of'], ['dunno', "don't know"]] },
      { type: 'type', prompt: 'Schreib die Standardform: „I wanna dance“', answers: ['i want to dance'], hint: 'want …' },
      { type: 'listen', speak: "I'm gonna miss you", options: ["I'm gonna miss you", "I'm gotta miss you", 'I wanna kiss you', 'I gotta kiss you'], answer: 0 },
      { type: 'order', prompt: 'Übersetze: „Ich muss gehen“ (Song-Englisch)', answer: 'I gotta go', extra: ['gonna', 'wanna'] },
      { type: 'mc', prompt: '„Get outta my head“ heißt …', options: ['Geh aus meinem Kopf raus', 'Komm in meinen Kopf', 'Ich habe Kopfweh', 'Hol mich raus'], answer: 0 },
      { type: 'listen', speak: 'Gimme your hand', options: ['Give me your hand', 'Give my hand', 'Take your hand', 'Gimme a hand'], answer: 0 },
    ],
  },
  {
    id: 'song-englisch-2',
    title: 'Song-Englisch 2',
    subtitle: "'cause, 'til, ya und -in'",
    lang: 'en',
    intro: [
      'Der Apostroph ist in Lyrics ein Hinweis: Hier fehlt etwas. Mal ein Buchstabe, mal eine ganze Silbe.',
      'Tipp: Lies die Zeile laut und füll die Lücke in Gedanken. Dann rastet die Bedeutung ein.',
    ],
    table: [
      ["'cause / cuz", 'because', 'weil'],
      ["'til", 'until', 'bis'],
      ['ya', 'you', 'du / dich'],
      ["'em", 'them', 'sie / ihnen'],
      ["lovin'", 'loving', 'liebend'],
      ["c'mon", 'come on', 'komm schon'],
      ['tryna', 'trying to', 'versuche zu'],
      ["I'ma", "I'm going to", 'ich werde'],
    ],
    exercises: [
      { type: 'mc', prompt: "„I stay 'cause I love ya“", options: ['Ich bleibe, weil ich dich liebe', 'Ich bleibe, bis ich dich liebe', 'Ich gehe, weil ich dich liebe', 'Bleib, ich liebe dich'], answer: 0 },
      { type: 'pairs', pairs: [["'til", 'until'], ['ya', 'you'], ["'em", 'them'], ['tryna', 'trying to'], ["c'mon", 'come on']] },
      { type: 'type', prompt: "Schreib aus: „nothin'“", answers: ['nothing'] },
      { type: 'mc', prompt: "„I'ma show you“ heißt …", options: ['Ich zeige es dir (gleich)', 'Ich bin deine Show', 'Zeig es mir', 'Ich habe es dir gezeigt'], answer: 0 },
      { type: 'listen', speak: "I'm tryna find my way", options: ["I'm tryna find my way", "I'm gonna find my way", 'I train to find my way', 'I try to fight my way'], answer: 0 },
      { type: 'order', prompt: 'Übersetze: „Ich tanze, bis die Sonne aufgeht“', answer: "I dance 'til the sun comes up", extra: ['cause', 'goes'] },
      { type: 'mc', prompt: 'Welche Form ist KEIN Song-Englisch für „because“?', options: ["'cause", 'cuz', 'coz', 'case'], answer: 3 },
    ],
  },
  {
    id: 'verschleifungen',
    title: 'Hören wie Muttersprachler',
    subtitle: 'Verschleifungen: gotcha, wanchu, didja',
    lang: 'en',
    intro: [
      'Beim Singen fließen Wörter ineinander. Aus „want you“ wird „wan-chu“, aus „did you“ wird „did-ja“. Das ist kein Nuscheln, das sind feste Lautregeln.',
      'Regel: t + you → „chu“, d + you → „ju“. Wenn du diese Muster kennst, verstehst du viel mehr, ohne mehr Vokabeln zu lernen.',
    ],
    table: [
      ['wanchu', 'want you', 'will dich'],
      ['gotcha', 'got you', 'hab dich'],
      ['didja', 'did you', 'hast du …?'],
      ['whatcha', 'what are you / what you', 'was du …'],
      ['meetcha', 'meet you', 'dich treffen'],
      ['wouldja', 'would you', 'würdest du …?'],
      ['lookin atcha', 'looking at you', 'dich ansehen'],
    ],
    exercises: [
      { type: 'listen', speak: 'I want you so bad', options: ['I want you so bad', 'I won chew so bad', 'I wanted so bad', 'I want to go back'], answer: 0 },
      { type: 'mc', prompt: 'Was hörst du in „gotcha“?', options: ['got you', 'go to', 'got a', 'got her'], answer: 0 },
      { type: 'pairs', pairs: [['didja', 'did you'], ['whatcha', 'what are you'], ['wouldja', 'would you'], ['meetcha', 'meet you']] },
      { type: 'listen', speak: 'Did you miss me?', options: ['Did you miss me?', 'Do you miss me?', 'Did you kiss me?', 'Did I miss it?'], answer: 0 },
      { type: 'type', prompt: "Schreib, was gemeint ist: „Whatcha doin'?“", answers: ['what are you doing', 'what are you doing?'], hint: 'What are …' },
      { type: 'listen', speak: "I'm looking at you", options: ["I'm looking at you", "I'm locking it, you", 'I look at you', "I'm looking for you"], answer: 0 },
    ],
  },
  {
    id: 'song-grammatik',
    title: 'Song-Grammatik',
    subtitle: 'Was im Lied erlaubt ist',
    lang: 'en',
    intro: [
      'Songs brechen Grammatikregeln, und zwar mit Absicht. Wenn du das weißt, verwirren dich die Zeilen nicht mehr. Du lernst sie zu verstehen, nicht nachzumachen.',
      'Typisch: „ain\'t“, doppelte Verneinung, fehlende Subjekte und „don\'t“ statt „doesn\'t“.',
    ],
    table: [
      ["ain't", "am not / isn't / haven't", 'bin nicht / ist nicht / habe nicht'],
      ["I can't get no …", "I can't get any …", 'Ich bekomme kein …'],
      ["he don't", "he doesn't", 'er tut nicht'],
      ['(I) feel so cold', 'I feel so cold', 'Subjekt weggelassen'],
      ['me and you', 'you and I', 'du und ich'],
      ['if I was you', 'if I were you', 'wenn ich du wäre'],
    ],
    exercises: [
      { type: 'mc', prompt: "„It ain't over“ heißt …", options: ['Es ist nicht vorbei', 'Es ist vorbei', 'Es war nie da', 'Es wird vorbei sein'], answer: 0 },
      { type: 'mc', prompt: "„I don't need nobody“: Wie viele Verneinungen meint der Sänger?", options: ['Eine: Ich brauche niemanden', 'Zwei: Ich brauche jemanden', 'Keine', 'Das ist eine Frage'], answer: 0, explain: 'Doppelte Verneinung verstärkt im Song-Englisch, sie hebt sich nicht auf.' },
      { type: 'type', prompt: "Schreib korrekt: „She don't love me“", answers: ["she doesn't love me", 'she does not love me'] },
      { type: 'pairs', pairs: [["ain't", "isn't"], ['he don’t', 'he doesn’t'], ['if I was', 'if I were'], ['me and you', 'you and I']] },
      { type: 'order', prompt: 'Song-Englisch: „Ich bin noch nicht fertig“', answer: "I ain't done yet", extra: ['don\'t', 'no'] },
    ],
  },
  {
    id: 'bachata-espanol',
    title: 'Bachata-Spanisch',
    subtitle: 'Die Wörter, die in jeder Bachata vorkommen',
    lang: 'es',
    intro: [
      'Klassische Bachata wird auf Spanisch gesungen, und das Vokabular ist erstaunlich klein: Liebe, Herz, Sehnsucht, Tränen, Verlassenwerden. Mit 30 Wörtern verstehst du die Hälfte jeder Bachata.',
      'Das ist das Pareto-Prinzip der Polyglotten: zuerst die häufigsten Wörter.',
    ],
    table: [
      ['amor', 'Liebe', 'mi amor = meine Liebe'],
      ['corazón', 'Herz', 'mi corazón = mein Herz'],
      ['te quiero', 'ich hab dich lieb / ich will dich', ''],
      ['te amo', 'ich liebe dich', 'stärker als te quiero'],
      ['llorar', 'weinen', 'lloro = ich weine'],
      ['olvidar', 'vergessen', 'no te olvido'],
      ['volver', 'zurückkommen', 'vuelve = komm zurück'],
      ['bailar', 'tanzen', 'bailamos = wir tanzen'],
      ['besar / beso', 'küssen / Kuss', ''],
      ['extrañar', 'vermissen', 'te extraño'],
    ],
    exercises: [
      { type: 'pairs', pairs: [['amor', 'Liebe'], ['corazón', 'Herz'], ['llorar', 'weinen'], ['bailar', 'tanzen'], ['beso', 'Kuss']] },
      { type: 'mc', prompt: '„Te extraño, mi amor“', options: ['Ich vermisse dich, meine Liebe', 'Ich liebe dich, mein Herz', 'Du bist fremd, meine Liebe', 'Komm zurück, meine Liebe'], answer: 0 },
      { type: 'listen', lang: 'es', speak: 'Vuelve conmigo', options: ['Vuelve conmigo', 'Bailo contigo', 'Vete conmigo', 'Vuela conmigo'], answer: 0 },
      { type: 'mc', prompt: 'Was ist stärker?', options: ['te amo', 'te quiero'], answer: 0, explain: '„te amo“ ist die große, ernste Liebe. „te quiero“ sagt man auch zu Freunden und Familie.' },
      { type: 'order', prompt: 'Übersetze: „Ich vergesse dich nicht“', answer: 'No te olvido', extra: ['quiero', 'amo'] },
      { type: 'type', prompt: 'Spanisch für „tanzen“', answers: ['bailar'] },
    ],
  },
  {
    id: 'es-imperativ',
    title: 'Bésame, Quédate, Dime',
    subtitle: 'Befehle mit Pronomen, das Lieblingsformat von Songtiteln',
    lang: 'es',
    intro: [
      'Schau auf deine Playlist: Mátame, Miénteme, Recházame, Quiéreme, Báilame, Acéptalo. Das sind alles Befehle mit angehängtem Pronomen.',
      'Die Regel: Beim bejahten Befehl hängt das Pronomen hinten dran (besa + me = bésame). Der Akzent bleibt dabei auf derselben Silbe und muss deshalb oft geschrieben werden. Beim verneinten Befehl steht das Pronomen vorne: ¡No me beses!',
    ],
    table: [
      ['Bésame', 'besar + me', 'Küss mich'],
      ['Quédate', 'quedarse + te', 'Bleib'],
      ['Dime', 'decir + me', 'Sag mir'],
      ['Llévame', 'llevar + me', 'Nimm mich mit'],
      ['Miénteme', 'mentir + me', 'Lüg mich an'],
      ['Quiéreme', 'querer + me', 'Lieb mich'],
      ['Acéptalo', 'aceptar + lo', 'Akzeptier es'],
      ['No te vayas', 'irse, verneint', 'Geh nicht'],
    ],
    exercises: [
      { type: 'pairs', pairs: [['Bésame', 'Küss mich'], ['Dime', 'Sag mir'], ['Llévame', 'Nimm mich mit'], ['Quédate', 'Bleib'], ['Miénteme', 'Lüg mich an']] },
      { type: 'mc', prompt: '„Llévame contigo“ (Romeo Santos) heißt …', options: ['Nimm mich mit dir', 'Ich nehme dich mit', 'Bring mich nach Hause', 'Lass mich bei dir'], answer: 0 },
      { type: 'mc', prompt: 'Wie verneint man „Bésame“?', options: ['No me beses', 'No bésame', 'Bésame no', 'No besarme'], answer: 0, explain: 'Verneint: Pronomen nach vorne, Verb in die Subjuntivo-Form (beses).' },
      { type: 'type', prompt: 'Spanisch für „Sag mir“', answers: ['dime'] },
      { type: 'listen', speak: 'Quédate conmigo esta noche', options: ['Quédate conmigo esta noche', 'Quédate contigo esta noche', 'Quiéreme conmigo esta noche', 'Quédate conmigo este día'], answer: 0 },
      { type: 'order', prompt: 'Übersetze: „Verlass mich nicht“', answer: 'No me dejes', extra: ['te', 'déjame'] },
      { type: 'mc', prompt: 'Welches Pronomen steckt in „Acéptalo“?', options: ['lo = es', 'la = sie', 'te = dich', 'me = mich'], answer: 0 },
    ],
  },
  {
    id: 'es-pronomen',
    title: 'Me, te, se',
    subtitle: 'Die kleinen Wörter, die jede Liebeszeile tragen',
    lang: 'es',
    intro: [
      'Te quiero, me gustas, te extraño, se fue: In Bachata steht fast immer ein kleines Pronomen vor dem Verb. Wer sie erkennt, weiß sofort, wer wem was antut.',
      'Achtung bei „gustar“: „Me gustas“ heißt wörtlich „Du gefällst mir“, also „Ich mag dich“.',
    ],
    table: [
      ['me', 'mich / mir', 'Me toca = Ich bin dran'],
      ['te', 'dich / dir', 'Te espero = Ich warte auf dich'],
      ['se', 'sich', 'Se fue = Sie/Er ist gegangen'],
      ['lo / la', 'ihn, es / sie', 'Lo siento = Es tut mir leid'],
      ['nos', 'uns', 'Nos vemos = Wir sehen uns'],
      ['me gustas', 'du gefällst mir', 'Ich mag dich'],
    ],
    exercises: [
      { type: 'mc', prompt: '„Me gustas“ bedeutet …', options: ['Ich mag dich', 'Du magst mich', 'Ich mag mich', 'Wir mögen uns'], answer: 0 },
      { type: 'pairs', pairs: [['Te espero', 'Ich warte auf dich'], ['Se fue', 'Sie ist gegangen'], ['Lo siento', 'Es tut mir leid'], ['Te extraño', 'Ich vermisse dich'], ['Me toca', 'Ich bin dran']] },
      { type: 'type', prompt: 'Spanisch für „Ich vermisse dich“', answers: ['te extraño', 'te extrano'] },
      { type: 'order', prompt: 'Übersetze: „Ich will dich nur für mich“', answer: 'Te quiero solo para mí', extra: ['me', 'tú'] },
      { type: 'listen', speak: 'Si no estás, me muero', options: ['Si no estás, me muero', 'Si no estás, te muero', 'Si no está, me muero', 'Sí, no estás, me mueve'], answer: 0 },
      { type: 'mc', prompt: '„Nadie te ama como yo“', options: ['Niemand liebt dich wie ich', 'Ich liebe niemanden wie dich', 'Niemand liebt mich wie du', 'Du liebst niemanden wie mich'], answer: 0 },
    ],
  },
  {
    id: 'es-caribe',
    title: 'Karibik-Spanisch',
    subtitle: "Acostumbrao, pa' ti, toa la noche",
    lang: 'es',
    intro: [
      "Bachata kommt aus der Dominikanischen Republik, und dort wird Spanisch kräftig abgeschliffen. Deine Titel zeigen es: Mal Acostumbrao, Lo Tenías Callao, Toa La Noche, Clavaito, Apretaito.",
      'Die wichtigste Regel: Zwischen zwei Vokalen fällt das d gern weg. -ado wird zu -ao, -ada zu -á, toda zu toa.',
    ],
    table: [
      ['acostumbrao', 'acostumbrado', 'gewöhnt / verwöhnt'],
      ['callao', 'callado', 'still, verschwiegen'],
      ['enamorao', 'enamorado', 'verliebt'],
      ['toa la noche', 'toda la noche', 'die ganze Nacht'],
      ["pa' ti", 'para ti', 'für dich'],
      ["na'", 'nada', 'nichts'],
      ["'tá", 'está', 'ist'],
      ['apretaíto', 'apretadito', 'ganz eng (Verkleinerung)'],
    ],
    exercises: [
      { type: 'pairs', pairs: [['enamorao', 'enamorado'], ["pa'", 'para'], ['toa', 'toda'], ["na'", 'nada'], ['callao', 'callado']] },
      { type: 'mc', prompt: '„Mal acostumbrao“ heißt …', options: ['schlecht erzogen / verwöhnt', 'schlecht gelaunt', 'zu spät gekommen', 'falsch verstanden'], answer: 0 },
      { type: 'type', prompt: "Schreib die Standardform: „Esto es pa' ti“", answers: ['esto es para ti'] },
      { type: 'listen', speak: 'Bailamos toda la noche', options: ['Bailamos toda la noche', 'Bailamos todo el noche', 'Bailemos toda la noche', 'Bailamos sola la noche'], answer: 0 },
      { type: 'mc', prompt: 'Was ist „-ito / -ita“ in „Apretaito“, „Clavaito“, „Boquita“?', options: ['Eine Verkleinerung, klingt zärtlich', 'Die Vergangenheitsform', 'Ein Befehl', 'Der Plural'], answer: 0 },
      { type: 'order', prompt: 'Übersetze: „Ich bin in dich verliebt“ (Karibik-Stil)', answer: 'Estoy enamorao de ti', extra: ['pa', 'toa'] },
    ],
  },
  {
    id: 'es-subjuntivo',
    title: 'Wünsche und Bedingungen',
    subtitle: 'Si me dices que sí, ojalá, que se parezca a ti',
    lang: 'es',
    intro: [
      'Liebeslieder sind voller Wünsche und „Was wäre, wenn“. Spanisch nutzt dafür den Subjuntivo. Du musst ihn nicht bilden können, um ihn zu verstehen. Erkenne nur die Signalwörter.',
      'Signale: „ojalá“ (hoffentlich), „que …“ am Satzanfang (möge …), „para que“ (damit), „cuando“ über die Zukunft und „si … hubiera“ (wenn … hätte).',
    ],
    table: [
      ['Si me dices que sí', 'si + Präsens', 'Wenn du Ja zu mir sagst'],
      ['Ojalá que vuelvas', 'ojalá + Subjuntivo', 'Hoffentlich kommst du zurück'],
      ['Que se parezca a ti', 'que + Subjuntivo', 'Möge sie dir ähneln'],
      ['Cuando me enamoro', 'cuando + Präsens', 'Wenn ich mich verliebe'],
      ['Si antes te hubiera conocido', 'si + hubiera', 'Hätte ich dich früher gekannt'],
    ],
    exercises: [
      { type: 'mc', prompt: '„Ojalá que me llames“', options: ['Hoffentlich rufst du mich an', 'Ich rufe dich an', 'Ruf mich nicht an', 'Du hast mich angerufen'], answer: 0 },
      { type: 'mc', prompt: '„Si antes te hubiera conocido“', options: ['Hätte ich dich früher gekannt', 'Ich kenne dich schon lange', 'Wenn ich dich kennenlerne', 'Früher kannte ich dich'], answer: 0 },
      { type: 'pairs', pairs: [['ojalá', 'hoffentlich'], ['para que', 'damit'], ['si', 'wenn / falls'], ['aunque', 'auch wenn']] },
      { type: 'listen', speak: 'Si me dices que sí', options: ['Si me dices que sí', 'Sí, me dices que sí', 'Si me dice que sí', 'Si te digo que sí'], answer: 0 },
      { type: 'order', prompt: 'Übersetze: „Hoffentlich kommst du zurück“', answer: 'Ojalá que vuelvas', extra: ['si', 'vuelves'] },
    ],
  },
  {
    id: 'pt-basics',
    title: 'Português do coração',
    subtitle: 'Die ersten Wörter für portugiesische Songs',
    lang: 'pt',
    intro: [
      'Portugiesisch sieht aus wie Spanisch, klingt aber ganz anders: weicher, nasaler, mit vielen „sch“-Lauten.',
      'Das berühmteste Wort heißt „saudade“: eine sanfte, schmerzliche Sehnsucht nach etwas, das fehlt.',
    ],
    table: [
      ['eu te amo', 'te amo', 'ich liebe dich'],
      ['saudade', 'añoranza', 'Sehnsucht'],
      ['coração', 'corazón', 'Herz'],
      ['beijo', 'beso', 'Kuss'],
      ['dançar', 'bailar', 'tanzen'],
      ['você', 'tú / usted', 'du'],
      ['não', 'no', 'nicht / nein'],
    ],
    exercises: [
      { type: 'pairs', pairs: [['coração', 'Herz'], ['beijo', 'Kuss'], ['dançar', 'tanzen'], ['saudade', 'Sehnsucht']] },
      { type: 'listen', lang: 'pt', speak: 'Eu te amo', options: ['Eu te amo', 'Eu te chamo', 'Eu amo', 'Te amo eu'], answer: 0 },
      { type: 'mc', prompt: '„Sinto saudade de você“', options: ['Ich vermisse dich', 'Ich liebe dich', 'Ich tanze mit dir', 'Ich warte auf dich'], answer: 0 },
      { type: 'type', prompt: 'Portugiesisch für „Herz“', answers: ['coração', 'coracao'] },
    ],
  },
];

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
