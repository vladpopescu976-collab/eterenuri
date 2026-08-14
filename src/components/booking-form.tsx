"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBookingRequest } from "@/lib/actions/bookings";

function hourOptions(openingHour: number, closingHour: number) {
  return Array.from({ length: closingHour - openingHour }, (_, i) => {
    const h = openingHour + i;
    return `${String(h).padStart(2, "0")}:00`;
  });
}

export function BookingForm({
  fieldId,
  pricePerHour,
  openingHour,
  closingHour,
  isAuthenticated,
}: {
  fieldId: string;
  pricePerHour: number;
  openingHour: number;
  closingHour: number;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const startOptions = useMemo(() => hourOptions(openingHour, closingHour), [openingHour, closingHour]);
  const endOptions = useMemo(() => {
    if (!start) return [];
    const startHour = Number(start.split(":")[0]);
    return hourOptions(startHour + 1, closingHour + 1);
  }, [start, closingHour]);

  const hours = start && end ? Number(end.split(":")[0]) - Number(start.split(":")[0]) : 0;
  const total = hours > 0 ? hours * pricePerHour : 0;

  function submit() {
    setError("");
    if (!date || !start || !end) {
      setError("Alege data și intervalul orar.");
      return;
    }
    startTransition(async () => {
      try {
        await createBookingRequest({
          fieldId,
          date: format(date, "yyyy-MM-dd"),
          startTime: start,
          endTime: end,
          notes: notes.trim() || undefined,
        });
        toast.success("Cererea de rezervare a fost trimisă! O poți urmări în „Rezervările mele”.");
        router.push("/rezervarile-mele");
      } catch (err) {
        setError(err instanceof Error ? err.message : "A apărut o eroare.");
      }
    });
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center">
        <p className="text-[14px] font-medium">Autentifică-te pentru a rezerva</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Ai nevoie de un cont Personal pentru a trimite o cerere de rezervare.
        </p>
        <Button className="mt-4" render={<Link href="/autentificare?tip=personal" />} nativeButton={false}>
          Autentificare
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <p className="font-heading text-[16px] font-semibold">Rezervă acest teren</p>

      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Data</p>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px]"
              />
            }
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className={date ? "" : "text-muted-foreground"}>
              {date ? format(date, "d MMMM yyyy", { locale: ro }) : "Alege o dată"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(value) => {
                setDate(value);
                setDatePopoverOpen(false);
              }}
              locale={ro}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Ora start</p>
          <Select value={start} onValueChange={(v) => { setStart(v ?? ""); setEnd(""); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Start" />
            </SelectTrigger>
            <SelectContent>
              {startOptions.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Ora sfârșit</p>
          <Select value={end} onValueChange={(v) => setEnd(v ?? "")} disabled={!start}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sfârșit" />
            </SelectTrigger>
            <SelectContent>
              {endOptions.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">Observații (opțional)</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. avem nevoie de mingi." rows={2} />
      </div>

      {hours > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-[13.5px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {hours} {hours === 1 ? "oră" : "ore"}
          </span>
          <span className="font-mono font-semibold tabular-nums">{total} RON</span>
        </div>
      )}

      {error && <p className="text-[12.5px] text-destructive">{error}</p>}

      <Button className="w-full" onClick={submit} disabled={isPending}>
        {isPending ? "Se trimite…" : "Trimite cererea de rezervare"}
      </Button>
    </div>
  );
}
