// De ce există fișierul ăsta:
// `new Date("2026-08-16T18:00:00")` — fără fus orar la final — e citit în fusul
// mașinii care rulează codul. Pe laptop asta înseamnă ora României, dar pe
// Vercel serverul merge pe UTC, așa că o oră aleasă la 18:00 ajungea în baza de
// date ca 18:00 UTC, adică 21:00 la noi. Utilizatorul propunea o oră și primea
// alta, iar pe laptop bugul nu se vedea deloc.
//
// Soluția: momentul exact e construit în browser, unde știm sigur fusul
// utilizatorului, și e trimis mai departe ca ISO complet. Serverul nu mai
// reinterpretează nimic.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** "2026-08-16" + "18:00" (ora locală a utilizatorului) → ISO cu fus explicit. */
export function localDateTimeToIso(date: string, time: string): string | null {
  const d = DATE_RE.exec(date.trim());
  const t = TIME_RE.exec(time.trim());
  if (!d || !t) return null;

  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hour, minute] = [Number(t[1]), Number(t[2])];
  if (hour > 23 || minute > 59) return null;

  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(value.getTime())) return null;
  // Verificăm că data chiar există (31 februarie ar fi alunecat în martie).
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null;
  }
  return value.toISOString();
}

/** Data pentru un <input type="date">, citită în fusul utilizatorului. */
export function toDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Ora pentru un <input type="time">, citită în același fus ca `toDateInput`. */
export function toTimeInput(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
