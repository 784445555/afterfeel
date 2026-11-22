/* «Папка дня»: zip с названием дня — запись, фото, песня, готовое воспоминание (PNG) и параметры озвучки. */
import JSZip from "jszip";
import { fmtDate } from "./store";
import { quoteOf } from "./text";
import { drawStickers, stickersOf } from "./stickerCanvas";

function loadImg(blob) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(blob);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); res(i); };
    i.onerror = rej;
    i.src = u;
  });
}

/* Тот же макет, что и на экране (Painting.jsx), в «проявленном» состоянии — для книги, сторис, видео и папки дня. */
export async function renderPoster(day, s, idx = 0, { quote = true } = {}) {
  await document.fonts.ready;
  try { await document.fonts.load('500 40px "Caveat"'); } catch { /* шрифт необязателен */ }
  const W = 1080, H = 1350, u = W / 100;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = s.ground; x.fillRect(0, 0, W, H);

  // Матисс: вырезки цвета лежат под окном у краёв листа
  for (const b of s.blobs || []) {
    const size = (b.d / 100) * W;
    x.save(); x.globalAlpha = 0.9; x.fillStyle = b.color;
    x.translate((b.x / 100) * W + size / 2, (b.y / 100) * H + size / 2); x.rotate((b.r * Math.PI) / 180);
    x.beginPath(); x.ellipse(0, 0, size / 2, size * 0.44, 0, 0, 7); x.fill(); x.restore();
  }

  const L = (s.air / 100) * W, R = W - L;
  const fTop = H * ((s.air + 4) / 100), fH = H * (s.topH / 100);
  x.save(); x.filter = `blur(${s.edge * u}px)`; x.fillStyle = s.field; x.fillRect(L, fTop, R - L, fH); x.restore();

  const { side, shift, arch, border, tilt } = s.win;
  const wl = (W * (side + shift)) / 100, wr = W - (W * Math.max(0, side - shift)) / 100;
  const wTop = H * ((s.air + 4 + s.topH + 2.5) / 100), wBot = H * (1 - (s.air + 13) / 100);
  const bw = Math.round(wr - wl), bh = Math.round(wBot - wTop);

  const img = await loadImg(day.photos[idx % day.photos.length].blob);
  const bx = border * u, byT = border * u, byB = border * u * 3.2;
  const pw = Math.round(bw - bx * 2), ph = Math.round(bh - byT - byB);
  const photo = document.createElement("canvas");
  photo.width = pw; photo.height = ph;
  const pc = photo.getContext("2d");
  const r = img.width / img.height;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (r > pw / ph) { sw = sh * (pw / ph); sx = (img.width - sw) / 2; } else { sh = sw / (pw / ph); sy = (img.height - sh) / 2; }
  pc.filter = `${s.photoSvg ? `url(#${s.photoSvg}) ` : ""}${s.photoFilter}`;
  pc.drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);
  pc.filter = "none";
  pc.globalCompositeOperation = "color"; pc.globalAlpha = s.tintOpacity; pc.fillStyle = s.tint; pc.fillRect(0, 0, pw, ph);
  if (s.monet) {
    pc.globalCompositeOperation = "soft-light"; pc.globalAlpha = 1;
    const g = pc.createRadialGradient(pw * 0.3, ph * 0.18, 0, pw * 0.3, ph * 0.18, pw * 0.7);
    g.addColorStop(0, "rgba(255,238,210,.55)"); g.addColorStop(1, "rgba(255,238,210,0)");
    pc.fillStyle = g; pc.fillRect(0, 0, pw, ph);
  }

  const tmp = document.createElement("canvas");
  tmp.width = bw; tmp.height = bh;
  const t = tmp.getContext("2d");
  if (border) { t.fillStyle = "#f2ede3"; t.fillRect(0, 0, bw, bh); }
  t.drawImage(photo, bx, byT);
  t.globalCompositeOperation = "destination-in";
  if (!border) {
    // мягкие края окна — растушёвка маской, само фото остаётся резким
    const fe = Math.max(1, s.edge * u * 1.6);
    for (const [x0, y0, x1, y1, len] of [[0, 0, bw, 0, bw], [0, 0, 0, bh, bh]]) {
      const g = t.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(fe / len, "#000"); g.addColorStop(1 - fe / len, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
      t.fillStyle = g; t.fillRect(0, 0, bw, bh);
    }
  }
  if (arch) {
    const ry = bh * (arch * 0.6) / 100;
    t.fillStyle = "#000"; t.beginPath(); t.roundRect(0, 0, bw, bh, [{ x: bw / 2, y: ry }, { x: bw / 2, y: ry }, 2, 2]); t.fill();
  }
  x.save();
  x.translate(wl + bw / 2, wTop + bh / 2); x.rotate((tilt * Math.PI) / 180);
  if (border) { x.shadowColor = "rgba(0,0,0,.28)"; x.shadowBlur = 2.4 * u; x.shadowOffsetY = 0.8 * u; }
  x.drawImage(tmp, -bw / 2, -bh / 2);
  x.restore();

  x.strokeStyle = s.ink; x.globalAlpha = 0.55;
  for (const l of s.lines) {
    x.save(); x.translate(W / 2, H * (l.y / 100)); x.rotate((l.a * Math.PI) / 180);
    x.lineWidth = l.w * u; x.beginPath(); x.moveTo(-W * 0.7, 0); x.lineTo(W * 0.7, 0); x.stroke(); x.restore();
  }
  x.globalAlpha = 1;
  if (s.circle) {
    x.save(); x.globalAlpha = 0.82; x.fillStyle = s.circle.color;
    x.beginPath(); x.arc(W * (s.circle.x / 100), H * (s.circle.y / 100), (s.circle.d / 2) * u, 0, 7); x.fill(); x.restore();
  }

  // зерно
  x.save();
  x.globalCompositeOperation = "overlay";
  x.globalAlpha = Math.min(1, s.grain * 2.2);
  x.fillStyle = x.createPattern(noiseTile(), "repeat");
  x.fillRect(0, 0, W, H);
  x.restore();
  if (s.film) {
    const v = x.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.32)");
    x.fillStyle = v; x.fillRect(0, 0, W, H);
  }

  // рукописная подпись — самая живая фраза записи, в поле цвета
  const q = quote && !stickersOf(day, s).some((t) => t.type === "quote") ? quoteOf(day.text) : "";
  if (q) {
    const qs = (q.length > 55 ? 3.3 : q.length > 35 ? 3.8 : 4.4) * u;
    x.save();
    x.fillStyle = s.fieldInk; x.font = `500 ${qs}px "Caveat", cursive`; x.textBaseline = "middle";
    x.translate(L + 3 * u, fTop + fH / 2); x.rotate((-1.5 * Math.PI) / 180);
    const lines = splitLines(x, q, R - L - 6 * u);
    lines.forEach((ln, i) => x.fillText(ln, 0, (i - (lines.length - 1) / 2) * qs * 1.05));
    x.restore();
  }

  x.fillStyle = s.inkSoft; x.font = `${2.1 * u}px "JetBrains Mono", monospace`; x.textBaseline = "top";
  x.fillText(fmtDate(day.date).toUpperCase(), L, H * (s.air / 100) * 0.45);
  x.fillStyle = s.ink; x.font = `italic 500 ${5.4 * u}px "Cormorant Garamond", serif`; x.textBaseline = "alphabetic";
  wrap(x, day.title, L, H - H * ((s.air * 0.6) / 100), R - L, 5.8 * u);

  // стикеры из дня — поверх всего, как на экране
  await drawStickers(x, day, s, W, H);

  return new Promise((res) => c.toBlob(res, "image/png"));
}

function splitLines(x, text, maxW) {
  const out = [];
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? line + " " + w : w;
    if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  out.push(line);
  return out;
}

let tile = null;
function noiseTile() {
  if (tile) return tile;
  tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const t = tile.getContext("2d"), img = t.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 140;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  return tile;
}

function wrap(x, text, left, bottom, maxW, lh) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  lines.reverse().forEach((l, i) => x.fillText(l, left, bottom - i * lh));
}

const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, "").trim() || "День";

export async function exportFolder(day, s) {
  const { name, blob } = await buildDayZip(day, s);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* папка дня как zip: запись, фото, песня (ссылка или свой файл), воспоминание, параметры голоса и правила */
export async function buildDayZip(day, s) {
  const zip = new JSZip();
  const name = safe(`${day.date} — ${day.title}`);
  const f = zip.folder(name);
  f.file("запись.txt", `${day.title}\n${fmtDate(day.date)}\n\n${day.text}\n`);
  day.photos.forEach((p, i) => f.file(`фото-${i + 1}.jpg`, p.blob));
  f.file("воспоминание.png", await renderPoster(day, s, day.photos.length > 1 ? 0 : 0));
  const so = day.song;
  if (so?.blob) f.file(`песня-${safe(so.title)}.${(so.blob.name || "audio.mp3").split(".").pop()}`, so.blob);
  // чужую музыку не сохраняем — только ссылка на официальный сервис
  f.file("песня.txt", so ? `${so.title} — ${so.artist}\n${so.genre || ""} ${so.year || ""}\n${so.link || ""}\n` : "");
  f.file("день.json", JSON.stringify({
    title: day.title, date: day.date, atmosphere: s.label,
    energy: +s.E.toFixed(2), warmth: +s.W.toFixed(2),
    voice: { rate: +s.voice.rate.toFixed(2), pitch: +s.voice.pitch.toFixed(2) },
    why: s.explain.map((e) => `${e.k}: ${e.v}`)
  }, null, 2));
  return { name, blob: await zip.generateAsync({ type: "blob" }) };
}
