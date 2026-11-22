/* «Стикеры из дня» — проще, чем в Instagram: их не надо искать в библиотеке.
   Набор собирается из самого дня (песня, фраза записи, время съёмки, палитра, событие),
   стикеры наследуют стиль приёма дня и прилипают к местам композиции — испортить страницу нельзя. */
import { quoteOf, analyzeText } from "./text";

export const STICKER_LABELS = {
  song: "Песня",
  quote: "Записка",
  stamp: "Штамп даты",
  palette: "Палитра дня",
  ticket: "Билет"
};

/* какие стикеры вообще есть у этого дня */
export function availableStickers(day) {
  const list = ["stamp", "palette"];
  if (day.song) list.unshift("song");
  if (quoteOf(day.text)) list.push("quote");
  const a = analyzeText(day.text);
  if (a.event || a.place || a.time || shotTime(day)) list.push("ticket");
  return list;
}

/* места композиции (центр стикера, % от ширины/высоты листа) — считаются из геометрии дня */
export function slotsFor(s) {
  const wTop = s.air + 4 + s.topH + 2.5, wBot = 100 - (s.air + 13);
  return [
    { id: "a", x: 100 - s.air - 13, y: s.air + 4 + s.topH * 0.5 },   // на поле цвета справа
    { id: "b", x: s.air + 15, y: wTop + 3 },                         // угол окна слева сверху
    { id: "c", x: 100 - s.air - 17, y: wBot - 4 },                   // угол окна справа снизу
    { id: "d", x: s.air + 13, y: (wTop + wBot) / 2 + 6 },            // край окна слева
    { id: "e", x: 100 - s.air - 11, y: (wTop + wBot) / 2 - 8 }       // край окна справа
  ];
}

/* время из фото (EXIF) — для штампа и билета */
export function shotTime(day) {
  const t = day.photos.map((p) => p.takenAt).filter(Boolean).sort()[0];
  if (!t) return null;
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function dayOfYear(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
}

/* какой набор просит приём дня (порядок = приоритет) */
const PRIORITY = {
  monet: ["quote", "song", "stamp"],
  matisse: ["song", "ticket", "palette", "quote"],
  kandinsky: ["ticket", "stamp", "song"],
  minimal: ["stamp", "song"]
};
/* предпочтительные места для каждого типа */
const HOME = { song: ["c", "e"], quote: ["b", "d"], stamp: ["a", "e"], palette: ["d", "a"], ticket: ["e", "b"] };

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* «Собрать за меня»: вариант 0, 1, 2… — разные, но всегда по правилам приёма */
export function autoCompose(day, s, variant = 0) {
  const avail = availableStickers(day);
  let order = (PRIORITY[s.technique] || PRIORITY.monet).filter((t) => avail.includes(t));
  if (s.film && avail.includes("stamp")) order = ["stamp", ...order.filter((t) => t !== "stamp")];
  const extra = avail.filter((t) => !order.includes(t));
  const rnd = rng(`${day.id}-${variant}`);
  if (variant > 0) {
    // другие варианты: меняем один стикер на запасной и перемешиваем места
    if (extra.length) order = [...order.slice(0, -1), extra[Math.floor(rnd() * extra.length)]];
    order = order.sort(() => rnd() - 0.5);
  }
  const used = new Set();
  return order.map((type) => {
    const prefs = variant % 2 ? [...HOME[type]].reverse() : HOME[type];
    const slot = [...prefs, "a", "b", "c", "d", "e"].find((x) => !used.has(x));
    used.add(slot);
    return { type, slot, tilt: Math.round((rnd() - 0.5) * (s.kandinsky ? 0 : s.minimal ? 2 : 10)) };
  });
}

/* всё, что стикеру нужно знать о дне */
export function stickerInfo(day, s) {
  const sw = s.explain.find((e) => e.swatches)?.swatches || [];
  const [y, m, d] = day.date.split("-");
  return {
    song: day.song, quote: quoteOf(day.text), title: day.title, time: shotTime(day),
    led: `'${y.slice(2)} ${m} ${d}`, doy: dayOfYear(day.date), swatches: sw.slice(0, 4),
    dayNum: +d, month: ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"][+m - 1], year: y,
    color: s.circle?.color || s.blobs?.[0]?.color || s.accent
  };
}

/* какой вид у стикеров в этот день */
export const stickerSkin = (s) => (s.matisse ? "matisse" : s.kandinsky ? "kandinsky" : s.minimal ? "minimal" : "monet");

export function nearestSlot(s, x, y, taken = []) {
  const free = slotsFor(s).filter((sl) => !taken.includes(sl.id));
  return (free.length ? free : slotsFor(s))
    .reduce((best, sl) => (Math.hypot(sl.x - x, sl.y - y) < Math.hypot(best.x - x, best.y - y) ? sl : best));
}
