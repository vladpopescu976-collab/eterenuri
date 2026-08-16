"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Daca poza nu poate fi incarcata (link extern mort, storage indisponibil),
// afisam acelasi fundal si aceeasi pictograma ca la terenurile fara poze,
// in loc de o imagine rupta.
export function FieldImage({
  src,
  alt,
  sizes,
  priority,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-muted">
        {fallback}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
