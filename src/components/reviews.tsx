"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/reviews";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} din 5 stele`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
          )}
        />
      ))}
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          aria-label={`${i} ${i === 1 ? "stea" : "stele"}`}
          onMouseEnter={() => setHovered(i)}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Formularul de recenzie, arătat după ce o rezervare confirmată s-a încheiat. */
export function ReviewForm({ bookingId, fieldName }: { bookingId: string; fieldName: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError("");
    if (rating < 1) {
      setError("Alege un rating de la 1 la 5 stele.");
      return;
    }
    startTransition(async () => {
      const result = await submitReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Îți mulțumim pentru recenzie!");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-amber-400 hover:text-amber-600"
      >
        <Star className="h-3.5 w-3.5" />
        Lasă o recenzie
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border bg-muted/40 p-3">
      <p className="text-[12.5px] font-medium">Cum a fost la {fieldName}?</p>
      <div className="mt-2">
        <RatingInput value={rating} onChange={setRating} disabled={isPending} />
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Spune-le și altora cum a fost terenul (opțional)."
        rows={2}
        className="mt-2 bg-background"
      />
      {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Renunță
        </Button>
        <Button type="button" size="sm" className="flex-1" onClick={submit} disabled={isPending}>
          {isPending ? "Se trimite…" : "Trimite recenzia"}
        </Button>
      </div>
    </div>
  );
}
