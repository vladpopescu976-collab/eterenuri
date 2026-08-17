import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewsClient } from "@/components/dashboard/reviews-client";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s.
export const maxDuration = 60;

export default async function BusinessReviewsPage() {
  const session = await auth();
  const ownerId = session!.user.id;

  const reviews = await prisma.review.findMany({
    where: { field: { ownerId } },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      field: { select: { name: true } },
    },
  });

  return <ReviewsClient reviews={reviews} />;
}
