"use client";

import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { sportMeta } from "@/lib/sports";
import type { SportType } from "@prisma/client";
import { cn } from "@/lib/utils";

export const TOATE = "TOATE";

export type TerenSelectabil = { id: string; name: string; sportType: string };

/**
 * Alegerea în două trepte: întâi sportul, apoi terenul din sportul acela.
 *
 * O singură listă cu toate terenurile devine nefolosibilă când sunt douăzeci:
 * trebuie citite toate ca să fie găsit cel căutat. Sportul taie lista la
 * două-trei nume.
 */
export function SelectorSportTeren({
  terenuri,
  sportAles,
  terenAles,
  laSport,
  laTeren,
  className,
}: {
  terenuri: TerenSelectabil[];
  sportAles: string;
  terenAles: string;
  laSport: (sport: string) => void;
  laTeren: (teren: string) => void;
  className?: string;
}) {
  const sporturi = useMemo(() => {
    const numarate = new Map<string, number>();
    for (const teren of terenuri) {
      numarate.set(teren.sportType, (numarate.get(teren.sportType) ?? 0) + 1);
    }
    return [...numarate.entries()].sort((a, b) => eticheta(a[0]).localeCompare(eticheta(b[0]), "ro"));
  }, [terenuri]);

  const dinSport = useMemo(
    () => (sportAles === TOATE ? terenuri : terenuri.filter((t) => t.sportType === sportAles)),
    [terenuri, sportAles]
  );

  if (terenuri.length < 2) return null;

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <div className="min-w-[168px] flex-1 sm:flex-none">
        <Label className="text-[11.5px] text-muted-foreground">Sport</Label>
        <Select
          value={sportAles}
          onValueChange={(valoare) => {
            if (!valoare) return;
            laSport(valoare);
            // Terenul ales aparținea altui sport, deci nu mai are ce căuta aici.
            laTeren(TOATE);
          }}
        >
          <SelectTrigger className="mt-1 w-full">
            {/* Fără funcția asta, Base UI afișează valoarea brută. */}
            <SelectValue>
              {(valoare) =>
                valoare === TOATE ? "Toate sporturile" : eticheta(String(valoare))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOATE}>Toate sporturile</SelectItem>
            {sporturi.map(([sport, numar]) => (
              <SelectItem key={sport} value={sport}>
                {eticheta(sport)} ({numar})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[208px] flex-1 sm:flex-none">
        <Label className="text-[11.5px] text-muted-foreground">Teren</Label>
        <Select value={terenAles} onValueChange={(valoare) => valoare && laTeren(valoare)}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue>
              {(valoare) =>
                valoare === TOATE
                  ? dinSport.length === terenuri.length
                    ? "Toate terenurile"
                    : `Toate (${dinSport.length})`
                  : terenuri.find((t) => t.id === valoare)?.name ?? "Toate terenurile"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOATE}>
              {dinSport.length === terenuri.length ? "Toate terenurile" : `Toate (${dinSport.length})`}
            </SelectItem>
            {dinSport.map((teren) => (
              <SelectItem key={teren.id} value={teren.id}>
                {teren.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function eticheta(sport: string): string {
  return sportMeta[sport as SportType]?.label ?? sport;
}

/** Terenurile care rămân după alegere — aceeași regulă peste tot. */
export function filtreazaTerenuri<T extends TerenSelectabil>(
  terenuri: T[],
  sportAles: string,
  terenAles: string
): T[] {
  const dinSport = sportAles === TOATE ? terenuri : terenuri.filter((t) => t.sportType === sportAles);
  return terenAles === TOATE ? dinSport : dinSport.filter((t) => t.id === terenAles);
}
