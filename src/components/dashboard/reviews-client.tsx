"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/reviews";
import { replyToReview } from "@/lib/actions/reviews";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  createdAt: Date;
  author: { name: string };
  field: { name: string };
};

function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(review.ownerReply ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError("");
    if (!reply.trim()) {
      setError("Scrie un răspuns.");
      return;
    }
    startTransition(async () => {
      const result = await replyToReview({ reviewId: review.id, reply: reply.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Răspunsul a fost publicat.");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={review.rating} />
          <span className="text-[13.5px] font-medium">{review.author.name}</span>
          <span className="text-[12px] text-muted-foreground">· {review.field.name}</span>
        </div>
        <span className="text-[12px] text-muted-foreground">
          {review.createdAt.toLocaleDateString("ro-RO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {review.comment && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{review.comment}</p>
      )}

      {review.ownerReply && !open && (
        <div className="mt-3 border-l-2 border-primary/40 pl-3">
          <p className="text-[12px] font-medium text-primary">Răspunsul tău</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{review.ownerReply}</p>
        </div>
      )}

      {open ? (
        <div className="mt-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Mulțumim pentru feedback! …"
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
              {isPending ? "Se publică…" : "Publică răspunsul"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {review.ownerReply ? "Modifică răspunsul" : "Răspunde"}
        </button>
      )}
    </div>
  );
}

export function ReviewsClient({ reviews }: { reviews: Review[] }) {
  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const withoutReply = reviews.filter((r) => !r.ownerReply).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-[20px] font-semibold">Recenzii</h1>
        <p className="text-[13px] text-muted-foreground">
          {reviews.length === 0
            ? "Încă nu ai primit recenzii."
            : `${reviews.length} ${reviews.length === 1 ? "recenzie" : "recenzii"} · media ${average.toFixed(1)}/5${
                withoutReply > 0 ? ` · ${withoutReply} fără răspuns` : ""
              }`}
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Star className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[13.5px] font-medium">Nicio recenzie încă</p>
          <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            Clienții pot lăsa o recenzie după ce se încheie o rezervare confirmată.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
