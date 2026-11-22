/* Стикеры для экспорта (книга, пост, сторис, видео): те же типы и тот же вид приёма, что и на экране. */
import { autoCompose, slotsFor, stickerInfo, stickerSkin } from "./stickers";

export const stickersOf = (day, s) => day.stickers ?? autoCompose(day, s, 0);

const SKINS = {
  monet: { bg: "#f6f1e7", fg: "#1d1a17", r: 1.6, shadow: true },
  matisse: { bg: null, fg: "#ffffff", r: 5, shadow: false },
  kandinsky: { bg: "#111111", fg: "#eeeeee", r: 0, shadow: false, stroke: "rgba(255,255,255,.5)" },
  minimal: { bg: null, fg: null, r: 0, shadow: false, bare: true }
};

function loadCors(url, ms = 2500) {
  return new Promise((res) => {
    if (!url) return res(null);
    const i = new Image();
    i.crossOrigin = "anonymous";
    const t = setTimeout(() => res(null), ms);
    i.onload = () => { clearTimeout(t); res(i); };
    i.onerror = () => { clearTimeout(t); res(null); };
    i.src = url;
  });
}

function box(x, w, h, sk, bg, u) {
  if (sk.bare) return;
  x.save();
  if (sk.shadow) { x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 2 * u; x.shadowOffsetY = 0.6 * u; }
  x.fillStyle = bg;
  x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, sk.r * u); x.fill();
  x.restore();
  if (sk.stroke) { x.strokeStyle = sk.stroke; x.lineWidth = 1; x.strokeRect(-w / 2, -h / 2, w, h); }
}

function lines(x, text, maxW) {
  const out = [];
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? line + " " + w : w;
    if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  out.push(line);
  return out;
}

async function drawOne(x, type, info, skin, s, u) {
  const sk = SKINS[skin];
  const bg = sk.bg || info.color;
  const fg = sk.fg || s.ink;
  const serif = skin === "kandinsky" ? '"JetBrains Mono", monospace' : '"Cormorant Garamond", serif';

  if (type === "song" && info.song) {
    const title = info.song.title.length > 24 ? info.song.title.slice(0, 23) + "…" : info.song.title;
    const cover = (skin === "minimal" ? 5 : 8) * u;
    x.font = `${skin === "kandinsky" ? "" : "italic "}500 ${(skin === "minimal" ? 2.2 : skin === "kandinsky" ? 2 : 2.8) * u}px ${serif}`;
    const tw = Math.max(x.measureText(title).width, 14 * u);
    const w = cover + tw + 4.4 * u, h = cover + 2.2 * u;
    box(x, w, h, sk, bg, u);
    const cx = -w / 2 + 1.1 * u + cover / 2;
    const art = await loadCors(info.song.artwork);
    x.save();
    x.beginPath();
    if (skin === "kandinsky") x.rect(cx - cover / 2, -cover / 2, cover, cover); else x.arc(cx, 0, cover / 2, 0, 7);
    x.clip();
    if (art) x.drawImage(art, cx - cover / 2, -cover / 2, cover, cover);
    else { x.fillStyle = "#2a2622"; x.fill(); x.fillStyle = info.color; x.beginPath(); x.arc(cx, 0, cover * 0.18, 0, 7); x.fill(); }
    x.restore();
    if (skin !== "kandinsky" && skin !== "minimal") { x.strokeStyle = "#1d1a17"; x.lineWidth = 0.9 * u; x.beginPath(); x.arc(cx, 0, cover / 2 + 0.45 * u, 0, 7); x.stroke(); }
    x.fillStyle = fg; x.textBaseline = "alphabetic";
    const tx = cx + cover / 2 + 1.4 * u;
    x.fillText(skin === "kandinsky" ? title.toUpperCase() : title, tx, -0.2 * u);
    x.globalAlpha = 0.65; x.font = `${1.5 * u}px "JetBrains Mono", monospace`;
    x.fillText(info.song.artist.toUpperCase().slice(0, 28), tx, 2.2 * u);
    x.globalAlpha = 1;
    return;
  }

  if (type === "quote" && info.quote) {
    const size = (skin === "kandinsky" ? 1.9 : skin === "minimal" ? 2.6 : 3.1) * u;
    x.font = skin === "kandinsky" ? `${size}px "JetBrains Mono", monospace` : `500 ${size}px "Caveat", cursive`;
    const txt = skin === "kandinsky" ? info.quote.toUpperCase() : info.quote;
    const ls = lines(x, txt, 30 * u);
    const w = Math.max(...ls.map((l) => x.measureText(l).width)) + 4 * u, h = ls.length * size * 1.1 + 3.8 * u;
    box(x, w, h, sk, sk.bg ? (skin === "monet" ? "#fbf6e9" : sk.bg) : bg, u);
    if (skin === "monet") { x.fillStyle = "rgba(240,225,190,.75)"; x.save(); x.rotate(-0.07); x.fillRect(-5 * u, -h / 2 - 1.2 * u, 10 * u, 2.6 * u); x.restore(); }
    if (skin === "kandinsky") { x.fillStyle = info.color; x.fillRect(-5 * u, -h / 2 - 0.5 * u, 10 * u, 1 * u); }
    x.fillStyle = skin === "monet" ? "#2a2520" : fg; x.textBaseline = "middle";
    ls.forEach((l, i) => x.fillText(l, -w / 2 + 2 * u, (i - (ls.length - 1) / 2) * size * 1.1 + 0.3 * u));
    return;
  }

  if (type === "stamp") {
    x.textBaseline = "middle";
    if (s.film || skin === "minimal") {
      x.save();
      x.fillStyle = "#ff8a2a"; x.shadowColor = "rgba(255,110,30,.9)"; x.shadowBlur = 1.6 * u;
      x.font = `${3.2 * u}px "JetBrains Mono", monospace`; x.textAlign = "right";
      x.fillText(info.led, 8 * u, 0);
      if (info.time) { x.font = `${1.9 * u}px "JetBrains Mono", monospace`; x.fillText(info.time, 8 * u, 3 * u); }
      x.restore();
      return;
    }
    if (skin === "kandinsky") {
      x.font = `${2.2 * u}px "JetBrains Mono", monospace`;
      const t = `${info.led.replace("'", "")} ${info.time || ""}`.trim();
      const w = x.measureText(t).width + 3.2 * u;
      box(x, w, 4.4 * u, sk, bg, u);
      x.fillStyle = fg; x.textAlign = "center"; x.fillText(t, 0, 0); x.textAlign = "start";
      return;
    }
    const col = skin === "matisse" ? "#ffffff" : "#8e3b2a";
    if (skin === "matisse") { x.fillStyle = info.color; x.beginPath(); x.arc(0, 0, 7.5 * u, 0, 7); x.fill(); }
    x.strokeStyle = col; x.lineWidth = 0.45 * u;
    x.beginPath(); x.arc(0, 0, 7.2 * u, 0, 7); x.stroke();
    x.lineWidth = 0.25 * u; x.beginPath(); x.arc(0, 0, 8.2 * u, 0, 7); x.stroke();
    x.fillStyle = col; x.textAlign = "center";
    x.font = `500 ${5.2 * u}px "Cormorant Garamond", serif`; x.fillText(String(info.dayNum), 0, -1 * u);
    x.font = `${1.4 * u}px "JetBrains Mono", monospace`; x.fillText(`${info.month} ${info.year}`, 0, 2.8 * u);
    if (info.time) x.fillText(info.time, 0, 4.6 * u);
    x.textAlign = "start";
    return;
  }

  if (type === "palette") {
    const n = info.swatches.length || 1, sq = 3.6 * u, gap = 0.5 * u;
    const w = n * sq + (n - 1) * gap + 2.6 * u, h = sq + 4.4 * u;
    box(x, w, h, sk, bg, u);
    info.swatches.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.roundRect(-w / 2 + 1.3 * u + i * (sq + gap), -h / 2 + 1.1 * u, sq, sq, 0.4 * u); x.fill(); });
    x.fillStyle = fg; x.globalAlpha = 0.65; x.font = `${1.4 * u}px "JetBrains Mono", monospace`; x.textBaseline = "alphabetic";
    x.fillText("ПАЛИТРА ДНЯ", -w / 2 + 1.3 * u, h / 2 - 1 * u);
    x.globalAlpha = 1;
    return;
  }

  if (type === "ticket") {
    const title = info.title.length > 26 ? info.title.slice(0, 25) + "…" : info.title;
    x.font = `${skin === "kandinsky" ? "" : "italic "}500 ${(skin === "kandinsky" ? 2 : 2.6) * u}px ${serif}`;
    const w = Math.max(x.measureText(skin === "kandinsky" ? title.toUpperCase() : title).width, 16 * u) + 6 * u, h = 9 * u, r = 1.6 * u;
    if (!sk.bare) {
      x.save();
      x.fillStyle = skin === "monet" ? "#f3e6cf" : bg;
      if (sk.shadow) { x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 1.6 * u; x.shadowOffsetY = 0.5 * u; }
      x.beginPath();
      x.moveTo(-w / 2, -h / 2); x.lineTo(w / 2, -h / 2); x.lineTo(w / 2, -r);
      x.arc(w / 2, 0, r, -Math.PI / 2, Math.PI / 2, true);
      x.lineTo(w / 2, h / 2); x.lineTo(-w / 2, h / 2); x.lineTo(-w / 2, r);
      x.arc(-w / 2, 0, r, Math.PI / 2, -Math.PI / 2, true);
      x.closePath(); x.fill();
      x.restore();
    }
    x.fillStyle = skin === "monet" ? "#2a2017" : fg; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(skin === "kandinsky" ? title.toUpperCase() : title, 0, 0);
    x.font = `${1.4 * u}px "JetBrains Mono", monospace`;
    x.fillText(`ВХОД${info.time ? ` · ${info.time}` : ""}`, 0, -h / 2 + 1.6 * u);
    x.fillText(`№ ${String(info.doy).padStart(3, "0")}`, 0, h / 2 - 1.5 * u);
    x.textAlign = "start";
  }
}

export async function drawStickers(x, day, s, W, H) {
  const list = stickersOf(day, s);
  if (!list.length) return;
  const info = stickerInfo(day, s), skin = stickerSkin(s), u = W / 100, slots = slotsFor(s);
  for (const st of list) {
    const sl = slots.find((v) => v.id === st.slot) || slots[0];
    x.save();
    x.translate((sl.x / 100) * W, (sl.y / 100) * H);
    x.rotate(((st.tilt || 0) * Math.PI) / 180);
    await drawOne(x, st.type, info, skin, s, u);
    x.restore();
  }
}
