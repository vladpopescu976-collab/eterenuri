import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FieldCard } from "@/components/field-card";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Terenurile mele favorite — Scorer",
};

export default async function FavoritePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/autentificare?tip=personal");
  }
  if (session.user.role !== "PERSONAL") {
    redirect("/dashboard/business");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { field: true },
  });

  const visible = favorites.filter((f) => f.field.isActive);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Terenuri favorite</h1>
      <p className="mt-1.5 text-muted-foreground">
        Terenurile pe care le-ai salvat, la un click distanță.
      </p>

      <div className="mt-8">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Heart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium">Niciun teren salvat</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Apasă pe inima din colțul unui teren ca să îl găsești mai repede data viitoare.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              nativeButton={false}
              render={<Link href="/cauta-terenuri" />}
            >
              Caută terenuri
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? "teren salvat" : "terenuri salvate"}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((favorite, index) => (
                <FieldCard
                  key={favorite.id}
                  index={index}
                  isFavorite
                  field={{
                    id: favorite.field.id,
                    name: favorite.field.name,
                    city: favorite.field.city,
                    sportType: favorite.field.sportType,
                    pricePerHour: Number(favorite.field.pricePerHour),
                    images: favorite.field.images,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
