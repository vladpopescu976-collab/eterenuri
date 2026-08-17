import type { BookingStatus, SportType } from "@prisma/client";

export type AnalyticsBooking = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  fieldId: string;
};

export type AnalyticsField = {
  id: string;
  sportType: SportType;
  isActive: boolean;
  openingHour: number;
  closingHour: number;
};

function durationHours(b: AnalyticsBooking) {
  return (b.endTime.getTime() - b.startTime.getTime()) / 3_600_000;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Gruparea pe zile trebuie făcută în fusul utilizatorului. Cu `toISOString()`
// o rezervare de la 01:00 noaptea cădea în ziua precedentă (UTC), deci apărea
// în grafic într-o zi, iar în listă în alta.
function isoDate(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function computeKpis(bookings: AnalyticsBooking[], fields: AnalyticsField[], now = new Date()) {
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  const monthRevenue = confirmed
    .filter((b) => isSameMonth(b.startTime, now))
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const totalBookings = bookings.length;
  const occupiedHours = confirmed.reduce((sum, b) => sum + durationHours(b), 0);

  const last7 = Array.from({ length: 7 }, (_, i) => isoDate(addDays(now, -i)));
  const confirmedLast7Hours = confirmed
    .filter((b) => last7.includes(isoDate(b.startTime)))
    .reduce((sum, b) => sum + durationHours(b), 0);

  const activeFields = fields.filter((f) => f.isActive);
  const dailyCapacity = activeFields.reduce((sum, f) => sum + (f.closingHour - f.openingHour), 0);
  const weeklyCapacity = dailyCapacity * 7;
  const occupancyRate = weeklyCapacity > 0 ? Math.round((confirmedLast7Hours / weeklyCapacity) * 100) : 0;

  return { monthRevenue, totalBookings, occupiedHours, occupancyRate };
}

export function revenueSeries(bookings: AnalyticsBooking[], days: number, now = new Date()) {
  const fmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(now, -i);
    const iso = isoDate(date);
    const dayBookings = bookings.filter((b) => b.status === "CONFIRMED" && isoDate(b.startTime) === iso);
    series.push({
      day: fmt.format(date),
      venit: Math.round(dayBookings.reduce((sum, b) => sum + b.totalPrice, 0)),
      rezervari: dayBookings.length,
    });
  }
  return series;
}

const sportLabelRo: Record<SportType, string> = {
  FOOTBALL: "Fotbal",
  BASKETBALL: "Baschet",
  TENNIS: "Tenis",
  VOLLEYBALL: "Volei",
  HANDBALL: "Handbal",
  PADEL: "Padel",
  BADMINTON: "Badminton",
  OTHER: "Altele",
};

export function hoursBySport(bookings: AnalyticsBooking[], fields: AnalyticsField[]) {
  const byType: Record<string, number> = {};
  const fieldById = Object.fromEntries(fields.map((f) => [f.id, f]));
  bookings
    .filter((b) => b.status === "CONFIRMED")
    .forEach((b) => {
      const field = fieldById[b.fieldId];
      if (!field) return;
      const label = sportLabelRo[field.sportType];
      byType[label] = (byType[label] || 0) + durationHours(b);
    });
  return Object.entries(byType)
    .map(([sport, ore]) => ({ sport, ore: Math.round(ore * 10) / 10 }))
    .sort((a, b) => b.ore - a.ore);
}
