"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarIcon, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sportOptions } from "@/lib/sports";

export function SearchFilters({
  sport,
  oras,
  pretMax,
  data,
}: {
  sport: string;
  oras: string;
  pretMax: string;
  data: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Stare locală ca inputurile să rămână fluide; URL-ul e sursa de adevăr.
  const [localOras, setLocalOras] = useState(oras);
  const [localPret, setLocalPret] = useState(pretMax);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    startTransition(() => {
      router.push(`/cauta-terenuri${params.toString() ? `?${params}` : ""}`);
    });
  }

  const selectedDate = data ? new Date(`${data}T00:00:00`) : undefined;
  const activeCount = [sport, oras, pretMax, data].filter(Boolean).length;

  const panel = (
    <div className="space-y-5">
      <div>
        <Label className="text-[12.5px] font-medium text-muted-foreground">Sport</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => apply({ sport: undefined })}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              !sport ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Toate
          </button>
          {sportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => apply({ sport: sport === option.value ? undefined : option.value })}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                sport === option.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="filtru-oras" className="text-[12.5px] font-medium text-muted-foreground">
          Oraș
        </Label>
        <Input
          id="filtru-oras"
          value={localOras}
          onChange={(e) => setLocalOras(e.target.value)}
          onBlur={() => localOras !== oras && apply({ oras: localOras || undefined })}
          onKeyDown={(e) => e.key === "Enter" && apply({ oras: localOras || undefined })}
          placeholder="ex. București"
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="filtru-pret" className="text-[12.5px] font-medium text-muted-foreground">
          Preț maxim / oră
        </Label>
        <div className="mt-2 flex items-center rounded-lg border focus-within:border-primary">
          <Input
            id="filtru-pret"
            type="number"
            min={0}
            value={localPret}
            onChange={(e) => setLocalPret(e.target.value)}
            onBlur={() => localPret !== pretMax && apply({ pretMax: localPret || undefined })}
            onKeyDown={(e) => e.key === "Enter" && apply({ pretMax: localPret || undefined })}
            placeholder="Fără limită"
            className="border-0 tabular-nums shadow-none focus-visible:ring-0"
          />
          <span className="pr-3 text-[12px] text-muted-foreground">RON</span>
        </div>
      </div>

      <div>
        <Label className="text-[12.5px] font-medium text-muted-foreground">Disponibil în data de</Label>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px]"
              />
            }
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={selectedDate ? "" : "text-muted-foreground"}>
              {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: ro }) : "Orice zi"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(value) => {
                setDatePopoverOpen(false);
                apply({ data: value ? format(value, "yyyy-MM-dd") : undefined });
              }}
              locale={ro}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>
        {data && (
          <button
            type="button"
            onClick={() => apply({ data: undefined })}
            className="mt-1.5 text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Șterge data
          </button>
        )}
      </div>

      {activeCount > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setLocalOras("");
            setLocalPret("");
            startTransition(() => router.push("/cauta-terenuri"));
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Resetează filtrele
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobil: buton care deschide filtrele */}
      <div className="lg:hidden">
        <Button variant="outline" className="w-full" onClick={() => setMobileOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filtre
          {activeCount > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative ml-auto flex h-full w-[85%] max-w-sm flex-col overflow-y-auto bg-background p-5 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <p className="font-heading text-base font-semibold">Filtre</p>
                <button
                  type="button"
                  aria-label="Închide filtrele"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {panel}
              <Button className="mt-6 w-full" onClick={() => setMobileOpen(false)}>
                Vezi rezultatele
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: sidebar fix */}
      <aside
        className={cn(
          "hidden lg:block lg:sticky lg:top-24 lg:h-fit",
          isPending && "opacity-60 transition-opacity"
        )}
      >
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="mb-5 font-heading text-[15px] font-semibold">Filtre</p>
          {panel}
        </div>
      </aside>
    </>
  );
}
