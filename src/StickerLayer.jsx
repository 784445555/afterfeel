import { useState } from "react";
import { slotsFor, nearestSlot, stickerSkin } from "./lib/stickers";

/* Стикеры поверх страницы. В режиме правки их можно тянуть пальцем — отпускаешь, и стикер прилипает к ближайшему месту. */
export default function StickerLayer({ s, list, info, u, editable, onChange, boxRef }) {
  const slots = slotsFor(s);
  const [drag, setDrag] = useState(null); // { i, x, y }
  const skin = stickerSkin(s);

  function pos(e) {
    const r = boxRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }
  function down(e, i) {
    if (!editable) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* без захвата тоже работает */ }
    setDrag({ i, ...pos(e) });
  }
  function move(e) { if (drag) setDrag({ ...drag, ...pos(e) }); }
  function up(e) {
    if (!drag) return;
    e.stopPropagation();
    const others = list.filter((_, k) => k !== drag.i);
    const target = nearestSlot(s, drag.x, drag.y, []);
    const clash = others.findIndex((o) => o.slot === target.id);
    const next = list.map((st, k) => {
      if (k === drag.i) return { ...st, slot: target.id };
      if (clash >= 0 && st === others[clash]) return { ...st, slot: list[drag.i].slot }; // меняемся местами
      return st;
    });
    setDrag(null);
    onChange?.(next);
  }

  return (
    <div className={`stickers skin-${skin} ${s.film ? "film" : ""} ${editable ? "editing" : ""}`} style={{ "--u": `${u}px`, "--c": info.color, "--ink": s.ink }}>
      {editable && slots.map((sl) => <i key={sl.id} className="stk-slot" style={{ left: `${sl.x}%`, top: `${sl.y}%` }} />)}
      {list.map((st, i) => {
        const sl = slots.find((x) => x.id === st.slot) || slots[0];
        const p = drag?.i === i ? drag : sl;
        return (
          <div key={st.type} className={`stk stk-${st.type} ${drag?.i === i ? "dragging" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, rotate: `${st.tilt || 0}deg` }}
            onPointerDown={(e) => down(e, i)} onPointerMove={move} onPointerUp={up} onClick={(e) => editable && e.stopPropagation()}>
            <Body type={st.type} info={info} skin={skin} film={s.film} />
          </div>
        );
      })}
    </div>
  );
}

function Body({ type, info, skin, film }) {
  if (type === "song" && info.song) {
    return (
      <div className="stk-card">
        <i className="stk-cover" style={info.song.artwork ? { backgroundImage: `url(${info.song.artwork})` } : undefined} />
        <span><b>{info.song.title}</b><em>{info.song.artist}</em></span>
      </div>
    );
  }
  if (type === "quote") return <div className="stk-note"><i className="stk-tape" />{info.quote}</div>;
  if (type === "stamp") {
    if (film || skin === "minimal") return <div className="stk-led">{info.led}{info.time ? <small>{info.time}</small> : null}</div>;
    if (skin === "kandinsky") return <div className="stk-card mono">{info.led.replace("'", "")} {info.time || ""}</div>;
    return <div className="stk-post"><b>{info.dayNum}</b><span>{info.month} {info.year}</span>{info.time && <small>{info.time}</small>}</div>;
  }
  if (type === "palette") {
    return <div className="stk-card stk-pal"><span>{info.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</span><small>палитра дня</small></div>;
  }
  if (type === "ticket") {
    return (
      <div className="stk-ticket">
        <small>ВХОД{info.time ? ` · ${info.time}` : ""}</small>
        <b>{info.title.length > 26 ? info.title.slice(0, 25) + "…" : info.title}</b>
        <small>№ {String(info.doy).padStart(3, "0")}</small>
      </div>
    );
  }
  return null;
}
