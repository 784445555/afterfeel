import { useEffect, useState } from "react";
import { renderPost, renderStory, renderVideo, captionFor, shareFile } from "./lib/share";

const KINDS = [
  { id: "story", label: "Сторис 9:16", hint: "Instagram, Telegram" },
  { id: "post", label: "Пост 4:5", hint: "лента" },
  { id: "video", label: "Видео 15 с", hint: "Reels, сторис со звуком" }
];

/* Делится только то, что человек сам выбрал: дневник остаётся закрытым. */
export default function ShareSheet({ day, s }) {
  const [kind, setKind] = useState(null);
  const [busy, setBusy] = useState(0);
  const [out, setOut] = useState(null);
  const [status, setStatus] = useState("");
  const caption = captionFor(day, s);

  useEffect(() => () => { if (out?.url) URL.revokeObjectURL(out.url); }, [out]);

  async function make(k) {
    setKind(k); setOut(null); setStatus(""); setBusy(0.01);
    try {
      let blob, sound = true;
      if (k === "story") blob = await renderStory(day, s);
      else if (k === "post") blob = await renderPost(day, s);
      else {
        const r = await renderVideo(day, s, (p) => setBusy(Math.max(0.01, p)));
        blob = r.blob; sound = r.hasSound;
      }
      setOut({ kind: k, blob, url: URL.createObjectURL(blob), sound });
    } catch (e) {
      console.error(e);
      setStatus("Не получилось собрать файл в этом браузере.");
    }
    setBusy(0);
  }

  async function send() {
    const ext = out.blob.type.includes("mp4") ? "mp4" : out.blob.type.includes("webm") ? "webm" : "png";
    const name = `${day.date} ${day.title}.${ext}`.replace(/[\\/:*?"<>|]+/g, "");
    const r = await shareFile(out.blob, name, caption);
    setStatus(r === "shared" ? "Отправлено." : r === "downloaded" ? "Файл сохранён — выложите его куда захотите." : "");
  }

  return (
    <div className="share">
      <p className="mono">Дневник остаётся закрытым — выкладывается только этот день</p>
      <div className="share-kinds">
        {KINDS.map((k) => (
          <button key={k.id} className={kind === k.id ? "on" : ""} disabled={!!busy} onClick={() => make(k.id)}>
            <b>{k.label}</b><span>{k.hint}</span>
          </button>
        ))}
      </div>

      {!!busy && (
        <div className="share-busy">
          <i style={{ width: `${busy * 100}%` }} />
          <span>{kind === "video" ? `Записываю, как день проявляется… ${Math.round(busy * 15)} / 15 с` : "Собираю…"}</span>
        </div>
      )}

      {out && (
        <div className={`share-out ${out.kind}`}>
          {out.kind === "video"
            ? <video src={out.url} controls playsInline loop />
            : <img src={out.url} alt="Превью публикации" />}
          <div className="share-side">
            {out.kind === "video" && <p className="hint">{out.sound ? "Со звуком: официальный фрагмент песни." : "Без звука: фрагмент песни недоступен."}</p>}
            <textarea readOnly value={caption} rows={5} onFocus={(e) => e.target.select()} aria-label="Подпись к публикации" />
            <div className="share-actions">
              <button className="btn" onClick={send}>Поделиться</button>
              <button className="link" onClick={() => navigator.clipboard?.writeText(caption).then(() => setStatus("Подпись скопирована."))}>Скопировать подпись</button>
            </div>
          </div>
        </div>
      )}
      {status && <p className="hint">{status}</p>}
    </div>
  );
}
