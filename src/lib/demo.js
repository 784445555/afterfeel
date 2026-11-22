/* Пример года: 8 разных дней. Фото — Unsplash, песни — официальные 30-сек фрагменты iTunes.
   Часть дней записана текстом, часть — только фото и отметкой в одно касание (как и бывает в жизни).
   Настроение вручную не задаётся: всё считает система. */
import { prepPhoto, urlToBlob } from "./photo";
import { searchSongs } from "./music";
import { analyzeText } from "./text";
import { computeStyle } from "./style";
import { feelById, titleFor } from "./feel";
import { uid, todayISO } from "./store";

const U = (id) => `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format&fit=crop`;

const DEMO = [
  { ago: 290, song: "Ludovico Einaudi Nuvole Bianche", feel: "calm",
    text: "Первый снег этой зимы. Утро тихое-тихое, всё белое. Долго лежал под пледом с чаем и смотрел, как медленно падают хлопья.",
    photos: ["1418985991508-e47386d96a71", "1445543949571-ffc3e0e2f55e", "1544027993-37dbfe43562a"] },
  { ago: 210, song: "Pharrell Williams Happy", feel: "joy", text: "",
    photos: ["1529156069898-49953e39b3ac", "1511632765486-a01980e01a18", "1508739773434-c26b3d09e071"] },
  { ago: 160, song: "Imagine Dragons On Top of the World", feel: "full", text: "Первый день отпуска: поднялись к озеру в горах, вода бирюзовая, ветер, всё новое.",
    photos: ["1501785888041-af3ef285b470", "1506905925346-21bda4d32df4", "1470071459604-3b5ec3a7fe05"] },
  { ago: 130, song: "Dua Lipa Levitating", feel: null,
    text: "Поехали с друзьями к морю. Солнце, смех, бежали в воду, вечером смотрели закат и танцевали прямо на песке. Счастье.",
    photos: ["1507525428034-b723cf961d3e", "1500534314209-a25ddb2bd429", "1469474968028-56623f02e42e"] },
  { ago: 95, song: "Hans Zimmer Cornfield Chase", feel: null,
    text: "Поднялись в горы и остались до ночи. Холодно, ветер, но над нами были звёзды, каких я никогда не видел. Было немного одиноко и очень спокойно.",
    photos: ["1519681393784-d120267933ba", "1473448912268-2022ce9509d8", "1441974231531-c6227db76b6e"] },
  { ago: 40, song: "Norah Jones Don't Know Why", feel: "grey", text: "",
    photos: ["1515694346937-94d85e41e6f0", "1509042239860-f550ce710b93", "1480714378408-67cf0d13bc1b"] },
  { ago: 26, song: "Frank Sinatra Autumn Leaves", feel: "warm",
    text: "Гуляли по парку, всё в жёлтых листьях, было холодно, но мы пили какао и долго разговаривали. Свет был низкий и тёплый.",
    photos: ["1476820865390-c52aeebb9891", "1507371341162-763b5e419408", "1495474472287-4d71bcdd2085"] },
  { ago: 19, song: "Kiasmos Blurred", feel: "tense",
    text: "Срочная сдача проекта, ночь в офисе. В наушниках электронная музыка, кофе остыл, за окном мокрый город. Нервы, дедлайн, но собрались и успели.",
    photos: ["1504384308090-c894fdcc538d", "1517336714731-489689fd1ca8", "1534447677768-be436bb09401"] }
];

export async function buildDemo(onStep) {
  const out = [];
  for (const [i, d] of DEMO.entries()) {
    onStep?.(i + 1, DEMO.length);
    const photos = (await Promise.all(d.photos.map((id) => urlToBlob(U(id)).then(prepPhoto).catch(() => null)))).filter(Boolean);
    const song = (await searchSongs(d.song, 3).catch(() => []))[0] || null;
    const date = new Date(); date.setDate(date.getDate() - d.ago);
    const iso = todayISO(date);
    const id = uid();
    const feel = feelById(d.feel);
    const s = computeStyle({ text: analyzeText(d.text), photos, song, seed: id, feel });
    out.push({
      id, createdAt: date.getTime(), date: iso, text: d.text, feel: d.feel,
      title: titleFor({ text: d.text, date: iso, feel, style: s }), titleAuto: true, photos, song
    });
  }
  return out;
}
