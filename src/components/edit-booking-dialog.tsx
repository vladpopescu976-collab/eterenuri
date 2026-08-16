"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBookedSlots, updateBookingTime } from "@/lib/actions/bookings";
import { localDateTimeToIso, toDateInput } from "@/lib/datetime";
import {
  busyHours,
  describeOccupied,
  hourLabels,
  hourOf,
  rangeIsBusy,
  type Interval,
} from "@/lib/availability";

export function EditBookingDialog({
  bookingId,
  fieldId,
  fieldName,
  openingHour,
  closingHour,
  currentStart,
  currentEnd,
  open,
  onOpenChange,
}: {
  bookingId: string;
  fieldId: string;
  fieldName: string;
  openingHour: number;
  closingHour: number;
  currentStart: Date;
  currentEnd: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(() => toDateInput(currentStart));
  const [start, setStart] = useState(() => `${String(currentStart.getHours()).padStart(2, "0")}:00`);
  const [end, setEnd] = useState(() => `${String(currentEnd.getHours()).padStart(2, "0")}:00`);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Rezultatul e ținut împreună cu ziua pentru care a fost cerut, ca starea de
  // „se încarcă” să fie dedusă, nu sincronizată separat.
  const [loaded, setLoaded] = useState<{ day: string; slots: Interval[] } | null>(null);
  const loadingSlots = loaded?.day !== date;
  const occupied = useMemo(
    () => (loaded?.day === date ? loaded.slots : []),
    [loaded, date]
  );

  // Intervalele ocupate se cer la deschiderea dialogului și la fiecare
  // schimbare de dată. Propria rezervare e exclusă, altfel orele ei ar apărea
  // ca fiind ocupate de altcineva.
  useEffect(() => {
    if (!open) return;
    const parsed = parseDay(date);
    if (!parsed) return;

    let abandoned = false;
    const dayEnd = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);

    getBookedSlots({
      fieldId,
      dayStart: parsed.toISOString(),
      dayEnd: dayEnd.toISOString(),
      excludeBookingId: bookingId,
    }).then((result) => {
      if (abandoned) return;
      setLoaded({
        day: date,
        slots: result.ok
          ? result.data.map((s) => ({ start: new Date(s.start), end: new Date(s.end) }))
          : [],
      });
    });

    return () => {
      abandoned = true;
    };
  }, [open, date, fieldId, bookingId]);

  const day = parseDay(date);
  const busy = useMemo(
    () => (day ? busyHours(day, occupied, openingHour, closingHour) : new Set<number>()),
    [day, occupied, openingHour, closingHour]
  );

  const startOptions = hourLabels(openingHour, closingHour);
  const endOptions = start ? hourLabels(hourOf(start) + 1, closingHour + 1) : [];

  function endIsBusy(endLabel: string) {
    return start ? rangeIsBusy(hourOf(start), hourOf(endLabel), busy) : false;
  }

  function submit() {
    setError("");
    if (!date || !start || !end) {
      setError("Alege data și intervalul orar.");
      return;
    }
    if (busy.has(hourOf(start)) || endIsBusy(end)) {
      setError(`Intervalul ${start}–${end} se suprapune cu o rezervare existentă. Alege altă oră.`);
      return;
    }

    const startTime = localDateTimeToIso(date, start);
    const endTime = localDateTimeToIso(date, end);
    if (!startTime || !endTime) {
      setError("Data sau ora aleasă nu este validă.");
      return;
    }

    startTransition(async () => {
      const result = await updateBookingTime({ bookingId, startTime, endTime });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Rezervarea a fost modificată și retrimisă spre confirmare.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifică rezervarea</DialogTitle>
          <DialogDescription>{fieldName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-booking-date">Dată</Label>
            <Input
              id="edit-booking-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError("");
              }}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ora start</Label>
              <Select
                value={start}
                onValueChange={(v) => {
                  if (!v) return;
                  if (busy.has(hourOf(v))) {
                    setError(`Intervalul ${v} este deja rezervat pe acest teren. Alege altă oră.`);
                    return;
                  }
                  setError("");
                  setStart(v);
                  setEnd("");
                }}
                disabled={loadingSlots}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder={loadingSlots ? "Se verifică…" : "Start"} />
                </SelectTrigger>
                <SelectContent>
                  {startOptions.map((h) => {
                    const taken = busy.has(hourOf(h));
                    return (
                      <SelectItem key={h} value={h} className={taken ? "opacity-45" : undefined}>
                        {h}
                        {taken && <span className="ml-1.5 text-[11px]">· ocupat</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ora sfârșit</Label>
              <Select
                value={end}
                onValueChange={(v) => {
                  if (!v) return;
                  if (endIsBusy(v)) {
                    setError(`Intervalul ${start}–${v} trece peste o rezervare existentă. Alege altă oră.`);
                    return;
                  }
                  setError("");
                  setEnd(v);
                }}
                disabled={!start || loadingSlots}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Sfârșit" />
                </SelectTrigger>
                <SelectContent>
                  {endOptions.map((h) => {
                    const taken = endIsBusy(h);
                    return (
                      <SelectItem key={h} value={h} className={taken ? "opacity-45" : undefined}>
                        {h}
                        {taken && <span className="ml-1.5 text-[11px]">· ocupat</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!loadingSlots && occupied.length > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
              Deja rezervat în această zi:{" "}
              <span className="font-medium text-foreground">{describeOccupied(occupied)}</span>
            </p>
          )}

          <p className="text-[11.5px] text-muted-foreground">
            După modificare, rezervarea va aștepta din nou confirmarea proprietarului.
          </p>
        </div>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={isPending || loadingSlots}>
            {isPending ? "Se salvează…" : "Salvează"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
