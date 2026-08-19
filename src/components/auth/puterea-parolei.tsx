"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

const ETICHETE = ["Foarte slabă", "Slabă", "Acceptabilă", "Bună", "Puternică"];
const CULORI = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

/** Cât de bună e parola, cât o scrii. Nu blochează nimic, doar arată. */
export function PutereaParolei({ parola }: { parola: string }) {
  const scor = useMemo(() => {
    if (!parola) return 0;
    let puncte = 0;
    if (parola.length >= 8) puncte++;
    if (parola.length >= 12) puncte++;
    if (/[a-z]/.test(parola) && /[A-Z]/.test(parola)) puncte++;
    if (/\d/.test(parola)) puncte++;
    if (/[^\w\s]/.test(parola)) puncte++;
    return Math.min(puncte, 4);
  }, [parola]);

  if (!parola) return null;

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < scor ? CULORI[scor] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Parolă {ETICHETE[scor].toLowerCase()}</p>
    </div>
  );
}
