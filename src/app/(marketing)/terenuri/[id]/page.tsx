import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Clock, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { BookingForm } from "@/components/booking-form";
import { sportMeta } from "@/lib/sports";

export default async function FieldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [field, session] = await Promise.all([prisma.field.findUnique({ where: { id } }), auth()]);

  if (!field || !field.isActive) {
    notFound();
  }

  const meta = sportMeta[field.sportType];
  const SportIcon = meta.icon;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {field.images.length > 0 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
              <div className="relative col-span-4 row-span-2 aspect-[16/9] overflow-hidden bg-muted sm:col-span-3">
                <Image
                  src={field.images[0]}
                  alt={field.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>
              {field.images.slice(1, 3).map((src, i) => (
                <div key={src} className="relative hidden aspect-square overflow-hidden bg-muted sm:block">
                  <Image
                    src={src}
                    alt={`${field.name} — poza ${i + 2}`}
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
              <div className="col-span-4 row-span-2 flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-muted sm:col-span-3 sm:row-span-2">
                <SportIcon className="h-14 w-14 text-primary/40" strokeWidth={1.5} />
              </div>
              <div className="hidden aspect-square items-center justify-center bg-muted sm:flex">
                <SportIcon className="h-6 w-6 text-primary/30" strokeWidth={1.5} />
              </div>
              <div className="hidden aspect-square items-center justify-center bg-muted/70 sm:flex">
                <SportIcon className="h-6 w-6 text-primary/20" strokeWidth={1.5} />
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1">
                <SportIcon className="h-3.5 w-3.5" />
                {meta.label}
              </Badge>
              {!field.isActive && <Badge variant="outline">Indisponibil</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{field.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {field.address}, {field.city}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Program: {String(field.openingHour).padStart(2, "0")}:00 – {String(field.closingHour).padStart(2, "0")}:00
            </p>
          </div>

          {field.description && (
            <div>
              <h2 className="font-semibold">Descriere</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{field.description}</p>
            </div>
          )}

          {field.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold">Facilități</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {field.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit">
          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">{Number(field.pricePerHour).toFixed(0)}</span>
            <span className="text-muted-foreground">RON / oră</span>
          </div>
          <BookingForm
            fieldId={field.id}
            pricePerHour={Number(field.pricePerHour)}
            openingHour={field.openingHour}
            closingHour={field.closingHour}
            isAuthenticated={!!session?.user}
          />
        </div>
      </div>
    </div>
  );
}
