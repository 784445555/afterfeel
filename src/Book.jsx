import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { renderPoster } from "./lib/export";
import { fmtDate } from "./lib/store";

/* Урок Polarsteps: в конце — вещь, которую можно взять в руки.
   Книга года 20×25 см: разворот на день (картина + запись), QR-код возвращает песню дня из бумаги в телефон. */
export default function Book({ days, styles, onClose }) {
  const year = days[0]?.date.slice(0, 4) || String(new Date().getFullYear());
  const list = [...days].filter((d) => d.date.startsWith(year)).sort((a, b) => a.date.localeCompare(b.date));
  const [pages, setPages] = useState([]);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let alive = true;
    const made = [];
    (async () => {
      for (const d of list) {
        const s = styles.get(d.id);
        const png = await renderPoster(d, s);
        const url = URL.createObjectURL(png);
        made.push(url);
        const qr = d.song?.link ? await QRCode.toDataURL(d.song.link, { margin: 0, width: 220, color: { dark: "#1c1a17", light: "#0000" } }) : null;
        if (!alive) return;
        setPages((p) => [...p, { d, s, url, qr }]);
        setDone((n) => n + 1);
      }
    })();
    return () => { alive = false; made.forEach(URL.revokeObjectURL); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = done === list.length;

  return (
    <div className="book-wrap">
      <div className="book-bar">
        <button className="link" onClick={onClose}>← Год</button>
        <span className="mono">Книга года · {list.length * 2 + 2} стр. · 20×25 см{ready ? "" : ` · собираю ${done}/${list.length}`}</span>
        <button className="btn" disabled={!ready} onClick={() => window.print()}>Сохранить PDF для печати</button>
      </div>
      <p className="book-note">PDF подходит для любой фотопечати: сервисы фотокниг в России и Казахстане принимают макет 20×25 см. QR-код на каждом развороте включает песню дня с телефона.</p>

      <div className="book">
        <section className="page cover">
          <p className="mono">Afterfeel</p>
          <h1>{year}<br /><em>в цвете</em></h1>
          <div className="cover-grid">
            {list.map((d) => {
              const s = styles.get(d.id);
              return <i key={d.id} style={{ background: `linear-gradient(${s.field} 0 34%, ${s.main} 34% 72%, ${s.ground} 72%)` }} />;
            })}
          </div>
          <p className="cover-sub">{list.length} дней, которые хотелось сохранить</p>
        </section>

        {pages.map(({ d, s, url, qr }) => (
          <div key={d.id} className="spread">
            <section className="page art-page" style={{ background: s.ground }}><img src={url} alt={d.title} /></section>
            <section className="page text-page">
              <p className="mono">{fmtDate(d.date)} · {s.label}</p>
              <h2>{d.title}</h2>
              {d.text && <p className="entry">{d.text}</p>}
              <div className="sw-row">{s.explain.find((e) => e.swatches)?.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
              {d.song && (
                <div className="book-song">
                  {qr && <img src={qr} alt="QR-код песни дня" />}
                  <div>
                    <b>♪ {d.song.title}</b>
                    <span>{d.song.artist}{d.song.year ? `, ${d.song.year}` : ""}</span>
                    {qr && <span className="hint">Наведите камеру — и день снова зазвучит</span>}
                  </div>
                </div>
              )}
            </section>
          </div>
        ))}

        <section className="page cover end">
          <p className="mono">Afterfeel · {year}</p>
          <h1><em>Жизнь идёт дальше.</em><br />Свет дней остаётся.</h1>
        </section>
      </div>
    </div>
  );
}
