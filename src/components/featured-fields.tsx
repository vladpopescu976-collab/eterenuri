import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { normalizeazaOras } from "@/lib/orase";
import { FieldCard } from "@/components/field-card";

export async function FeaturedFields() {
  const fields = await prisma.field.findMany({
    where: { isActive: true },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  return (
    <section id="terenuri" className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Terenuri recomandate</h2>
          <p className="mt-2 text-muted-foreground">
            Descoperă terenurile adăugate de proprietari pe platformă.
          </p>
        </div>
        <Button
          variant="ghost"
          className="shrink-0"
          nativeButton={false}
          render={<Link href="/cauta-terenuri" />}
        >
          Vezi toate terenurile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 font-medium">Niciun teren disponibil momentan</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Revino în curând — proprietarii de terenuri își adaugă spațiile chiar acum.
          </p>
          <Button
            className="mt-6 rounded-full"
            nativeButton={false}
            render={<Link href="/autentificare?tip=business" />}
          >
            Adaugă primul teren
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              index={index}
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
      )}
    </section>
  );
}
