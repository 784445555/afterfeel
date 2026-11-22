/* Озвучка записи синтезированным голосом: темп и высота — по правилам системы (энергия и тепло дня). */
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice(lang) {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
  // предпочитаем «естественные» голоса, если они есть
  return vs.find((v) => /natural|neural|online/i.test(v.name)) || vs[0] || null;
}

export function speak(text, style, onEnd) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const lang = /[а-яё]/i.test(text) ? "ru" : "en";
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ru" ? "ru-RU" : "en-US";
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = style.voice.rate;
  u.pitch = style.voice.pitch;
  u.onend = u.onerror = () => onEnd && onEnd();
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak()) speechSynthesis.cancel(); }
