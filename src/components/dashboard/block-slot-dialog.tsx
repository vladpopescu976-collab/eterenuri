"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blockSlot, blockSlotSeries } from "@/lib/actions/blocked-slots";
import { localDateTimeToIso, toDateInput, ziuaSaptamanii } from "@/lib/datetime";
import { hourLabels, hourOf } from "@/lib/availability";
import { cn } from "@/lib/utils";

const REASON_SUGGESTIONS = [
  "Mentenanță",
  "Rezervare telefonică",
  "Eveniment privat",
  "Antrenament propriu",
];

// ISO: 1 = luni … 7 = duminică, ca în restul aplicației.
const ZILE = [
  { valoare: 1, scurt: "L", lung: "luni" },
  { valoare: 2, scurt: "Ma", lung: "marți" },
  { valoare: 3, scurt: "Mi", lung: "miercuri" },
  { valoare: 4, scurt: "J", lung: "joi" },
  { valoare: 5, scurt: "V", lung: "vineri" },
  { valoare: 6, scurt: "S", lung: "sâmbătă" },
  { valoare: 7, scurt: "D", lung: "duminică" },
];

const SAPTAMANI = [4, 8, 12, 26, 52];

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
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Repetarea e oprită implicit: cele mai multe blocări sunt pentru o singură zi.
  const [seRepeta, setSeRepeta] = useState(false);
  const [zile, setZile] = useState<number[]>([]);
  const [saptamani, setSaptamani] = useState(8);

  const field = fields.find((f) => f.id === fieldId) ?? fields[0];
  // Data aleasă e mereu în serie, deci ziua ei pornește bifată.
  const zileAlese = zile.length > 0 ? zile : [ziuaSaptamanii(date)];
  const startOptions = field ? hourLabels(field.openingHour, field.closingHour) : [];
  const endOptions = field && start ? hourLabels(hourOf(start) + 1, field.closingHour + 1) : [];

  function comutaZi(valoare: number) {
    setZile((curente) => {
      const baza = curente.length > 0 ? curente : [ziuaSaptamanii(date)];
      const urmatoare = baza.includes(valoare)
        ? baza.filter((zi) => zi !== valoare)
        : [...baza, valoare];
      return urmatoare;
    });
  }

  function submit() {
    setError("");
    if (!fieldId || !date || !start || !end) {
      setError("Alege terenul, data și intervalul orar.");
      return;
    }

    if (seRepeta) {
      trimiteSeria();
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
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        clientName.trim() ? "Rezervarea a fost notată." : "Intervalul a fost blocat."
      );
      setStart("");
      setEnd("");
      setReason("");
      setClientName("");
      setClientPhone("");
      onOpenChange(false);
    });
  }

  function trimiteSeria() {
    if (zileAlese.length === 0) {
      setError("Alege cel puțin o zi a săptămânii.");
      return;
    }

    startTransition(async () => {
      const result = await blockSlotSeries({
        fieldId,
        zile: zileAlese,
        oraStart: hourOf(start),
        oraSfarsit: hourOf(end),
        dataInceput: date,
        saptamani,
        reason: reason.trim() || undefined,
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const { create, rezervate, blocate } = result.data;
      if (create === 0) {
        setError(
          rezervate > 0
            ? "Toate orele din serie sunt deja rezervate sau blocate."
            : "Orele erau deja blocate — nu s-a adăugat nimic."
        );
        return;
      }

      // Spunem și ce n-a intrat: altfel proprietarul crede că are terenul
      // blocat în zile în care de fapt are un client.
      const detalii: string[] = [];
      if (rezervate > 0) {
        detalii.push(`${rezervate} ${rezervate === 1 ? "oră are" : "ore au"} deja rezervare`);
      }
      if (blocate > 0) {
        detalii.push(`${blocate} ${blocate === 1 ? "era blocată" : "erau blocate"}`);
      }

      toast.success(
        `${create} ${create === 1 ? "interval blocat" : "intervale blocate"}.`,
        detalii.length > 0 ? { description: `Sărite: ${detalii.join(", ")}.` } : undefined
      );

      setStart("");
      setEnd("");
      setReason("");
      setClientName("");
      setClientPhone("");
      setZile([]);
      setSeRepeta(false);
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

          <div className={cn("rounded-lg border p-3", seRepeta && "border-primary/40 bg-primary/5")}>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={seRepeta}
                onChange={(e) => setSeRepeta(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">Se repetă săptămânal</span>
                <span className="block text-[11.5px] text-muted-foreground">
                  Aceeași oră, în fiecare săptămână. Pentru un client care vine mereu în aceeași zi.
                </span>
              </span>
            </label>

            {seRepeta && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label>În ce zile</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ZILE.map((zi) => (
                      <button
                        key={zi.valoare}
                        type="button"
                        aria-pressed={zileAlese.includes(zi.valoare)}
                        aria-label={zi.lung}
                        onClick={() => comutaZi(zi.valoare)}
                        className={cn(
                          "h-9 min-w-9 rounded-lg border px-2 text-[12.5px] font-medium transition-colors",
                          zileAlese.includes(zi.valoare)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {zi.scurt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Câte săptămâni</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SAPTAMANI.map((numar) => (
                      <button
                        key={numar}
                        type="button"
                        aria-pressed={saptamani === numar}
                        onClick={() => setSaptamani(numar)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                          saptamani === numar
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {numar}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                    Începând cu data aleasă mai sus. Orele deja rezervate sau blocate sunt sărite.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <Label htmlFor="block-client">Client (opțional)</Label>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Completează numele dacă notezi o rezervare primită la telefon.
              Lasă gol pentru o blocare obișnuită.
            </p>
            <Input
              id="block-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nume client"
              className="mt-2"
            />
            {clientName.trim() && (
              <Input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Telefon (opțional)"
                className="mt-2"
              />
            )}
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
            {isPending
              ? "Se blochează…"
              : seRepeta
                ? `Blochează ${zileAlese.length * saptamani} intervale`
                : "Blochează"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
