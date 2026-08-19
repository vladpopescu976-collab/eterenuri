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

// Terenurile sunt în România, deci o „zi” înseamnă o zi de la noi. Pe server nu
// putem folosi fusul mașinii (pe Vercel e UTC), așa că îl fixăm explicit.
export const APP_TIME_ZONE = "Europe/Bucharest";

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asUtc - instant.getTime();
}

/**
 * Intervalul [început, sfârșit) al unei zile calendaristice din România,
 * indiferent de fusul serverului. Întoarce null dacă data nu e validă.
 */
export function dayRangeInAppZone(date: string): { start: Date; end: Date } | null {
  const m = DATE_RE.exec(date.trim());
  if (!m) return null;

  const naive = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(naive)) return null;

  // Două treceri, ca să fie corect și în zilele când se schimbă ora.
  let startMs = naive - zoneOffsetMs(new Date(naive), APP_TIME_ZONE);
  startMs = naive - zoneOffsetMs(new Date(startMs), APP_TIME_ZONE);

  const nextDay = Date.parse(`${date}T00:00:00Z`) + 24 * 60 * 60 * 1000;
  let endMs = nextDay - zoneOffsetMs(new Date(nextDay), APP_TIME_ZONE);
  endMs = nextDay - zoneOffsetMs(new Date(endMs), APP_TIME_ZONE);

  return { start: new Date(startMs), end: new Date(endMs) };
}

/** Ora și minutul unui moment, citite în fusul terenurilor, nu al serverului. */
export function clockInAppZone(instant: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { hour: get("hour") % 24, minute: get("minute") };
}

/**
 * Momentul exact al unei ore dintr-o zi calendaristică din România.
 *
 * Nu e totuna cu „miezul nopții plus N ore”: în zilele în care se schimbă ora,
 * un teren blocat luni de la 20:00 ar aluneca la 19:00 sau 21:00. Ora 24 se
 * citește ca miezul nopții următoare, ca terenurile deschise până la 24 să
 * poată fi blocate până la închidere.
 */
export function instantInAppZone(date: string, hour: number, minute = 0): Date | null {
  const m = DATE_RE.exec(date.trim());
  if (!m || hour < 0 || hour > 24 || minute < 0 || minute > 59) return null;

  const ziua = hour === 24 ? adaugaZile(date, 1) : date;
  const ora = hour === 24 ? 0 : hour;

  const naiv = Date.parse(
    `${ziua}T${String(ora).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`
  );
  if (Number.isNaN(naiv)) return null;

  // Două treceri, la fel ca la `dayRangeInAppZone`, ca să fie corect și în
  // ziua în care se schimbă ora.
  let ms = naiv - zoneOffsetMs(new Date(naiv), APP_TIME_ZONE);
  ms = naiv - zoneOffsetMs(new Date(ms), APP_TIME_ZONE);
  return new Date(ms);
}

/** „2026-08-19” + 7 → „2026-08-26”. Lucrăm pe UTC, deci fusul nu poate muta ziua. */
export function adaugaZile(date: string, zile: number): string {
  const baza = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(baza)) return date;
  return new Date(baza + zile * 86_400_000).toISOString().slice(0, 10);
}

/** Ziua săptămânii după ISO: 1 = luni … 7 = duminică. */
export function ziuaSaptamanii(date: string): number {
  const zi = new Date(`${date}T00:00:00Z`).getUTCDay();
  return zi === 0 ? 7 : zi;
}
