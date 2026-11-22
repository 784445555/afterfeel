import { useEffect, useMemo, useRef, useState } from "react";
import { searchSongs, songFromLink, songFromFile } from "./lib/music";

/* Песня: поиск по названию, ссылка Apple Music или свой файл. */
export default function SongPicker({ song, onPick, placeholder = "Название, исполнитель или ссылка Apple Music" }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [state, setState] = useState("");
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) { setRes([]); setState(""); return; }
    const isUrl = /^https?:\/\//i.test(v);
    const tm = setTimeout(async () => {
      setState("…");
      try {
        if (isUrl) {
          const found = await songFromLink(v);
          if (found) { onPick(found); setQ(""); setRes([]); setState(""); }
          else setState("Ссылку Apple Music не удалось разобрать. Для Spotify, YouTube или Яндекс Музыки введите название песни.");
          return;
        }
        const list = await searchSongs(v);
        setRes(list);
        setState(list.length ? "" : "Ничего не нашлось.");
      } catch { setState("Поиск недоступен: проверьте интернет или загрузите свой файл."); }
    }, isUrl ? 50 : 380);
    return () => clearTimeout(tm);
  }, [q, onPick]);

  const src = useMemo(() => (song?.blob ? URL.createObjectURL(song.blob) : song?.preview || null), [song]);
  useEffect(() => () => { if (song?.blob && src) URL.revokeObjectURL(src); }, [song, src]);
  useEffect(() => { setPlaying(false); }, [src]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); } else el.play().then(() => setPlaying(true)).catch(() => {});
  }

  if (song) {
    return (
      <div className="song chosen">
        <div className="art" style={song.artwork ? { backgroundImage: `url(${song.artwork})` } : undefined}>{!song.artwork && "♪"}</div>
        <div className="song-info">
          <b>{song.title}</b>
          <span>{song.artist}{song.genre ? ` · ${song.genre}` : ""}{song.year ? ` · ${song.year}` : ""}{song.profile?.bpm ? ` · ${song.profile.bpm} BPM` : ""}</span>
        </div>
        {src && <button className="round" onClick={toggle} aria-label={playing ? "Пауза" : "Послушать"}>{playing ? "❚❚" : "▶"}</button>}
        <button className="link" onClick={() => { audio.current?.pause(); onPick(null); }}>Сменить</button>
        {src && <audio ref={audio} src={src} onEnded={() => setPlaying(false)} />}
      </div>
    );
  }

  return (
    <div className="song-picker">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      {state && <p className="hint">{state}</p>}
      {!!res.length && (
        <ul>
          {res.map((r) => (
            <li key={r.id}>
              <button onClick={() => { onPick(r); setQ(""); setRes([]); }}>
                <span className="art" style={r.artwork ? { backgroundImage: `url(${r.artwork})` } : undefined} />
                <span className="song-info"><b>{r.title}</b><span>{r.artist} · {r.genre}{r.year ? ` · ${r.year}` : ""}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="link file">
        или свой аудиофайл
        <input type="file" accept="audio/*" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setState("Слушаю файл: темп и энергия…");
          onPick(await songFromFile(f));
          setState("");
        }} />
      </label>
    </div>
  );
}
