"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blockSlot } from "@/lib/actions/blocked-slots";
import { localDateTimeToIso, toDateInput } from "@/lib/datetime";
import { hourLabels, hourOf } from "@/lib/availability";

const REASON_SUGGESTIONS = [
  "Mentenanță",
  "Rezervare telefonică",
  "Eveniment privat",
  "Antrenament propriu",
];

export function BlockSlotDialog({
  fields,
  defaultDate,
  open,
  onOpenChange,
}: {
  fields: { id: string; name: string; openingHour: number; closingHour: number }[];
  defaultDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "");
  const [date, setDate] = useState(() => toDateInput(defaultDate));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const field = fields.find((f) => f.id === fieldId) ?? fields[0];
  const startOptions = field ? hourLabels(field.openingHour, field.closingHour) : [];
  const endOptions = field && start ? hourLabels(hourOf(start) + 1, field.closingHour + 1) : [];

  function submit() {
    setError("");
    if (!fieldId || !date || !start || !end) {
      setError("Alege terenul, data și intervalul orar.");
      return;
    }

    const startTime = localDateTimeToIso(date, start);
    const endTime = localDateTimeToIso(date, end);
    if (!startTime || !endTime) {
      setError("Data sau ora aleasă nu este validă.");
      return;
    }

    startTransition(async () => {
      const result = await blockSlot({
        fieldId,
        startTime,
        endTime,
        reason: reason.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Intervalul a fost blocat.");
      setStart("");
      setEnd("");
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Blochează ore</DialogTitle>
          <DialogDescription>
            Orele blocate nu mai pot fi rezervate de clienți. Folosește-le pentru mentenanță sau
            rezervări primite la telefon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Teren</Label>
            <Select
              value={fieldId}
              onValueChange={(v) => {
                if (!v) return;
                setFieldId(v);
                setStart("");
                setEnd("");
              }}
            >
              <SelectTrigger className="mt-1.5 w-full">
                {/* Fără funcția asta, Base UI afișează valoarea brută (id-ul). */}
                <SelectValue placeholder="Alege terenul">
                  {(value) => fields.find((f) => f.id === value)?.name ?? "Alege terenul"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="block-date">Dată</Label>
            <Input
              id="block-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
                  setStart(v);
                  setEnd("");
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
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
              <Label>Ora sfârșit</Label>
              <Select value={end} onValueChange={(v) => v && setEnd(v)} disabled={!start}>
                <SelectTrigger className="mt-1.5 w-full">
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
            <Label htmlFor="block-reason">Motiv (opțional)</Label>
            <Input
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Mentenanță gazon"
              className="mt-1.5"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REASON_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReason(s)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors " +
                    (reason === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={isPending}>
            {isPending ? "Se blochează…" : "Blochează"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
