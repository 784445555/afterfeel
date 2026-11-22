/* ВИЗУАЛЬНАЯ СИСТЕМА AFTERFEEL
   Постоянное: формат 4:5, поле цвета сверху, окно с фото, дата сверху, название снизу, один шрифт.
   Переменное: цвет, мягкость краёв, воздух, зерно, ритм, температура — из текста, фото и песни.
   Каждое решение записывается в explain, чтобы было видно, почему день выглядит именно так. */

import { mergeColors } from "./photo";
import { metaProfile } from "./music";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb2hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
const hsl = ({ h, s, l }) => `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
function towards(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180;
  return (h + clamp(d, -amt, amt) + 360) % 360;
}

const NEUTRAL = [{ r: 150, g: 146, b: 138, share: 0.6 }, { r: 205, g: 200, b: 190, share: 0.3 }, { r: 90, g: 88, b: 84, share: 0.1 }];
const NOW = new Date().getFullYear();

export function computeStyle({ text, photos = [], song = null, seed = "day", feel = null }) {
  const rnd = rng(seed);
  // профиль песни из каталога пересчитывается по актуальным правилам; у своего файла — аудиоанализ
  const prof = song ? (song.kind === "itunes" ? metaProfile(song) : song.profile) : null;
  const ex = [];

  /* --- фото --- */
  const pal = photos.length
    ? mergeColors(photos.flatMap((p) => p.palette.map((c) => ({ ...c, share: c.share / photos.length }))), 40).slice(0, 4)
    : NEUTRAL;
  const avg = (k, d) => (photos.length ? photos.reduce((a, p) => a + p.stats[k], 0) / photos.length : d);
  const pB = avg("brightness", 0.5), pS = avg("saturation", 0.3), pWr = avg("warmth", 0), pC = avg("contrast", 0.2);
  const pE = clamp(pC * 1.5 + pS * 0.5, 0, 1);
  const pW = clamp(pWr * 4, -1, 1);

  /* --- текст --- */
  const tHasE0 = text && (text.hits.loud.length + text.hits.quiet.length) > 0;
  const tHasW0 = text && (text.hits.warm.length + text.hits.cold.length) > 0;
  // отметка дня в одно касание (как в Daylio) работает как короткая запись
  let tE = text?.energy ?? 0.5, tW = text?.warmth ?? 0;
  if (feel) { tE = tHasE0 ? (tE + feel.e) / 2 : feel.e; tW = tHasW0 ? (tW + feel.w) / 2 : feel.w; }
  const tHasE = tHasE0 || !!feel, tHasW = tHasW0 || !!feel;

  /* --- музыка --- */
  const mE = prof ? prof.energy : 0.5;
  const mW = prof ? (prof.valence - 0.5) * 2 : 0;

  const E = prof
    ? tHasE ? 0.45 * mE + 0.35 * tE + 0.2 * pE : 0.65 * mE + 0.35 * pE
    : tHasE ? 0.6 * tE + 0.4 * pE : pE;
  const W = tHasW ? 0.45 * tW + 0.3 * mW + 0.25 * pW : 0.55 * mW + 0.45 * pW;
  const night = text?.time?.id === "ночь" || pB < 0.3;
  const mute = prof && prof.energy < 0.42 && prof.valence < 0.48;
  const year = prof?.year || null;
  const age = year ? NOW - year : 0;
  const film = age >= 35 || night;
  /* Главный приём дня — по двум осям. Плёнка накладывается поверх (старая песня или ночь). */
  const technique = E >= 0.55 ? (W >= 0.1 ? "matisse" : "kandinsky") : W > 0.02 ? "monet" : "minimal";
  const monet = technique === "monet", kandinsky = technique === "kandinsky";
  const matisse = technique === "matisse", minimal = technique === "minimal";

  /* --- цвет --- */
  // холодный день гасит цвет: чем холоднее, тем ближе к сине-серому
  const satMul = (mute ? 0.55 : lerp(0.7, 1.2, E)) * (W < 0 ? 1 + W * 0.55 : 1);
  const shift = (c) => {
    const x = rgb2hsl(c);
    x.h = towards(x.h, W >= 0 ? 32 : 212, Math.abs(W) * 34);
    x.s = clamp(x.s * satMul, 0, 0.85);
    return x;
  };
  const sorted = [...pal];
  const main = shift(sorted[0]);
  const second = shift(sorted[1] || sorted[0]);
  const accent = shift([...pal].sort((a, b) => rgb2hsl(b).s - rgb2hsl(a).s)[0]);

  let groundL = lerp(0.13, 0.66, pB) * (night ? 0.55 : 1);
  if (monet) groundL = Math.max(groundL, 0.5);
  if (matisse) groundL = clamp(groundL, 0.58, 0.72);   // яркий день: светлый, насыщенный лист
  const ground = { h: matisse ? accent.h : main.h, s: matisse ? clamp(accent.s * 0.9, 0.35, 0.6) : main.s * 0.75, l: groundL };
  const field = { h: second.h, s: clamp(second.s * 1.05, 0, 0.5), l: clamp(groundL < 0.45 ? groundL + 0.2 : groundL - 0.15, 0.08, 0.82) };
  const deep = { h: ground.h, s: ground.s * 0.8, l: clamp(groundL * 0.35, 0.04, 0.16) };
  const light = groundL > 0.47;

  /* --- композиция --- */
  const air = lerp(13, 5.5, E);              // поля по краям, %
  const topH = lerp(19, 9, E);               // высота цветового поля, %
  const edge = lerp(3.4, 0.25, E) * (monet ? 1.35 : 1); // мягкость краёв, единиц (1 = 1% ширины)
  const rhythm = prof?.bpm ? clamp((8 * 60) / prof.bpm, 2.2, 8) : lerp(7, 2.4, E);
  const fade = lerp(2.8, 0.35, E);
  const breath = lerp(9, 3.2, E);
  const grain = clamp(0.05 + clamp((age - 10) / 50, 0, 1) * 0.22 + (night ? 0.08 : 0), 0, 0.4);

  /* окно с фото: форма меняется вместе с приёмом, место и пропорции — постоянные */
  const win = {
    side: minimal ? air + 11 : matisse ? air * 0.45 : air,       // боковые поля окна, %
    shift: kandinsky ? 6 : 0,                              // смещение от оси — напряжение
    arch: monet ? 46 : 0,                                  // арка сверху — мягкость
    border: film ? 1.3 : 0,                                // белая кайма отпечатка
    tilt: film ? -1.2 : matisse ? 1.5 : 0                  // лёгкий наклон фотокарточки
  };
  const blobs = [];
  if (matisse) {
    // контраст к светлому фону: глубокий цвет кадра и тёмная версия поля
    const cols = [hsl({ ...main, s: clamp(main.s * 1.4, 0.3, 0.7), l: 0.36 }), hsl({ h: (accent.h + 150) % 360, s: 0.45, l: 0.42 })];
    // вырезки обрамляют окно у краёв листа и лежат под фото, не закрывая его
    for (let i = 0; i < 3; i++) blobs.push({ x: i % 2 ? 74 + rnd() * 14 : -8 + rnd() * 12, y: [16, 52, 74][i] + rnd() * 10, d: 20 + rnd() * 14, r: Math.round(rnd() * 360), color: cols[i % 2], shape: ["58% 42% 63% 37% / 45% 55% 45% 55%", "40% 60% 35% 65% / 60% 40% 60% 40%", "50% 50% 70% 30% / 35% 65% 35% 65%"][i] });
  }
  const photoSvg = monet ? "af-monet" : kandinsky ? "af-poster" : minimal ? "af-ink" : film ? "af-film" : null;

  const lines = [];
  let circle = null;
  if (kandinsky) {
    const n = clamp(2 + Math.round((E - 0.6) * 8), 2, 4);
    for (let i = 0; i < n; i++) lines.push({ y: 12 + rnd() * 70, a: (rnd() - 0.5) * 50, w: 0.18 + rnd() * 0.25 });
    circle = { x: 55 + rnd() * 25, y: 18 + rnd() * 30, d: 10 + rnd() * 10, color: hsl({ ...accent, s: clamp(accent.s * 1.1, 0.25, 0.6), l: 0.55 }) };
  }

  const photoFilter = [
    `saturate(${satMul.toFixed(2)})`,
    `contrast(${(1 + (E - 0.5) * 0.4).toFixed(2)})`,
    `brightness(${(1 + (W > 0 ? W * 0.05 : W * 0.06) - (night ? 0.05 : 0)).toFixed(2)})`,
    `sepia(${((W > 0 ? W * 0.22 : 0) + (film ? 0.1 : 0)).toFixed(2)})`
  ].join(" ");

  /* --- объяснения --- */
  const words = (arr) => arr.slice(0, 3).map((w) => `«${w}»`).join(", ");
  const r2 = (v) => v.toFixed(2);
  if (feel) ex.push({ k: "Отметка дня", v: `Вы отметили «${feel.label}» — это задаёт энергию и тепло вместе с песней и фото.` });
  ex.push({ k: "Основа", v: "Поле цвета в духе Ротко: день становится картиной своего света. Без нажатия он размыт, как память." });
  ex.push({ k: "Палитра", v: photos.length ? `Взята из ваших фото: ${pal.length} главных цвета кадров.` : "Добавьте фото — цвет дня возьмётся из них.", swatches: pal.map((c) => `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`) });
  if (photos.length) ex.push({ k: "Фон", v: night ? "Тёмный: в тексте ночь или кадры тёмные." : pB > 0.55 ? "Светлый: кадры светлые, много дневного света." : "Средний тон по общей яркости кадров." });
  if (prof) {
    ex.push({ k: "Края", v: E < 0.45 ? `Мягкие, растушёванные: спокойная энергия дня (${r2(E)}), песня ${song.genre ? `в жанре «${song.genre}»` : "неспешная"}.` : E > 0.6 ? `Чёткие, резкие: высокая энергия (${r2(E)}) — музыка и события плотные.` : `Средней мягкости: энергия ${r2(E)}.` });
    ex.push({ k: "Ритм", v: `Кадр сменяется каждые ${rhythm.toFixed(1)} с${prof.bpm ? ` — 8 ударов при темпе ${prof.bpm} BPM` : ` — по энергии песни (${prof.source})`}; переход ${fade.toFixed(1)} с.` });
  }
  ex.push({ k: "Воздух", v: E < 0.45 ? "Много пустого пространства вокруг — день был неспешным." : "Плотная сетка, мало полей — день был насыщенным." });
  const tw = text ? (W >= 0 ? text.hits.warm : text.hits.cold) : [];
  ex.push({ k: "Температура", v: `${W >= 0.08 ? "Тёплый сдвиг к охре" : W <= -0.08 ? "Холодный сдвиг к сине-серому" : "Нейтральная"}${tw.length ? `: в тексте ${words(tw)}` : ""}${prof ? `; песня ${mW >= 0 ? "светлая" : "сумрачная"} по звучанию` : ""}.` });
  if (mute) ex.push({ k: "Приглушённость", v: "Медленная и сумрачная песня даёт приглушённые цвета." });
  if (matisse) ex.push({ k: "Приём: Матисс", v: "Яркий тёплый день — вырезки цвета из ваших фото, окно во всю ширину, кадр чуть наклонён, как наклеенный." });
  if (minimal) ex.push({ k: "Приём: японский минимализм", v: "Тихий прохладный день — маленькое окно, много пустоты, фото приглушено почти до туши." });
  if (monet) ex.push({ k: "Приём: Моне", v: "Тёплый неспешный день — окно-арка, светлый фон, фото дрожит мазками, мягкий свет." });
  if (kandinsky) ex.push({ k: "Приём: Кандинский", v: "Насыщенный напряжённый день — окно смещено, фото сведено к плоским тонам, линии и круг акцентного цвета." });
  if (film) ex.push({ k: "Приём: плёнка", v: age >= 35 ? `Песне ${age} лет — день печатается как старая карточка: кайма, выцветшие тени, зерно.` : "Ночной день — кайма отпечатка, выцветшие тени и зерно." });
  ex.push({ k: "Голос", v: E < 0.45 ? "Озвучка медленнее и тише по тону." : "Озвучка живее и быстрее." });

  const label = E < 0.5 ? (W >= 0 ? "тихое тепло" : "тихая прохлада") : (W >= 0 ? "яркая энергия" : "собранное напряжение");

  return {
    E, W, night, label, film, monet, kandinsky, matisse, minimal, mute, technique, win, blobs, photoSvg,
    fieldInk: field.l > 0.55 ? "rgba(29,26,23,.82)" : "rgba(246,242,235,.92)",
    ground: hsl(ground), field: hsl(field), main: hsl(main), deep: hsl(deep), accent: hsl(accent),
    ink: light ? "#1d1a17" : "#f2eee7", inkSoft: light ? "rgba(29,26,23,.6)" : "rgba(242,238,231,.62)",
    air, topH, edge, rhythm, fade, breath, grain,
    lines, circle, photoFilter,
    tint: W < 0 ? "#3b587e" : "#de8f4c", tintOpacity: Math.abs(W) * 0.3,
    voice: { rate: lerp(0.82, 1.12, E), pitch: clamp(1 + W * 0.08 - (night ? 0.05 : 0), 0.7, 1.3) },
    explain: ex
  };
}
