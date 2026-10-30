/** Vorlesen mit der Sprachausgabe des Browsers (Web Speech API). */
import { LANGS } from '../../data/songs.js';

let voices = [];
function loadVoices() { voices = window.speechSynthesis?.getVoices() || []; }
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export const canSpeak = () => 'speechSynthesis' in window;

function pickVoice(tag) {
  const lang = tag.toLowerCase();
  const base = lang.split('-')[0];
  const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang);
  const loose = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const list = exact.length ? exact : loose;
  // „natürliche“ Stimmen bevorzugen, falls vorhanden
  return list.find((v) => /natural|neural|google|siri|premium|enhanced/i.test(v.name)) || list[0] || null;
}

/** speak('hello', 'en') → Promise, die nach dem Vorlesen erfüllt wird */
export function speak(text, lang = 'en', rate = 0.95) {
  return new Promise((resolve) => {
    if (!canSpeak() || !text) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const tag = LANGS[lang]?.tts || lang;
    u.lang = tag;
    const v = pickVoice(tag);
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
