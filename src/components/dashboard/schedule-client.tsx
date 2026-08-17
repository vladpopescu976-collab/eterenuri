"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Clock3, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import { BlockSlotDialog } from "@/components/dashboard/block-slot-dialog";
import { DayHeatPicker } from "@/components/dashboard/day-heat-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { unblockSlot } from "@/lib/actions/blocked-slots";
import { toDateInput, toTimeInput } from "@/lib/datetime";
import { sportMeta } from "@/lib/sports";
import type { BookingStatus, SportType } from "@prisma/client";

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const BLOCK_BG: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-500/10",
  PENDING: "bg-amber-50 dark:bg-amber-500/10",
  REJECTED: "bg-rose-50 dark:bg-rose-500/10",
  RESCHEDULE_PROPOSED: "bg-blue-50 dark:bg-blue-500/10",
  CANCELLED: "bg-muted",
};
const BLOCK_BORDER: Record<string, string> = {
  CONFIRMED: "border-emerald-500",
  PENDING: "border-amber-500",
  REJECTED: "border-rose-500",
  RESCHEDULE_PROPOSED: "border-blue-500",
  CANCELLED: "border-muted-foreground",
};
const BLOCK_FG: Record<string, string> = {
  CONFIRMED: "text-emerald-700 dark:text-emerald-400",
  PENDING: "text-amber-700 dark:text-amber-400",
  REJECTED: "text-rose-700 dark:text-rose-400",
  RESCHEDULE_PROPOSED: "text-blue-700 dark:text-blue-400",
  CANCELLED: "text-muted-foreground",
};

type Booking = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  customer: { name: string };
  field: { id: string; name: string };
};

function hourOf(d: Date) {
  return d.getHours() + d.getMinutes() / 60;
}
function isoDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}
function fmtHour(h: number) {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

type BlockedSlot = {
  id: string;
  fieldId: string;
  startTime: Date;
  endTime: Date;
  reason: string | null;
};

type ScheduleField = {
  id: string;
  name: string;
  sportType: string;
  openingHour: number;
  closingHour: number;
};

export function ScheduleClient({
  fields,
  bookings,
  blockedSlots,
}: {
  fields: ScheduleField[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selected, setSelected] = useState<Booking | null>(null);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ce ocupă efectiv terenul: rezervările active plus orele blocate manual.
  const heatIntervals = useMemo(
    () => [
      ...bookings
        .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
        .map((b) => ({ fieldId: b.field.id, startTime: b.startTime, endTime: b.endTime })),
      ...blockedSlots.map((s) => ({
        fieldId: s.fieldId,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    ],
    [bookings, blockedSlots]
  );

  const dayBookings = useMemo(
    () => bookings.filter((b) => isoDate(b.startTime) === isoDate(selectedDate)),
    [bookings, selectedDate]
  );

  const dayBlocked = useMemo(
    () => blockedSlots.filter((s) => isoDate(s.startTime) === isoDate(selectedDate)),
    [blockedSlots, selectedDate]
  );

  function removeBlock(id: string) {
    startTransition(async () => {
      const result = await unblockSlot(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Intervalul a fost deblocat.");
    });
  }

  const isToday = isoDate(selectedDate) === isoDate(new Date());
  const weekdayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long" });
  const longDateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  // Etichetă scurtă pentru butonul din mijloc, ca să nu lățească bara.
  const shortDateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-[20px] font-semibold capitalize">{weekdayFmt.format(selectedDate)}</h1>
          <p className="text-[13px] text-muted-foreground">{longDateFmt.format(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Ziua anterioară</span>
            </button>
            {/* Data vizitată se vede mereu, iar apăsarea deschide un calendar
                în care zilele sunt colorate după cât de ocupate sunt. */}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    title="Alege ziua"
                    className={
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium tabular-nums " +
                      (isToday ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted")
                    }
                  />
                }
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {isToday && <span>Azi ·</span>}
                {shortDateFmt.format(selectedDate)}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-auto p-0">
                <DayHeatPicker
                  fields={fields}
                  intervals={heatIntervals}
                  selectedDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setPickerOpen(false);
                  }}
                />
                {!isToday && (
                  <div className="border-t p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(new Date());
                        setPickerOpen(false);
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10"
                    >
                      Înapoi la azi
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span className="hidden sm:inline">Ziua următoare</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {fields.length > 0 && (
            <button
              type="button"
              onClick={() => setBlockOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Blochează ore
            </button>
          )}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="text-[13.5px] font-medium">Niciun teren adăugat</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Adaugă un teren din secțiunea „Setări terenuri” pentru a vedea orarul.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
          <div style={{ minWidth: 120 + fields.length * 180 }}>
            <div className="grid border-b" style={{ gridTemplateColumns: `56px repeat(${fields.length}, 1fr)` }}>
              <div />
              {fields.map((f) => (
                <div key={f.id} className="border-l px-3 py-3">
                  <p className="truncate text-[12px] font-semibold">{f.name}</p>
                  <p className="truncate text-[10.5px] text-muted-foreground">
                    {sportMeta[f.sportType as SportType]?.label ?? f.sportType}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${fields.length}, 1fr)` }}>
              <div className="relative">
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end border-b pr-2">
                    <span className="-mt-2 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {fields.map((field) => (
                <div key={field.id} className="relative border-l">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b" />
                  ))}

                  {dayBlocked
                    .filter((s) => s.fieldId === field.id)
                    .map((s) => {
                      const start = hourOf(s.startTime);
                      const end = hourOf(s.endTime);
                      const top = (start - START_HOUR) * HOUR_HEIGHT;
                      const height = Math.max((end - start) * HOUR_HEIGHT - 4, 30);
                      return (
                        <div
                          key={s.id}
                          style={{
                            top,
                            height,
                            backgroundImage:
                              "repeating-linear-gradient(45deg, rgba(100,116,139,0.13) 0 6px, transparent 6px 12px)",
                          }}
                          className="group absolute inset-x-1 z-10 flex flex-col items-start overflow-hidden rounded-lg border-l-[3px] border-slate-400 bg-muted px-2 py-1.5 text-left text-muted-foreground shadow-sm"
                        >
                          <span className="flex items-center gap-1 truncate text-[11.5px] font-semibold leading-tight">
                            <Lock className="h-3 w-3 shrink-0" />
                            {s.reason || "Blocat"}
                          </span>
                          <span className="mt-auto truncate font-mono text-[10.5px] leading-tight opacity-80 tabular-nums">
                            {fmtHour(start)}–{fmtHour(end)}
                          </span>
                          <button
                            type="button"
                            disabled={isPending}
                            aria-label="Deblochează intervalul"
                            title="Deblochează"
                            onClick={() => removeBlock(s.id)}
                            className="absolute right-1 top-1 rounded-md p-1 opacity-0 transition-opacity hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}

                  <AnimatePresence>
                    {dayBookings
                      .filter((b) => b.field.id === field.id)
                      .map((b) => {
                        const start = hourOf(b.startTime);
                        const end = hourOf(b.endTime);
                        const top = (start - START_HOUR) * HOUR_HEIGHT;
                        const height = Math.max((end - start) * HOUR_HEIGHT - 4, 30);
                        return (
                          <motion.button
                            key={b.id}
                            type="button"
                            layout
                            onClick={() => setSelected(b)}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.015 }}
                            style={{ top, height }}
                            className={`absolute inset-x-1 z-10 flex flex-col items-start overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm ${BLOCK_BG[b.status]} ${BLOCK_BORDER[b.status]} ${BLOCK_FG[b.status]}`}
                          >
                            <span className="truncate text-[11.5px] font-semibold leading-tight">{b.customer.name}</span>
                            <span className="mt-auto truncate font-mono text-[10.5px] leading-tight opacity-80 tabular-nums">
                              {fmtHour(start)}–{fmtHour(end)}
                            </span>
                          </motion.button>
                        );
                      })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {dayBookings.length === 0 && fields.length > 0 && (
        <p className="text-center text-[12.5px] text-muted-foreground">Nicio rezervare în această zi.</p>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-xl"
            >
              <StatusBadge status={selected.status} />
              <h4 className="mt-2 font-heading text-[17px] font-semibold">{selected.field.name}</h4>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {fmtHour(hourOf(selected.startTime))} – {fmtHour(hourOf(selected.endTime))}
              </p>
              <p className="mt-3 text-[13.5px]">
                Client: <span className="font-medium">{selected.customer.name}</span>
              </p>
              <p className="mt-1 font-mono text-[13px] tabular-nums">{selected.totalPrice.toFixed(0)} RON</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium hover:bg-muted"
                >
                  Închide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRescheduling(selected);
                    setSelected(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  Mută rezervarea
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {rescheduling && (
        <RescheduleDialog
          bookingId={rescheduling.id}
          clientName={rescheduling.customer.name}
          fieldName={rescheduling.field.name}
          defaultDate={toDateInput(rescheduling.startTime)}
          defaultStart={toTimeInput(rescheduling.startTime)}
          defaultEnd={toTimeInput(rescheduling.endTime)}
          open={!!rescheduling}
          onOpenChange={(open) => !open && setRescheduling(null)}
        />
      )}

      {fields.length > 0 && (
        <BlockSlotDialog
          fields={fields}
          defaultDate={selectedDate}
          open={blockOpen}
          onOpenChange={setBlockOpen}
        />
      )}
    </div>
  );
}
