import { useMemo, useState } from "react";
import Painting, { useUrls } from "./Painting";
import SongPicker from "./SongPicker";
import { prepPhoto, photoScore } from "./lib/photo";
import { analyzeText } from "./lib/text";
import { computeStyle } from "./lib/style";
import { FEELS, feelById, titleFor } from "./lib/feel";
import { uid, todayISO, fmtDate } from "./lib/store";

const MAX = 6;

/* Добавление дней без усилий: бросьте фото за день или за всю поездку —
   система сама разложит их по дням по дате съёмки, выберет лучшие кадры и придумает названия. */
export default function Import({ onCancel, onSaved }) {
  const [groups, setGroups] = useState([]);
  const [progress, setProgress] = useState(null);
  const [common, setCommon] = useState(null);
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setProgress({ done: 0, total: files.length });
    const prepared = [];
    for (const f of files) {
      try { prepared.push(await prepPhoto(f)); } catch { /* пропускаем */ }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setProgress(null);
    setGroups((prev) => {
      const map = new Map(prev.map((g) => [g.date, { ...g, all: [...g.all] }]));
      for (const p of prepared) {
        const t = p.takenAt || p.fileTime || Date.now();
        const date = todayISO(new Date(t));
        if (!map.has(date)) map.set(date, { key: uid(), date, all: [], feel: null, text: "", title: "", song: null, ownSong: false });
        map.get(date).all.push(p);
      }
      return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
    });
  }

  const update = (key, patch) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const remove = (key) => setGroups((gs) => gs.filter((g) => g.key !== key));
  const ready = groups.length > 0 && groups.every((g) => g.song || common);

  async function save() {
    setSaving(true);
    const days = groups.map((g) => {
      const photos = pick(g.all);
      const song = g.song || common;
      const id = uid();
      const s = computeStyle({ text: analyzeText(g.text), photos, song, seed: id, feel: feelById(g.feel) });
      const auto = titleFor({ text: g.text, date: g.date, feel: feelById(g.feel), style: s });
      return {
        id, createdAt: Date.now(), date: g.date, text: g.text.trim(), feel: g.feel,
        title: g.title.trim() || auto, titleAuto: !g.title.trim(), photos, song
      };
    });
    onSaved(days);
  }

  return (
    <div className="import">
      <header className="top">
        <button className="link" onClick={onCancel}>← Год</button>
        <span className="mark">Новые дни</span>
        <span />
      </header>

      <label
        className={`drop ${drag ? "over" : ""} ${groups.length ? "small" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
      >
        <input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        {progress ? (
          <span className="drop-title">Смотрю фото: {progress.done} из {progress.total}…</span>
        ) : groups.length ? (
          <span className="drop-title">+ Добавить ещё фото</span>
        ) : (
          <>
            <span className="drop-title">Перетащите фото за день — или за всю поездку</span>
            <span className="drop-sub">Дневник сам разложит их по дням по дате съёмки, выберет лучшие кадры и придумает названия.</span>
            <span className="btn">Выбрать фото</span>
          </>
        )}
      </label>

      {groups.length > 0 && (
        <>
          <section className="common">
            <h3>Песня {groups.length > 1 ? "для этих дней" : "дня"}</h3>
            <SongPicker song={common} onPick={setCommon} />
          </section>

          <div className="drafts">
            {groups.map((g) => (
              <Draft key={g.key} g={g} common={common} onChange={(p) => update(g.key, p)} onRemove={() => remove(g.key)} />
            ))}
          </div>

          <div className="save-row sticky">
            <button className="btn" disabled={!ready || saving} onClick={save}>
              {saving ? "Сохраняю…" : `Сохранить ${groups.length} ${groups.length === 1 ? "день" : groups.length < 5 ? "дня" : "дней"} и проявить`}
            </button>
            {!ready && <span className="hint">Выберите песню — одну на все дни или свою для каждого.</span>}
          </div>
        </>
      )}
    </div>
  );
}

function pick(all) {
  const best = all.length > MAX ? [...all].sort((a, b) => photoScore(b) - photoScore(a)).slice(0, MAX) : all;
  return [...best].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
}

function Draft({ g, common, onChange, onRemove }) {
  const photos = useMemo(() => pick(g.all), [g.all]);
  const blobs = useMemo(() => photos.map((p) => p.blob), [photos]);
  const urls = useUrls(blobs);
  const song = g.song || common;
  const feel = feelById(g.feel);
  const s = useMemo(() => computeStyle({ text: analyzeText(g.text), photos, song, seed: g.key, feel }), [g.text, photos, song, g.key, feel]);
  const auto = titleFor({ text: g.text, date: g.date, feel, style: s });

  return (
    <article className="draft">
      <div className="draft-art"><Painting s={s} urls={urls} title={g.title || auto} date={g.date} /></div>
      <div className="draft-body">
        <div className="draft-head">
          <input type="date" value={g.date} max={todayISO()} onChange={(e) => e.target.value && onChange({ date: e.target.value })} aria-label="Дата дня" />
          <span className="hint">{fmtDate(g.date)} · {g.all.length} фото{g.all.length > MAX ? `, взяли ${MAX} лучших` : ""}</span>
          <button className="link" onClick={onRemove}>Убрать</button>
        </div>
        <input className="title-in" value={g.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={70} placeholder={auto} aria-label="Название папки" />
        <div className="chips" role="group" aria-label="Как ощущался день">
          {FEELS.map((f) => (
            <button key={f.id} className={g.feel === f.id ? "on" : ""} onClick={() => onChange({ feel: g.feel === f.id ? null : f.id })}>{f.label}</button>
          ))}
        </div>
        <input className="line-in" value={g.text} onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Пара слов о дне — необязательно: где были, с кем, что запомнилось" />
        {g.ownSong ? (
          <SongPicker song={g.song} onPick={(x) => onChange({ song: x })} placeholder="Своя песня для этого дня" />
        ) : (
          <button className="link muted" onClick={() => onChange({ ownSong: true })}>
            {common ? `♪ ${common.title} — своя песня для этого дня?` : "Своя песня для этого дня"}
          </button>
        )}
      </div>
    </article>
  );
}
