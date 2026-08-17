"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeatInterval = { fieldId: string; startTime: Date; endTime: Date };
export type HeatField = { id: string; openingHour: number; closingHour: number };

const WEEKDAYS = ["lu", "ma", "mi", "jo", "vi", "sâ", "du"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
/** Luni = 0, ca în calendarele românești. */
function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

/**
 * Cât de plină e fiecare zi, ca fracție din programul total al terenurilor.
 * Orele ocupate sunt tăiate la programul terenului, altfel o rezervare care
 * trece de închidere ar umfla artificial procentul.
 */
function occupancyByDay(
  fields: HeatField[],
  intervals: HeatInterval[]
): Map<string, number> {
  const dailyCapacity = fields.reduce(
    (sum, f) => sum + Math.max(0, f.closingHour - f.openingHour),
    0
  );
  const hours = new Map<string, number>();
  if (dailyCapacity <= 0) return hours;

  const fieldById = new Map(fields.map((f) => [f.id, f]));

  for (const item of intervals) {
    const field = fieldById.get(item.fieldId);
    if (!field) continue;

    // O rezervare poate trece peste miezul nopții, deci o împărțim pe zile.
    let cursor = startOfDay(item.startTime);
    const last = startOfDay(new Date(item.endTime.getTime() - 1));

    while (cursor <= last) {
      const openFrom = new Date(cursor).setHours(field.openingHour, 0, 0, 0);
      const openTo = new Date(cursor).setHours(field.closingHour, 0, 0, 0);

      const from = Math.max(item.startTime.getTime(), openFrom);
      const to = Math.min(item.endTime.getTime(), openTo);
      const overlap = Math.max(0, to - from) / 3_600_000;

      if (overlap > 0) {
        const key = dayKey(cursor);
        hours.set(key, (hours.get(key) ?? 0) + overlap);
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
  }

  const ratios = new Map<string, number>();
  hours.forEach((value, key) => ratios.set(key, Math.min(1, value / dailyCapacity)));
  return ratios;
}

/** Alb → roșu, în cinci trepte. */
function heatClass(ratio: number | undefined) {
  if (!ratio) return "bg-transparent";
  if (ratio < 0.25) return "bg-red-100 dark:bg-red-500/15";
  if (ratio < 0.5) return "bg-red-200 dark:bg-red-500/30";
  if (ratio < 0.75) return "bg-red-400 text-white dark:bg-red-500/55";
  return "bg-red-600 text-white dark:bg-red-500/80";
}

export function DayHeatPicker({
  fields,
  intervals,
  selectedDate,
  onSelect,
}: {
  fields: HeatField[];
  intervals: HeatInterval[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const occupancy = useMemo(() => occupancyByDay(fields, intervals), [fields, intervals]);

  const monthLabel = new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(month);

  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = weekdayIndex(firstOfMonth);
  const today = startOfDay(new Date());
  const selectedKey = dayKey(selectedDate);

  return (
    <div className="w-[248px] p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Luna anterioară"
          onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[12.5px] font-medium capitalize">{monthLabel}</span>
        <button
          type="button"
          aria-label="Luna următoare"
          onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}

        {Array.from({ length: leading }).map((_, i) => (
          <span key={`gol-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const key = dayKey(date);
          const ratio = occupancy.get(key);
          const isSelected = key === selectedKey;
          const isToday = key === dayKey(today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              title={
                ratio
                  ? `${i + 1} ${monthLabel} · ${Math.round(ratio * 100)}% ocupat`
                  : `${i + 1} ${monthLabel} · liber`
              }
              className={cn(
                "relative flex h-7 items-center justify-center rounded-md text-[11.5px] tabular-nums transition-colors",
                heatClass(ratio),
                !ratio && "hover:bg-muted",
                isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background font-semibold",
                isToday && !isSelected && "ring-1 ring-foreground/40"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5">
        <span className="text-[10px] text-muted-foreground">Liber</span>
        <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-transparent via-red-200 to-red-600 ring-1 ring-inset ring-border dark:via-red-500/30 dark:to-red-500/80" />
        <span className="text-[10px] text-muted-foreground">Plin</span>
      </div>
    </div>
  );
}
