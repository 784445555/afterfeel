/* Песня -> профиль: энергия, «светлость» (валентность), темп, эпоха.
   Источник: поиск iTunes (жанр, год, 30-сек официальный фрагмент), ссылка Apple Music
   или свой аудиофайл (аудиоанализ в браузере). */

const API = "https://itunes.apple.com";

function fromItunes(x) {
  return {
    kind: "itunes",
    id: String(x.trackId),
    title: x.trackName,
    artist: x.artistName,
    genre: x.primaryGenreName || "",
    year: x.releaseDate ? new Date(x.releaseDate).getFullYear() : null,
    preview: x.previewUrl || null,
    link: x.trackViewUrl || null,
    artwork: x.artworkUrl100 ? x.artworkUrl100.replace("100x100", "300x300") : null
  };
}

export async function searchSongs(term, limit = 7) {
  const q = term.trim();
  if (!q) return [];
  const r = await fetch(`${API}/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}`);
  if (!r.ok) throw new Error("search " + r.status);
  const j = await r.json();
  return (j.results || []).filter((x) => x.previewUrl).map((x) => withProfile(fromItunes(x)));
}

/* https://music.apple.com/.../song/...?i=123 или .../123 */
export async function songFromLink(url) {
  const m = url.match(/[?&]i=(\d+)/) || url.match(/music\.apple\.com\/.*\/(\d{6,})/);
  if (!m) return null;
  const r = await fetch(`${API}/lookup?id=${m[1]}&entity=song`);
  const j = await r.json();
  const x = (j.results || []).find((v) => v.kind === "song" || v.wrapperType === "track");
  return x ? withProfile(fromItunes(x)) : null;
}

const GENRES = [
  [/classical|piano|soundtrack|ambient|new age|chill|lo-?fi|instrumental/i, 0.22, 0.45],
  [/jazz|vocal|standards|easy listening|swing|bossa/i, 0.38, 0.66],
  [/alternative|indie rock/i, 0.58, 0.5],
  [/blues|folk|singer|songwriter|indie/i, 0.45, 0.42],
  [/r&b|soul/i, 0.5, 0.6],
  [/k-?pop|pop|dance|disco|funk|latin|reggae/i, 0.72, 0.8],
  [/hip-?hop|rap|trap/i, 0.74, 0.45],
  [/electronic|house|techno|edm|trance|drum/i, 0.84, 0.48],
  [/rock|metal|punk|grunge/i, 0.86, 0.4]
];

export function metaProfile(s) {
  let energy = 0.5, valence = 0.5, rule = "жанр не распознан";
  for (const [rx, e, v] of GENRES) if (rx.test(s.genre || "")) { energy = e; valence = v; rule = s.genre; break; }
  // «Pop» до 1975 года — это эстрада и вокальные стандарты (Синатра), а не танцпол
  if (s.year && s.year < 1975 && /pop|vocal/i.test(s.genre || "")) { energy = Math.min(energy, 0.4); rule = `${s.genre}, ${s.year} — эстрада своего времени`; }
  const t = `${s.title} ${s.artist}`.toLowerCase();
  if (/sad|tears|alone|rain|lonely|goodbye|груст|слез|один|дожд/.test(t)) valence -= 0.15;
  if (/love|summer|happy|sun|dance|любл|лето|солн|счаст/.test(t)) valence += 0.12;
  return { energy, valence: Math.min(1, Math.max(0, valence)), bpm: null, year: s.year || null, source: rule };
}

const withProfile = (s) => ({ ...s, profile: metaProfile(s) });

/* Свой файл: громкость (RMS) -> энергия, темп через автокорреляцию огибающей, яркость тембра -> валентность */
export async function songFromFile(file) {
  const base = {
    kind: "file", id: "f" + Date.now(), title: file.name.replace(/\.[^.]+$/, ""), artist: "свой файл",
    genre: "", year: null, preview: null, link: null, artwork: null, blob: file
  };
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close().catch(() => {});
    const d = buf.getChannelData(0), sr = buf.sampleRate;
    // берём до 60 секунд из середины трека
    const start = Math.max(0, Math.floor(d.length / 2 - sr * 30)), end = Math.min(d.length, start + sr * 60);
    const hop = 512, env = [];
    let sum = 0, zc = 0, prev = 0, cnt = 0;
    for (let i = start; i + hop < end; i += hop) {
      let e = 0;
      for (let j = i; j < i + hop; j++) {
        const v = d[j]; e += v * v;
        if ((v >= 0) !== (prev >= 0)) zc++;
        prev = v;
      }
      env.push(Math.sqrt(e / hop)); sum += e; cnt += hop;
    }
    const rms = Math.sqrt(sum / cnt);
    const fps = sr / hop;
    const onset = env.map((v, i) => Math.max(0, v - (env[i - 1] || 0)));
    let best = 0, bestLag = 0;
    for (let bpm = 60; bpm <= 180; bpm++) {
      const lag = Math.round((60 / bpm) * fps);
      let s = 0;
      for (let i = lag; i < onset.length; i++) s += onset[i] * onset[i - lag];
      if (s > best) { best = s; bestLag = lag; }
    }
    const bpm = bestLag ? Math.round((60 * fps) / bestLag) : null;
    const tempoE = bpm ? Math.min(1, Math.max(0, (bpm - 60) / 110)) : 0.5;
    const energy = Math.min(1, Math.max(0, 0.55 * Math.min(1, rms * 4) + 0.45 * tempoE));
    const valence = Math.min(1, Math.max(0, (zc / cnt) * 9));
    return { ...base, profile: { energy, valence, bpm, year: null, source: "аудиоанализ файла" } };
  } catch {
    return { ...base, profile: { energy: 0.5, valence: 0.5, bpm: null, year: null, source: "файл не удалось разобрать" } };
  }
}
