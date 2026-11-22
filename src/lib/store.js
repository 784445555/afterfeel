/* Дни хранятся на устройстве (IndexedDB): текст, фото, песня — всё в одной записи-папке. */
const DB = "afterfeel-year", ST = "days";

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(ST, mode);
    const out = fn(t.objectStore(ST));
    t.oncomplete = () => { db.close(); res(out?.result); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}
export const allDays = () => tx("readonly", (s) => s.getAll());
export const saveDay = (d) => tx("readwrite", (s) => s.put(d));
export const removeDay = (id) => tx("readwrite", (s) => s.delete(id));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function monthOf(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS_NOM[m - 1]} ${y}`;
}
