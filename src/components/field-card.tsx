"use client";

import Link from "next/link";
import { FieldImage } from "@/components/field-image";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorite-button";
import { sportMeta } from "@/lib/sports";
import type { SportType } from "@prisma/client";

export type FieldCardData = {
  id: string;
  name: string;
  city: string;
  sportType: SportType;
  pricePerHour: number;
  images: string[];
};

export function FieldCard({
  field,
  index = 0,
  isFavorite,
}: {
  field: FieldCardData;
  index?: number;
  /** Lipsește pentru vizitatori și conturi Business — inima nu se afișează. */
  isFavorite?: boolean;
}) {
  const meta = sportMeta[field.sportType];
  const SportIcon = meta.icon;
  const coverImage = field.images[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] as const }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      {isFavorite !== undefined && (
        <FavoriteButton fieldId={field.id} initialFavorite={isFavorite} />
      )}
      <Link
        href={`/terenuri/${field.id}`}
        className="block overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary/10"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-muted">
          {coverImage ? (
            <FieldImage
              src={coverImage}
              alt={field.name}
              sizes="(max-width: 640px) 100vw, 33vw"
              className="transition-transform duration-500 group-hover:scale-105"
              fallback={<SportIcon className="h-12 w-12 text-primary/40" strokeWidth={1.5} />}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
              <SportIcon className="h-12 w-12 text-primary/40" strokeWidth={1.5} />
            </div>
          )}
          <Badge className="absolute left-3 top-3 gap-1 bg-background/90 text-foreground backdrop-blur-sm">
            <SportIcon className="h-3.5 w-3.5" />
            {meta.label}
          </Badge>
        </div>

        <div className="space-y-2 p-4">
          <p className="truncate font-medium leading-tight">{field.name}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {field.city}
          </p>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-lg font-semibold">{field.pricePerHour.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">RON / oră</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
