/* Урок 1 Second Everyday и Day One: главный страх — потерять годы записей.
   Полная копия дневника одним файлом: дни (JSON) + фото + свои аудиофайлы. Восстановление — из того же файла. */
import JSZip from "jszip";
import { todayISO } from "./store";

export async function exportAll(days) {
  const zip = new JSZip();
  const meta = days.map((d) => {
    const photos = d.photos.map((p, i) => {
      const path = `photos/${d.id}-${i + 1}.jpg`;
      zip.file(path, p.blob);
      return { path, palette: p.palette, stats: p.stats, takenAt: p.takenAt || null };
    });
    let song = d.song ? { ...d.song } : null;
    if (song?.blob) {
      const ext = (song.blob.name || "audio.mp3").split(".").pop();
      const path = `songs/${d.id}.${ext}`;
      zip.file(path, song.blob);
      song = { ...song, blob: undefined, blobPath: path, blobType: song.blob.type };
    }
    return { ...d, photos, song };
  });
  zip.file("days.json", JSON.stringify({ app: "afterfeel", version: 3, savedAt: new Date().toISOString(), days: meta }, null, 1));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `afterfeel-копия-${todayISO()}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function importAll(file) {
  const zip = await JSZip.loadAsync(file);
  const json = JSON.parse(await zip.file("days.json").async("string"));
  const out = [];
  for (const d of json.days || []) {
    const photos = [];
    for (const p of d.photos) {
      const f = zip.file(p.path);
      if (f) photos.push({ blob: new Blob([await f.async("arraybuffer")], { type: "image/jpeg" }), palette: p.palette, stats: p.stats, takenAt: p.takenAt });
    }
    let song = d.song;
    if (song?.blobPath && zip.file(song.blobPath)) {
      const buf = await zip.file(song.blobPath).async("arraybuffer");
      song = { ...song, blob: new File([buf], song.blobPath.split("/").pop(), { type: song.blobType || "audio/mpeg" }) };
    }
    out.push({ ...d, photos, song });
  }
  return out;
}
