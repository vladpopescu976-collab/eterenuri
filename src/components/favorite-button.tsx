"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/lib/actions/favorites";

export function FavoriteButton({
  fieldId,
  initialFavorite,
  variant = "icon",
  className,
}: {
  fieldId: string;
  initialFavorite: boolean;
  /** "icon" — inimă peste poză; "full" — buton cu text, pe pagina terenului. */
  variant?: "icon" | "full";
  className?: string;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function toggle(event: React.MouseEvent) {
    // Inima stă peste cardul-link, deci fără asta s-ar deschide terenul.
    event.preventDefault();
    event.stopPropagation();

    const next = !favorite;
    setFavorite(next); // răspuns imediat; revenim dacă serverul refuză

    startTransition(async () => {
      const result = await toggleFavorite(fieldId);
      if (!result.ok) {
        setFavorite(!next);
        toast.error(result.error);
        return;
      }
      setFavorite(result.data.favorite);
      router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={favorite}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-60",
          favorite
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
            : "hover:border-rose-300 hover:text-rose-600",
          className
        )}
      >
        <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        {favorite ? "Salvat la favorite" : "Salvează la favorite"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favorite}
      aria-label={favorite ? "Elimină de la favorite" : "Salvează la favorite"}
      title={favorite ? "Elimină de la favorite" : "Salvează la favorite"}
      className={cn(
        "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-60",
        favorite ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground hover:text-rose-600",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
    </button>
  );
}
