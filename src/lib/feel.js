/* Урок Daylio: день можно отметить одним касанием. Шесть отметок = точки на двух осях (энергия, тепло). */
import { analyzeText, makeTitle } from "./text";

export const FEELS = [
  { id: "calm", label: "спокойно", e: 0.2, w: 0.1, adj: { m: "Тихий", f: "Тихая", n: "Тихое" } },
  { id: "warm", label: "тепло", e: 0.4, w: 0.75, adj: { m: "Тёплый", f: "Тёплая", n: "Тёплое" } },
  { id: "joy", label: "радостно", e: 0.75, w: 0.65, adj: { m: "Солнечный", f: "Солнечная", n: "Солнечное" } },
  { id: "full", label: "насыщенно", e: 0.88, w: 0.05, adj: { m: "Насыщенный", f: "Насыщенная", n: "Насыщенное" } },
  { id: "tense", label: "тревожно", e: 0.75, w: -0.6, adj: { m: "Нервный", f: "Нервная", n: "Нервное" } },
  { id: "grey", label: "грустно", e: 0.22, w: -0.6, adj: { m: "Пасмурный", f: "Пасмурная", n: "Пасмурное" } }
];
export const feelById = (id) => FEELS.find((f) => f.id === id) || null;

const WEEKDAYS = [
  ["воскресенье", "n"], ["понедельник", "m"], ["вторник", "m"], ["среда", "f"],
  ["четверг", "m"], ["пятница", "f"], ["суббота", "f"]
];
const MONTH_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/* ближайшая отметка к итоговым энергии и теплу дня */
export function nearestFeel(E, W) {
  return FEELS.reduce((best, f) => (Math.hypot(f.e - E, f.w - W) < Math.hypot(best.e - E, best.w - W) ? f : best));
}

/* Название папки: по смыслу записи, а если записи нет — по дню недели и времени месяца.
   Один тон, 3–7 слов: «Осенний парк и какао», «Тихая суббота в конце ноября». */
export function titleFor({ text = "", date, feel, style }) {
  const a = analyzeText(text);
  if (a.words && (a.place || a.season || a.time || a.event)) return makeTitle(a, text);
  const f = feel || (style ? nearestFeel(style.E, style.W) : FEELS[0]);
  const [y, m, d] = date.split("-").map(Number);
  const [wd, g] = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const part = d <= 10 ? "в начале" : d <= 20 ? "в середине" : "в конце";
  if (a.words) {
    const t = makeTitle(a, text);
    if (t.split(" ").length >= 3) return t;
  }
  return `${f.adj[g]} ${wd} ${part} ${MONTH_GEN[m - 1]}`;
}
