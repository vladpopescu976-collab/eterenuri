import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, SearchX } from "lucide-react";
import type { Prisma, SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldCard } from "@/components/field-card";
import { SearchFilters } from "@/components/search-filters";
import { sportMeta } from "@/lib/sports";
import { dayRangeInAppZone } from "@/lib/datetime";
import { getFavoriteFieldIds } from "@/lib/favorites";
import { cheieOras, normalizeazaOras } from "@/lib/orase";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Caută terenuri — Scorer",
};

type SearchParams = { sport?: string; oras?: string; pretMax?: string; data?: string };

function isSportType(value: string | undefined): value is SportType {
  return !!value && value in sportMeta;
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function Results({ sport, oras, pretMax, data }: SearchParams) {
  const favoriteIds = await getFavoriteFieldIds();
  const where: Prisma.FieldWhereInput = { isActive: true };

  if (isSportType(sport)) where.sportType = sport;
  // Pe cheia fără diacritice, ca „Timișoara” să găsească și „timisoara”.
  if (oras?.trim()) where.cityKey = { contains: cheieOras(oras), mode: "insensitive" };

  const maxPrice = Number(pretMax);
  if (pretMax && Number.isFinite(maxPrice) && maxPrice > 0) {
    where.pricePerHour = { lte: maxPrice };
  }

  // Când e aleasă o dată, aducem rezervările din ziua respectivă ca să putem
  // exclude terenurile deja ocupate complet. Fără dată, folosim un interval
  // gol (epoch → epoch), deci lista de rezervări vine goală și nu filtrăm.
  //
  // Ziua e calculată în fusul României, nu în cel al serverului: pe Vercel
  // serverul merge pe UTC, deci fereastra era decalată cu câteva ore și
  // rezervările de seara cădeau în ziua următoare.
  const epoch = new Date(0);
  const range = data ? dayRangeInAppZone(data) : null;
  const dayStart = range?.start ?? epoch;
  const dayEnd = range?.end ?? epoch;

  const fields = await prisma.field.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          // O rezervare începută seara devreme și terminată după miezul nopții
          // atinge ziua căutată chiar dacă nu începe în ea.
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });

  const visible = range
    ? fields.filter((field) => {
        // Numărăm doar orele ocupate care cad în programul terenului — altfel
        // o rezervare din afara programului putea „umple” ziua degeaba.
        const openFrom = new Date(dayStart.getTime() + field.openingHour * 3_600_000);
        const openTo = new Date(dayStart.getTime() + field.closingHour * 3_600_000);

        const bookedHours = field.bookings.reduce((sum, b) => {
          const from = Math.max(b.startTime.getTime(), openFrom.getTime());
          const to = Math.min(b.endTime.getTime(), openTo.getTime());
          return sum + Math.max(0, to - from) / 3_600_000;
        }, 0);

        return bookedHours < field.closingHour - field.openingHour;
      })
    : fields;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-medium">Niciun teren găsit</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Încearcă să elimini câteva filtre sau caută în alt oraș.
        </p>
        <Button variant="outline" className="mt-6" nativeButton={false} render={<Link href="/cauta-terenuri" />}>
          Vezi toate terenurile
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "teren găsit" : "terenuri găsite"}
        {data && " · disponibile în ziua aleasă"}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((field, index) => (
          <FieldCard
            key={field.id}
            index={index}
            isFavorite={favoriteIds ? favoriteIds.has(field.id) : undefined}
            field={{
              id: field.id,
              name: field.name,
              city: normalizeazaOras(field.city),
              sportType: field.sportType,
              pricePerHour: Number(field.pricePerHour),
              images: field.images,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default async function CautaTerenuriPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { sport = "", oras = "", pretMax = "", data = "" } = params;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Caută terenuri</h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Filtrează după sport, oraș, preț și disponibilitate.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-10">
        <SearchFilters sport={sport} oras={oras} pretMax={pretMax} data={data} />

        <div className="min-w-0">
          <Suspense key={`${sport}|${oras}|${pretMax}|${data}`} fallback={<ResultsSkeleton />}>
            <Results sport={sport} oras={oras} pretMax={pretMax} data={data} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
