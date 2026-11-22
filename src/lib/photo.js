import exifr from "exifr";

/* Фото -> уменьшенный JPEG + палитра (доминирующие цвета) + свет/насыщенность/тепло. */

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function prepPhoto(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const max = 1600;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const out = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
    // урок Google Photos и Polarsteps: дату берём из самого снимка, человеку ничего не нужно вводить
    let takenAt = null;
    try {
      const ex = await exifr.parse(blob, ["DateTimeOriginal", "CreateDate"]);
      takenAt = (ex?.DateTimeOriginal || ex?.CreateDate)?.getTime?.() || null;
    } catch { /* нет EXIF */ }
    return { blob: out, takenAt, fileTime: blob.lastModified || null, ...analyzeImage(img) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function analyzeImage(img) {
  const W = 48, H = 60;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  // cover-кроп под формат 4:5, как в «окне» воспоминания
  const r = img.naturalWidth / img.naturalHeight, t = W / H;
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (r > t) { sw = sh * t; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / t; sy = (img.naturalHeight - sh) / 2; }
  x.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;

  const buckets = new Map();
  let L = 0, S = 0, warm = 0, lums = [];
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i], G = d[i + 1], B = d[i + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
    L += lum; lums.push(lum);
    S += mx ? (mx - mn) / mx : 0;
    warm += (R - B) / 255;
    const key = (R >> 5) * 64 + (G >> 5) * 8 + (B >> 5);
    const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += R; b.g += G; b.b += B; b.n++;
    buckets.set(key, b);
  }
  const mean = L / n;
  const contrast = Math.sqrt(lums.reduce((a, v) => a + (v - mean) ** 2, 0) / n);

  const palette = mergeColors(
    [...buckets.values()].map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, share: b.n / n }))
  ).slice(0, 4);

  return { palette, stats: { brightness: mean, saturation: S / n, warmth: warm / n, contrast } };
}

/* склеиваем близкие цвета, чтобы палитра была из 3–4 настоящих цветов кадра */
export function mergeColors(list, dist = 48) {
  const out = [];
  for (const c of [...list].sort((a, b) => b.share - a.share)) {
    const near = out.find((o) => Math.hypot(o.r - c.r, o.g - c.g, o.b - c.b) < dist);
    if (near) {
      const s = near.share + c.share;
      near.r = (near.r * near.share + c.r * c.share) / s;
      near.g = (near.g * near.share + c.g * c.share) / s;
      near.b = (near.b * near.share + c.b * c.share) / s;
      near.share = s;
    } else out.push({ ...c });
  }
  return out.sort((a, b) => b.share - a.share);
}

export async function urlToBlob(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("photo " + r.status);
  return r.blob();
}

/* лучшие кадры дня: живой цвет, контраст, нормальная экспозиция */
export function photoScore(p) {
  const { brightness, saturation, contrast } = p.stats;
  return saturation * 0.6 + contrast * 1.2 + (1 - Math.abs(brightness - 0.52) * 1.6);
}
