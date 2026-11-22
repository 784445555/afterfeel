import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmtDate } from "./lib/store";
import StickerLayer from "./StickerLayer";

/* Одна страница дневника. focus=false — память размыта (поле цвета), focus=true — день проявился.
   Постоянно: формат 4:5, дата сверху, поле цвета, окно с фото, название снизу.
   Меняется: приём (Моне, Кандинский, Матисс, японский минимализм, плёнка), цвет, края, воздух. */
export default function Painting({ s, urls = [], index = 0, focus = false, peek = false, title, date, quote = "", breathe = true, className = "", stickers = null, stickerInfo = null, editStickers = false, onStickers }) {
  const ref = useRef(null);
  const [w, setW] = useState(300);
  useLayoutEffect(() => {
    const el = ref.current;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const u = w / 100;
  const blur = focus ? 0 : peek ? 2.2 : 7;
  // в фокусе фото резкое, а мягкость краёв даёт маска-растушёвка (как край мазка у Ротко)
  const feather = s.win.border ? 0.5 : Math.max(1, s.edge * u * 1.6);
  const mask = `linear-gradient(to right, transparent, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent), linear-gradient(to bottom, transparent, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent)`;
  const wTop = s.air + 4 + s.topH + 2.5;
  const wBottom = s.air + 13;
  const { side, shift, arch, border, tilt } = s.win;
  const photoFilter = `${s.photoSvg ? `url(#${s.photoSvg}) ` : ""}${s.photoFilter} blur(${blur * u}px)`;

  return (
    <div
      ref={ref}
      className={`painting t-${s.technique} ${focus ? "is-focus" : ""} ${breathe ? "breathe" : ""} ${className}`}
      style={{ background: s.ground, color: s.ink, "--breath": `${s.breath}s`, "--fade": `${s.fade}s` }}
    >
      <div className="p-field" style={{ background: s.field, left: `${s.air}%`, right: `${s.air}%`, top: `${s.air + 4}%`, height: `${s.topH}%`, filter: `blur(${s.edge * u}px)` }} />
      {s.blobs.map((b, i) => (
        <i key={i} className="p-blob" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.d}%`, background: b.color, borderRadius: b.shape, rotate: `${b.r}deg`, filter: `blur(${focus ? 0 : 1.2 * u}px)` }} />
      ))}
      <div
        className="p-window"
        style={{
          left: `${side + shift}%`, right: `${Math.max(0, side - shift)}%`, top: `${wTop}%`, bottom: `${wBottom}%`,
          filter: focus ? "blur(0px)" : `blur(${s.edge * u}px)`,
          WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: "source-in", maskComposite: "intersect",
          borderRadius: arch ? `50% 50% 2px 2px / ${arch * 0.6}% ${arch * 0.6}% 2px 2px` : 2,
          background: border ? "#f2ede3" : "transparent",
          rotate: `${tilt}deg`
        }}
      >
        <div className="p-photo" style={{ inset: border ? `${border * u}px ${border * u}px ${border * u * 3.2}px` : 0, borderRadius: "inherit" }}>
          {urls.map((src, i) => (
            <img key={src} src={src} alt="" className={i === index % urls.length ? "on" : ""}
              style={{ filter: photoFilter, transform: `scale(${1.12 - (focus ? 0.07 : 0)})` }} />
          ))}
          {!urls.length && <div className="p-empty" style={{ background: s.field }} />}
          <div className="p-tint" style={{ background: s.tint, opacity: s.tintOpacity }} />
          {s.monet && <div className="p-glow" />}
        </div>
      </div>
      {s.lines.map((l, i) => (
        <i key={i} className="p-line" style={{ top: `${l.y}%`, height: `${Math.max(1, l.w * u)}px`, background: s.ink, transform: `rotate(${l.a}deg)`, opacity: focus ? 0.55 : 0.25 }} />
      ))}
      {s.circle && (
        <i className="p-circle" style={{ left: `${s.circle.x}%`, top: `${s.circle.y}%`, width: `${s.circle.d}%`, background: s.circle.color, filter: `blur(${focus ? 0 : 1.2 * u}px)` }} />
      )}
      <div className="p-grain" style={{ opacity: s.grain }} />
      {s.film && <div className="p-vignette" />}
      {quote && (
        <div className="p-quote" style={{ left: `${s.air + 3}%`, right: `${s.air + 3}%`, top: `${s.air + 4}%`, height: `${s.topH}%`, color: s.fieldInk, fontSize: (quote.length > 55 ? 3.3 : quote.length > 35 ? 3.8 : 4.4) * u }}>
          <span>{quote}</span>
        </div>
      )}
      {date && <div className="p-date" style={{ left: `${s.air}%`, top: `${s.air * 0.45}%`, color: s.inkSoft, fontSize: 2.1 * u }}>{fmtDate(date)}</div>}
      {title && <div className="p-title" style={{ left: `${s.air}%`, right: `${s.air}%`, bottom: `${s.air * 0.6}%`, fontSize: 5.4 * u }}>{title}</div>}
      {stickers && stickerInfo && <StickerLayer s={s} list={stickers} info={stickerInfo} u={u} editable={editStickers} onChange={onStickers} boxRef={ref} />}
    </div>
  );
}

/* объектные URL для Blob-ов */
export function useUrls(blobs) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const list = (blobs || []).map((b) => URL.createObjectURL(b));
    setUrls(list);
    return () => list.forEach((x) => URL.revokeObjectURL(x));
  }, [blobs]);
  return urls;
}
