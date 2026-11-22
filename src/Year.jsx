import { useMemo, useRef, useState } from "react";
import Painting, { useUrls } from "./Painting";
import { styleOf } from "./dayStyle";
import { fmtDate, todayISO } from "./lib/store";
import { buildDemo } from "./lib/demo";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const HIDE_KEY = "af-hidden";

function readHidden() { try { return JSON.parse(localStorage.getItem(HIDE_KEY) || "[]"); } catch { return []; } }

/* «В этот день» — урок Google Photos: прошлое возвращается само. Но его можно скрыть (болезненные дни). */
function lookBack(days, hidden) {
  const today = todayISO();
  const shift = (n, unit) => { const d = new Date(); unit === "y" ? d.setFullYear(d.getFullYear() - n) : d.setDate(d.getDate() - n); return todayISO(d); };
  const tries = [[shift(1, "y"), "Год назад"], [shift(30), "Месяц назад"], [shift(7), "Неделю назад"]];
  for (const [date, label] of tries) {
    const d = days.find((x) => x.date === date && !hidden.includes(x.id));
    if (d) return { day: d, label };
  }
  // ближайший день, которому от 6 до 400 дней
  const old = days.filter((x) => !hidden.includes(x.id) && x.date < shift(6)).sort((a, b) => b.date.localeCompare(a.date))[0];
  return old && old.date !== today ? { day: old, label: "Из вашего года" } : null;
}

export default function Year({ days, styles, onOpen, onImport, onBook, onDemo, onBackup, onRestore }) {
  const years = useMemo(() => [...new Set([new Date().getFullYear(), ...days.map((d) => +d.date.slice(0, 4))])].sort((a, b) => b - a), [days]);
  const [year, setYear] = useState(years[0]);
  const [hidden, setHidden] = useState(readHidden);
  const [demo, setDemo] = useState(null);
  const [menu, setMenu] = useState(false);
  const fileRef = useRef(null);

  const inYear = days.filter((d) => d.date.startsWith(String(year)));
  const back = lookBack(days, hidden);

  function hide(id) {
    const next = [...hidden, id];
    setHidden(next);
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  async function makeDemo() {
    setDemo("…");
    try { await onDemo(await buildDemo((i, n) => setDemo(`${i} / ${n}`))); } finally { setDemo(null); }
  }

  return (
    <div className="year">
      <header className="top">
        <span className="mark">Afterfeel</span>
        <nav className="nav">
          {days.length > 0 && <button className="link" onClick={onBook}>Книга года</button>}
          <div className="menu-wrap">
            <button className="link" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>Копия дневника</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { setMenu(false); onBackup(); }} disabled={!days.length}>Сохранить копию всех дней (.zip)</button>
                <button onClick={() => { setMenu(false); fileRef.current?.click(); }}>Восстановить из копии</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onRestore(f); }} />
          </div>
          <button className="btn" onClick={onImport}>+ Добавить день</button>
        </nav>
      </header>

      <section className="hero">
        <h1>
          {years.length > 1 ? (
            <select value={year} onChange={(e) => setYear(+e.target.value)} aria-label="Год">{years.map((y) => <option key={y}>{y}</option>)}</select>
          ) : year} <em>в цвете</em>
        </h1>
        <p>
          {inYear.length
            ? `${inYear.length} ${plural(inYear.length)} сохранено. Каждая клетка — свет одного дня: цвет его фото, тепло записи и характер песни.`
            : "Каждый сохранённый день станет клеткой своего цвета — из его фото, записи и песни. Через год это полотно и будет вашим годом."}
        </p>
        {!days.length && (
          <div className="empty">
            <button className="btn" onClick={onImport}>Добавить первые фото</button>
            <button className="link" onClick={makeDemo} disabled={!!demo}>{demo ? `Собираю пример года ${demo}` : "Показать пример — 8 дней"}</button>
          </div>
        )}
      </section>

      {back && (
        <section className="lookback">
          <button className="lb-art" onClick={() => onOpen(back.day.id)} aria-label={`Открыть: ${back.day.title}`}>
            <MiniPainting day={back.day} s={styles.get(back.day.id)} />
          </button>
          <div>
            <p className="mono">{back.label} · {fmtDate(back.day.date)}</p>
            <h2>{back.day.title}</h2>
            <div className="lb-actions">
              <button className="btn ghost" onClick={() => onOpen(back.day.id)}>Вернуться в этот день</button>
              <button className="link muted" onClick={() => hide(back.day.id)}>Не показывать этот день</button>
            </div>
          </div>
        </section>
      )}

      <YearGrid year={year} days={inYear} styles={styles} onOpen={onOpen} />

      {inYear.length > 0 && (
        <section className="recent">
          <h2 className="section-h">Последние дни</h2>
          <div className="grid">
            {inYear.slice(0, 8).map((d) => (
              <button key={d.id} className="tile" onClick={() => onOpen(d.id)} aria-label={`Открыть день: ${d.title}`}>
                <MiniPainting day={d} s={styles.get(d.id)} peekable />
                <span className="tile-meta"><i style={{ background: styles.get(d.id).field }} /><i style={{ background: styles.get(d.id).ground }} />{styles.get(d.id).label}{d.song ? ` · ${d.song.artist}` : ""}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="foot">Всё хранится только на этом устройстве — сохраняйте копию дневника · Песни — официальные 30-секундные фрагменты Apple Music</footer>
    </div>
  );
}

function MiniPainting({ day, s, peekable }) {
  const blobs = useMemo(() => day.photos.map((p) => p.blob), [day]);
  const urls = useUrls(blobs);
  const [peek, setPeek] = useState(false);
  return (
    <div onMouseEnter={() => peekable && setPeek(true)} onMouseLeave={() => setPeek(false)}>
      <Painting s={s} urls={urls} peek={peek} title={day.title} date={day.date} breathe={false} />
    </div>
  );
}

/* Урок Daylio («год в пикселях»): весь год одним взглядом. У нас клетка — мини-картина дня. */
function YearGrid({ year, days, styles, onOpen }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = todayISO();
  return (
    <section className="ygrid" aria-label={`Год ${year} по дням`}>
      <div className="yg-row yg-head"><span />{Array.from({ length: 31 }, (_, i) => <span key={i}>{(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}</span>)}</div>
      {MONTHS.map((m, mi) => {
        const dim = new Date(year, mi + 1, 0).getDate();
        return (
          <div key={m} className="yg-row">
            <span className="yg-m">{m}</span>
            {Array.from({ length: 31 }, (_, di) => {
              if (di >= dim) return <span key={di} className="yg-c none" />;
              const iso = `${year}-${String(mi + 1).padStart(2, "0")}-${String(di + 1).padStart(2, "0")}`;
              const d = byDate.get(iso);
              const cls = `yg-c ${iso === today ? "today" : ""} ${iso > today ? "future" : ""}`;
              if (!d) return <span key={di} className={cls} />;
              const s = styles.get(d.id);
              return (
                <button key={di} className={`${cls} on`} onClick={() => onOpen(d.id)} title={`${fmtDate(iso)} — ${d.title}`}
                  style={{ background: `linear-gradient(${s.field} 0 34%, ${s.main} 34% 72%, ${s.ground} 72%)`, boxShadow: `inset 0 0 0 2px ${s.ground}` }} />
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

function plural(n) {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? "день" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "дня" : "дней";
}
