/* Текст дня -> две оси (энергия, тепло) + смысловые детали для названия.
   Совпадение по началу слова, чтобы «лет» не находилось внутри «полетели». */

const norm = (s = "") => String(s).toLowerCase().replace(/ё/g, "е");
const tokens = (s) => norm(s).split(/[^\p{L}\p{N}-]+/u).filter(Boolean);

const LEX = {
  loud: ["срочн", "дедлайн", "сдач", "спеш", "бег", "бежал", "шум", "толп", "концерт", "танц", "вечеринк", "драйв",
    "адреналин", "гонк", "громк", "кричал", "аврал", "нерв", "стресс", "суета", "суетн", "много", "быстр", "экзамен",
    "deadline", "rush", "party", "dance", "loud", "fast", "crowd", "stress"],
  quiet: ["тих", "тишин", "спокой", "медлен", "неспеш", "долго", "лежал", "плед", "какао", "чай", "сон", "спал",
    "дремал", "уют", "разговар", "смотрел", "читал", "книг", "снег", "туман", "утр", "рассвет",
    "quiet", "calm", "slow", "cozy", "tea", "rain", "sleep"],
  warm: ["тепл", "какао", "солнц", "обним", "смех", "смеял", "друз", "любим", "девушк", "мам", "семь", "уют", "вкусн",
    "радост", "счаст", "закат", "свеч", "костер", "лет", "улыб", "нежн", "вместе", "праздн", "подар", "плед", "чай", "звезд",
    "warm", "sun", "hug", "laugh", "friend", "love", "happy", "together"],
  cold: ["холод", "одинок", "один", "устал", "тревог", "стресс", "дедлайн", "офис", "пуст", "груст", "ветер",
    "мокр", "темн", "зло", "боль", "ссор", "плакал", "слез", "мрач", "бессон", "серый", "серая", "серое", "серые", "серо",
    "cold", "alone", "lonely", "tired", "grey", "gray", "sad", "office", "empty"]
};

const SEASONS = [
  { id: "осень", stems: ["осен", "листь", "листопад", "сентябр", "октябр", "ноябр"], adj: { m: "Осенний", f: "Осенняя", n: "Осеннее", p: "Осенние" } },
  { id: "зима", stems: ["зим", "снег", "мороз", "сугроб", "декабр", "январ", "феврал", "каток"], adj: { m: "Зимний", f: "Зимняя", n: "Зимнее", p: "Зимние" } },
  { id: "весна", stems: ["весн", "март", "апрел", "цветен", "подснеж", "капел"], adj: { m: "Весенний", f: "Весенняя", n: "Весеннее", p: "Весенние" } },
  { id: "лето", stems: ["лет", "жар", "пляж", "июн", "июл", "август", "загар"], adj: { m: "Летний", f: "Летняя", n: "Летнее", p: "Летние" } }
];

const TIMES = [
  { id: "утро", stems: ["утр", "рассвет", "проснул"], noun: "Утро", adv: "утром", g: "n" },
  { id: "ночь", stems: ["ноч", "полноч", "бессон"], noun: "Ночь", adv: "ночью", g: "f" },
  { id: "вечер", stems: ["вечер", "закат", "сумерк"], noun: "Вечер", adv: "вечером", g: "m" },
  { id: "день", stems: ["днем", "полдень", "обед"], noun: "День", adv: "днём", g: "m" }
];

const PLACES = [
  { stems: ["парк"], nom: "парк", at: "в парке", g: "m" },
  { stems: ["пруд"], nom: "пруд", at: "у пруда", g: "m" },
  { stems: ["озер"], nom: "озеро", at: "у озера", g: "n" },
  { stems: ["море$", "моря$", "морю$", "морем$", "пляж", "побереж"], nom: "море", at: "у моря", g: "n" },
  { stems: ["офис", "работ"], nom: "офис", at: "в офисе", g: "m" },
  { stems: ["кухн"], nom: "кухня", at: "на кухне", g: "f" },
  { stems: ["горы$", "горах$", "гору$", "горн", "перевал", "вершин"], nom: "горы", at: "в горах", g: "p" },
  { stems: ["лес$", "леса$", "лесу$", "лесн"], nom: "лес", at: "в лесу", g: "m" },
  { stems: ["кафе", "кофейн"], nom: "кафе", at: "в кафе", g: "n" },
  { stems: ["поезд", "вагон"], nom: "поезд", at: "в поезде", g: "m" },
  { stems: ["крыш"], nom: "крыша", at: "на крыше", g: "f" },
  { stems: ["набережн"], nom: "набережная", at: "на набережной", g: "f" },
  { stems: ["степь$", "степи$", "степн"], nom: "степь", at: "в степи", g: "f" },
  { stems: ["дач"], nom: "дача", at: "на даче", g: "f" },
  { stems: ["город", "улиц"], nom: "город", at: "в городе", g: "m" },
  { stems: ["дом", "квартир"], nom: "дом", at: "дома", g: "m" }
];

const PEOPLE = [
  { stems: ["девушк"], with: "с девушкой" }, { stems: ["парн"], with: "с парнем" },
  { stems: ["друз"], with: "с друзьями" }, { stems: ["мам"], with: "с мамой" },
  { stems: ["пап", "отц", "отец"], with: "с папой" }, { stems: ["семь", "родител"], with: "с семьёй" },
  { stems: ["сестр"], with: "с сестрой" }, { stems: ["брат"], with: "с братом" },
  { stems: ["бабушк"], with: "у бабушки" }, { stems: ["собак", "пес"], with: "с собакой" }
];

const OBJECTS = [
  { stems: ["какао"], w: "какао" }, { stems: ["кофе"], w: "кофе" }, { stems: ["чай"], w: "чай" },
  { stems: ["разговор", "разговар", "болтал"], w: "долгие разговоры" }, { stems: ["закат"], w: "закат" },
  { stems: ["звезд"], w: "звёзды" }, { stems: ["костер", "костр"], w: "костёр" }, { stems: ["снег"], w: "первый снег" },
  { stems: ["дожд"], w: "дождь" }, { stems: ["книг"], w: "книга" }, { stems: ["музык", "песн"], w: "музыка" },
  { stems: ["велосипед"], w: "велосипед" }, { stems: ["туман"], w: "туман" }
];

const EVENTS = [
  { stems: ["дедлайн", "сдач"], w: "перед сдачей" }, { stems: ["экзамен"], w: "перед экзаменом" },
  { stems: ["рожден"], w: "в день рождения" }, { stems: ["свадьб"], w: "на свадьбе" }, { stems: ["переезд"], w: "в день переезда" }
];

function hits(toks, stems) {
  const found = [];
  for (const t of toks) if (stems.some((s) => (s.endsWith("$") ? t === s.slice(0, -1) : t.startsWith(s)))) found.push(t);
  return found;
}
const first = (toks, list) => list.find((x) => hits(toks, x.stems).length);

/* «было холодно, но пили какао»: то, что после «но», весит больше — так люди и рассказывают */
function weights(text) {
  const w = new Map();
  for (const sentence of norm(text).split(/[.!?\n]+/)) {
    const parts = sentence.split(/\s(?:но|однако|зато|but)\s/);
    parts.forEach((part, i) => {
      const k = parts.length === 1 ? 1 : i === parts.length - 1 ? 1.4 : 0.6;
      for (const t of tokens(part)) w.set(t, Math.max(w.get(t) || 0, k));
    });
  }
  return w;
}

export function analyzeText(text = "") {
  const toks = tokens(text);
  const wt = weights(text);
  const h = Object.fromEntries(Object.entries(LEX).map(([k, v]) => [k, [...new Set(hits(toks, v))]]));
  const sum = (arr) => arr.reduce((a, t) => a + (wt.get(t) || 1), 0);
  const n = Math.max(1, Math.sqrt(toks.length));
  const energy = clamp(0.5 + ((sum(h.loud) - sum(h.quiet)) / n) * 0.45, 0.05, 0.95);
  const warmth = clamp(((sum(h.warm) - sum(h.cold)) / n) * 0.8, -1, 1);
  return {
    words: toks.length,
    energy, warmth, hits: h,
    season: first(toks, SEASONS) || null,
    time: first(toks, TIMES) || null,
    place: first(toks, PLACES) || null,
    place2: PLACES.filter((x) => hits(toks, x.stems).length)[1] || null,
    people: first(toks, PEOPLE) || null,
    object: first(toks, OBJECTS) || null,
    event: first(toks, EVENTS) || null
  };
}

/* Название дня: 3–7 слов, всегда один тон — «что / где / с кем», без оценок. */
export function makeTitle(a, text = "") {
  if (!a || !a.words) return "";
  const { season, time, place, people, object, event } = a;
  const tail = event?.w || people?.with || (object ? `и ${object.w}` : "");
  let parts = [];

  if (season && place) parts = [`${season.adj[place.g]} ${place.nom}`, tail];
  else if (time && place) parts = [`${time.noun} ${place.at}`, tail];
  else if (place) {
    // «У озера в горах»: два места звучат точнее, чем место + общее слово
    const second = a.place2;
    parts = second ? [cap(place.at), second.at] : [cap(place.at), time ? time.adv : "", tail];
  }
  else if (season && time) parts = [`${season.adj[time.g]} ${time.noun.toLowerCase()}`, tail];
  else if (time) parts = [time.noun, tail];
  else if (season) parts = [cap(season.id), tail];

  let title = parts.filter(Boolean).join(" ").trim();
  let count = title ? title.split(/\s+/).length : 0;

  if (count && count < 3) {
    const extra = time && !title.toLowerCase().includes(time.noun.toLowerCase()) && !title.includes(time.adv) ? time.adv
      : a.warmth > 0.2 ? "и тепло" : a.energy > 0.6 ? "и шум" : a.warmth < -0.2 ? "и тишина внутри" : "и тишина";
    title = `${title} ${extra}`;
    count = title.split(/\s+/).length;
  }
  if (!count) {
    // запасной вариант: первые значимые слова записи
    const w = String(text).replace(/[«»"“”.,!?;:()]/g, " ").split(/\s+/).filter((x) => x.length > 2).slice(0, 5);
    title = w.join(" ");
  }
  const words = title.split(/\s+/).slice(0, 7);
  return cap(words.join(" "));
}

function cap(s = "") { return s ? s[0].toUpperCase() + s.slice(1) : s; }
export function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* Рукописная подпись: самая «живая» фраза записи — где больше всего ощущений, мест и деталей. */
export function quoteOf(text = "") {
  const parts = String(text).split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return "";
  const all = Object.values(LEX).flat();
  const score = (sent) => {
    const t = tokens(sent);
    let n = hits(t, all).length;
    for (const list of [PLACES, SEASONS, TIMES, OBJECTS, PEOPLE]) if (first(t, list)) n += 1;
    return n - Math.max(0, sent.length - 90) / 30;
  };
  let best = parts.reduce((a, b) => (score(b) > score(a) ? b : a));
  if (best.length > 80) {
    const clause = best.split(/,\s*/).reduce((acc, c) => ((acc + ", " + c).length <= 78 ? (acc ? acc + ", " + c : c) : acc), "");
    best = (clause || best.slice(0, 76)) + "…";
  }
  return best.replace(/[.]+$/, "");
}
