import { useEffect, useMemo, useRef, useState } from "react";
import Painting, { useUrls } from "./Painting";
import Why from "./Why";
import ShareSheet from "./ShareSheet";
import { useDayStyle } from "./dayStyle";
import { fmtDate } from "./lib/store";
import { quoteOf } from "./lib/text";
import { speak, stopSpeaking, canSpeak } from "./lib/voice";
import { exportFolder } from "./lib/export";
import { autoCompose, availableStickers, stickerInfo, STICKER_LABELS } from "./lib/stickers";

/* Открытие дня: играет его песня, картина медленно проявляется, кадры сменяются в ритме музыки. */
export default function DayView({ day, onClose, onDelete, onUpdate }) {
  const s = useDayStyle(day);
  const blobs = useMemo(() => day.photos.map((p) => p.blob), [day.photos]);
  const urls = useUrls(blobs);
  const [focus, setFocus] = useState(false);
  const [idx, setIdx] = useState(day.photos.length ? 0 : 0);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(false);
  const [share, setShare] = useState(false);
  // стикеры: если человек ничего не трогал — система раскладывает их сама
  const [stk, setStk] = useState(() => day.stickers ?? autoCompose(day, s, 0));
  const [variant, setVariant] = useState(0);
  const [stkOpen, setStkOpen] = useState(false);
  const info = useMemo(() => stickerInfo(day, s), [day, s]);
  const avail = useMemo(() => availableStickers(day), [day]);
  function saveStk(next) { setStk(next); onUpdate?.({ ...day, stickers: next }); }
  function toggleType(type) {
    if (stk.some((x) => x.type === type)) return saveStk(stk.filter((x) => x.type !== type));
    const free = ["c", "b", "a", "e", "d"].find((sl) => !stk.some((x) => x.slot === sl)) || "a";
    saveStk([...stk, { type, slot: free, tilt: s.kandinsky ? 0 : Math.round((Math.random() - 0.5) * 8) }]);
  }
  function compose() { const v = variant + 1; setVariant(v); saveStk(autoCompose(day, s, v)); }
  const audio = useRef(null);

  const src = useMemo(() => (day.song?.blob ? URL.createObjectURL(day.song.blob) : day.song?.preview || null), [day.song]);
  useEffect(() => () => { if (day.song?.blob && src) URL.revokeObjectURL(src); }, [day.song, src]);

  // проявление: через мгновение после открытия
  useEffect(() => {
    const t = setTimeout(() => setFocus(true), 900);
    return () => clearTimeout(t);
  }, []);
  // ритм смены кадров — из темпа/энергии песни
  useEffect(() => {
    if (!focus || urls.length < 2) return;
    const t = setInterval(() => setIdx((i) => i + 1), s.rhythm * 1000);
    return () => clearInterval(t);
  }, [focus, urls.length, s.rhythm]);

  // музыка стартует сразу: клик по дню — это жест пользователя
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.volume = 0;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    let v = 0;
    const fade = setInterval(() => { v = Math.min(0.9, v + 0.06); el.volume = v; if (v >= 0.9) clearInterval(fade); }, 120);
    return () => { clearInterval(fade); el.pause(); stopSpeaking(); };
  }, [src]);

  // картина дышит в такт реальной громкости песни (Web Audio); если анализ недоступен — дыхание по темпу из CSS
  const stage = useRef(null);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    let ctx, an, raf, data, level = 0;
    const start = async () => {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume();
        if (ctx.state !== "running") { ctx.close(); ctx = null; return; }
        const srcNode = ctx.createMediaElementSource(el);
        an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.75;
        srcNode.connect(an); an.connect(ctx.destination);
        data = new Uint8Array(an.frequencyBinCount);
        const loop = () => {
          an.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 1; i < 24; i++) sum += data[i];        // басы и низкая середина — пульс песни
          const v = sum / 23 / 255;
          level += (v - level) * 0.25;
          stage.current?.style.setProperty("--amp", level.toFixed(3));
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch { /* визуализация необязательна */ }
    };
    el.addEventListener("playing", start);
    if (!el.paused) start();
    return () => { el.removeEventListener("playing", start); cancelAnimationFrame(raf); ctx?.close().catch(() => {}); };
  }, [src]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  function toggleMusic() {
    const el = audio.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); } else el.play().then(() => setPlaying(true)).catch(() => {});
  }
  function toggleVoice() {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    if (audio.current) audio.current.volume = 0.25; // музыка тише под голос
    setSpeaking(true);
    speak(`${day.title}. ${day.text}`, s, () => { setSpeaking(false); if (audio.current) audio.current.volume = 0.9; });
  }
  async function download() {
    setBusy(true);
    try { await exportFolder(day, s); } finally { setBusy(false); }
  }

  return (
    <div className="day" style={{ background: s.deep }} role="dialog" aria-label={day.title}>
      <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      <div className={`day-stage ${stkOpen ? "editing" : ""}`} ref={stage} onClick={() => !stkOpen && setFocus((f) => !f)} title={stkOpen ? "" : focus ? "Отпустить" : "Проявить"}>
        <Painting s={s} urls={urls} index={idx} focus={focus || stkOpen} title={day.title} date={day.date}
          quote={stk.some((x) => x.type === "quote") ? "" : quoteOf(day.text)}
          stickers={stk} stickerInfo={info} editStickers={stkOpen} onStickers={saveStk} />
      </div>

      <aside className="day-side">
        <p className="mono">{fmtDate(day.date)} · {s.label}</p>
        <h1>{day.title}</h1>
        <p className="entry">{day.text}</p>

        {day.song && (
          <div className="song">
            <div className="art" style={day.song.artwork ? { backgroundImage: `url(${day.song.artwork})` } : undefined}>{!day.song.artwork && "♪"}</div>
            <div className="song-info">
              <b>{day.song.title}</b>
              <span>{day.song.artist}{day.song.year ? ` · ${day.song.year}` : ""}</span>
              {day.song.link && <a href={day.song.link} target="_blank" rel="noreferrer">Слушать целиком в Apple Music ↗</a>}
            </div>
            {src && <button className="round" onClick={toggleMusic} aria-label={playing ? "Пауза" : "Играть"}>{playing ? "❚❚" : "▶"}</button>}
            {src && <audio ref={audio} src={src} crossOrigin={src.startsWith("http") ? "anonymous" : undefined} loop onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />}
          </div>
        )}

        <div className="actions">
          {canSpeak() && <button className="link" onClick={toggleVoice}>{speaking ? "Остановить голос" : "Послушать запись"}</button>}
          <button className="link" onClick={download} disabled={busy}>{busy ? "Собираю папку…" : "Скачать папку дня"}</button>
          <button className="link" onClick={() => setStkOpen((v) => !v)}>{stkOpen ? "Готово со стикерами" : "Стикеры из дня"}</button>
          <button className="link" onClick={() => setShare((v) => !v)}>{share ? "Скрыть «Поделиться»" : "Поделиться днём"}</button>
          <button className="link" onClick={() => setWhy((w) => !w)}>{why ? "Скрыть правила" : "Почему день выглядит так"}</button>
          <button className="link danger" onClick={() => { if (confirm("Удалить этот день без возможности восстановления?")) onDelete(day.id); }}>Удалить</button>
        </div>
        {stkOpen && (
          <div className="stk-panel">
            <p className="mono">Стикеры собраны из этого дня и одеты в его приём · тяните их по картине — они прилипают к местам</p>
            <div className="stk-chips">
              {avail.map((t) => (
                <button key={t} className={stk.some((x) => x.type === t) ? "on" : ""} onClick={() => toggleType(t)}>{STICKER_LABELS[t]}</button>
              ))}
            </div>
            <div className="stk-row">
              <button className="btn" onClick={compose}>✦ Собрать за меня</button>
              <button className="link" onClick={() => saveStk([])}>Убрать все</button>
            </div>
          </div>
        )}
        {share && <ShareSheet day={{ ...day, stickers: stk }} s={s} />}
        {why && <Why s={s} />}
      </aside>
    </div>
  );
}
