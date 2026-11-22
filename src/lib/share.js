/* «Приватно по умолчанию, красиво наружу»: дневник закрыт, но любой день можно выложить
   как пост 4:5, сторис 9:16 или 15-секундное видео, где день проявляется под фрагмент своей песни.
   Музыка — только официальный 30-сек фрагмент или собственный файл пользователя. */
import { renderPoster } from "./export";
import { fmtDate } from "./store";

const loadBitmap = async (blob) => createImageBitmap(blob);

export async function renderPost(day, s) {
  return renderPoster(day, s, 0);
}

/* сторис: та же картина + полоса с песней внизу */
function drawStoryChrome(x, W, H, day, s, k = 1) {
  x.fillStyle = s.ground; x.fillRect(0, 0, W, H);
  x.fillStyle = s.inkSoft; x.textBaseline = "top";
  x.font = `${24 * k}px "JetBrains Mono", monospace`;
  x.fillText("AFTERFEEL", 72 * k, 96 * k);
  if (day.song) {
    x.fillStyle = s.ink; x.textBaseline = "alphabetic";
    x.font = `italic ${46 * k}px "Cormorant Garamond", serif`;
    x.fillText(`♪ ${day.song.title}`.slice(0, 40), 72 * k, H - 150 * k);
    x.fillStyle = s.inkSoft;
    x.font = `${24 * k}px "JetBrains Mono", monospace`;
    x.fillText(`${day.song.artist}${day.song.year ? ` · ${day.song.year}` : ""}`.toUpperCase().slice(0, 48), 72 * k, H - 100 * k);
  }
}

export async function renderStory(day, s) {
  await document.fonts.ready;
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  drawStoryChrome(x, W, H, day, s);
  x.drawImage(await loadBitmap(await renderPoster(day, s, 0)), 0, 285, 1080, 1350);
  return new Promise((r) => c.toBlob(r, "image/png"));
}

async function songBuffer(ctx, song) {
  try {
    const data = song.blob ? await song.blob.arrayBuffer() : song.preview ? await (await fetch(song.preview)).arrayBuffer() : null;
    return data ? await ctx.decodeAudioData(data) : null;
  } catch { return null; }
}

export function videoMime() {
  const list = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
}

/* Видео 15 с, 9:16: память размыта → проявляется → кадры сменяются в ритме песни. */
export async function renderVideo(day, s, onProgress) {
  await document.fonts.ready;
  const W = 720, H = 1280, k = W / 1080, DUR = 15;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const frames = [];
  for (let i = 0; i < Math.max(1, day.photos.length); i++) frames.push(await loadBitmap(await renderPoster(day, s, i)));

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ctx.createMediaStreamDestination();
  const buf = day.song ? await songBuffer(ctx, day.song) : null;
  const stream = c.captureStream(30);
  if (buf) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const mime = videoMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => { rec.onstop = r; });

  const rhythm = Math.min(4, Math.max(2.2, s.rhythm));
  const fade = Math.min(1.2, Math.max(0.3, s.fade));
  const py = 285 * k, pw = W, ph = 1350 * k;
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));

  function draw(t) {
    drawStoryChrome(x, W, H, day, s, k);
    const reveal = ease((t - 1.2) / 3.2);              // 1.2–4.4 с: проявление
    const blur = (1 - reveal) * 26 + (t > DUR - 1.2 ? (t - (DUR - 1.2)) * 8 : 0);
    const after = Math.max(0, t - 4.4);
    const n = frames.length;
    const i = Math.floor(after / rhythm) % n;
    const local = after % rhythm;
    const mixNext = n > 1 && local > rhythm - fade ? (local - (rhythm - fade)) / fade : 0;
    x.save();
    x.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "none";
    x.globalAlpha = 1;
    x.drawImage(frames[i], 0, py, pw, ph);
    if (mixNext) { x.globalAlpha = mixNext; x.drawImage(frames[(i + 1) % n], 0, py, pw, ph); }
    x.restore();
    if (t > DUR - 0.8) { x.fillStyle = s.ground; x.globalAlpha = (t - (DUR - 0.8)) / 0.8; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
  }

  draw(0);
  rec.start(250);
  let src = null;
  if (buf) {
    src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.5);
    g.gain.setValueAtTime(0.9, ctx.currentTime + DUR - 2);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + DUR);
    src.connect(g).connect(dest);
    src.start(0, Math.min(3, Math.max(0, buf.duration - DUR - 0.5)));
  }
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      draw(Math.min(t, DUR));
      onProgress?.(Math.min(1, t / DUR));
      if (t >= DUR) return resolve();
      setTimeout(tick, 1000 / 30); // таймер, а не rAF: запись не замирает, если вкладку свернули
    };
    tick();
  });
  rec.stop();
  src?.stop();
  await done;
  ctx.close().catch(() => {});
  const type = (mime || "video/webm").split(";")[0];
  return { blob: new Blob(chunks, { type }), hasSound: !!buf };
}

export function captionFor(day, s) {
  const lines = [day.title, fmtDate(day.date)];
  if (day.song) lines.push(`♪ ${day.song.title} — ${day.song.artist}`);
  lines.push("", "Afterfeel — дневник, который проявляется");
  return lines.join("\n");
}

/* На телефоне — системное «Поделиться» (Instagram, Telegram, WhatsApp), на компьютере — скачивание. */
export async function shareFile(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return "shared"; }
    catch (e) { if (e.name === "AbortError") return "cancel"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}
