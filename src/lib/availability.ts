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
