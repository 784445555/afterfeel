import { useEffect, useMemo, useState } from "react";
import { allDays, saveDay, removeDay } from "./lib/store";
import { exportAll, importAll } from "./lib/backup";
import { styleOf } from "./dayStyle";
import Year from "./Year";
import Import from "./Import";
import DayView from "./DayView";
import Book from "./Book";

export default function App() {
  const [days, setDays] = useState(null);
  const [view, setView] = useState({ name: "year" });
  const [toast, setToast] = useState("");

  const refresh = async () => {
    const list = await allDays().catch(() => []);
    setDays(list.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))));
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  // стиль каждого дня считается один раз и переиспользуется в сетке года, плитках и книге
  const styles = useMemo(() => new Map((days || []).map((d) => [d.id, styleOf(d)])), [days]);
  const open = days && view.name === "day" ? days.find((d) => d.id === view.id) : null;

  async function onSaved(list) {
    for (const d of list) await saveDay(d);
    await refresh();
    const newest = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
    setView({ name: "day", id: newest.id });
  }
  async function onUpdate(d) {
    await saveDay(d);
    setDays((list) => list.map((x) => (x.id === d.id ? d : x)));
  }
  async function onDelete(id) {
    await removeDay(id);
    setView({ name: "year" });
    refresh();
  }
  async function onDemo(list) {
    for (const d of list) await saveDay(d);
    refresh();
  }
  async function onRestore(file) {
    try {
      const list = await importAll(file);
      for (const d of list) await saveDay(d);
      await refresh();
      setToast(`Восстановлено дней: ${list.length}`);
    } catch { setToast("Не получилось прочитать копию — это файл Afterfeel?"); }
  }

  if (!days) return null;
  return (
    <>
      {view.name === "import" ? (
        <Import onCancel={() => setView({ name: "year" })} onSaved={onSaved} />
      ) : view.name === "book" ? (
        <Book days={days} styles={styles} onClose={() => setView({ name: "year" })} />
      ) : (
        <Year days={days} styles={styles} onOpen={(id) => setView({ name: "day", id })} onImport={() => setView({ name: "import" })}
          onBook={() => setView({ name: "book" })} onDemo={onDemo} onBackup={() => exportAll(days)} onRestore={onRestore} />
      )}
      {open && <DayView key={open.id} day={open} onClose={() => setView({ name: "year" })} onDelete={onDelete} onUpdate={onUpdate} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
