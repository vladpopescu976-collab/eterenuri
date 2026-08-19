import { clockInAppZone } from "@/lib/datetime";

export type Interval = { start: Date; end: Date };

/** Orele de start posibile pentru un teren, ca „08:00”, „09:00”, … */
export function hourLabels(openingHour: number, closingHour: number): string[] {
  return Array.from({ length: Math.max(0, closingHour - openingHour) }, (_, i) =>
    `${String(openingHour + i).padStart(2, "0")}:00`
  );
}

export function hourOf(label: string): number {
  return Number(label.split(":")[0]);
}

function slotOfDay(day: Date, hour: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

/** Orele dintr-o zi care se suprapun peste o rezervare activă. */
export function busyHours(
  day: Date,
  occupied: Interval[],
  openingHour: number,
  closingHour: number
): Set<number> {
  const busy = new Set<number>();
  for (let hour = openingHour; hour < closingHour; hour++) {
    const start = slotOfDay(day, hour);
    const end = slotOfDay(day, hour + 1);
    if (occupied.some((o) => start < o.end && end > o.start)) busy.add(hour);
  }
  return busy;
}

/** Adevărat dacă vreo oră din intervalul [from, to) este deja ocupată. */
export function rangeIsBusy(from: number, to: number, busy: Set<number>): boolean {
  for (let hour = from; hour < to; hour++) {
    if (busy.has(hour)) return true;
  }
  return false;
}

/** „20:00–22:00, 15:00–16:00” — pentru mesajul afișat utilizatorului. */
export function describeOccupied(occupied: Interval[]): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  return occupied
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((o) => `${fmt(o.start)}–${fmt(o.end)}`)
    .join(", ");
}

/**
 * Verifică dacă un interval încape în programul terenului.
 *
 * Interfețele oferă doar orele din program, dar ele nu sunt singura cale către
 * server: o cerere trimisă direct trecea de toate verificările și crea o
 * rezervare la 05:00 pe un teren deschis de la 08:00. Proprietarul o vedea în
 * lista de rezervări, dar nu și în calendar, care arată doar programul.
 *
 * Sfârșitul se calculează adunând durata la ora de început, nu citind ora
 * momentului final: altfel un teren deschis până la ora 24 ar avea sfârșitul
 * la „00:00”, adică înainte de deschidere.
 */
export function outsideOpeningHours(
  start: Date,
  end: Date,
  openingHour: number,
  closingHour: number
): string | null {
  const { hour, minute } = clockInAppZone(start);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + (end.getTime() - start.getTime()) / 60_000;

  if (startMinutes < openingHour * 60 || endMinutes > closingHour * 60) {
    const ora = (valoare: number) => `${String(valoare).padStart(2, "0")}:00`;
    return `Terenul este deschis între ${ora(openingHour)} și ${ora(closingHour)}. Alege un interval din acest program.`;
  }
  return null;
}
