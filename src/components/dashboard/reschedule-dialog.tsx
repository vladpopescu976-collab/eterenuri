"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { proposeReschedule } from "@/lib/actions/business";

export function RescheduleDialog({
  bookingId,
  clientName,
  fieldName,
  defaultDate,
  defaultStart,
  defaultEnd,
  open,
  onOpenChange,
}: {
  bookingId: string;
  clientName: string;
  fieldName: string;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await proposeReschedule({ bookingId, date, startTime: start, endTime: end });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Propunerea de mutare a fost trimisă clientului.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Propune o nouă oră</DialogTitle>
          <DialogDescription>
            Pentru {clientName} · {fieldName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="reschedule-date">Dată</Label>
            <Input id="reschedule-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reschedule-start">Ora start</Label>
              <Input
                id="reschedule-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reschedule-end">Ora sfârșit</Label>
              <Input id="reschedule-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5" />
            </div>
          </div>
        </div>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={isPending}>
            {isPending ? "Se trimite…" : "Trimite propunerea"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
