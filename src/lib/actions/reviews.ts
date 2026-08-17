"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ActionError("Sesiunea a expirat. Autentifică-te din nou.");
  }
  return session;
}

const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z
    .number({ message: "Alege un rating." })
    .int()
    .min(1, "Ratingul trebuie să fie între 1 și 5 stele.")
    .max(5, "Ratingul trebuie să fie între 1 și 5 stele."),
  comment: z.string().trim().max(1000, "Comentariul nu poate depăși 1000 de caractere.").optional(),
});

/**
 * O recenzie se poate lăsa doar pentru o rezervare proprie, confirmată și
 * încheiată — altfel oricine ar putea nota un teren pe care nu a jucat.
 */
export async function submitReview(input: z.infer<typeof reviewSchema>): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = reviewSchema.parse(input);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { review: { select: { id: true } } },
    });

    if (!booking || booking.customerId !== session.user.id) {
      return fail("Rezervarea nu a fost găsită.");
    }
    if (booking.status !== "CONFIRMED") {
      return fail("Poți lăsa o recenzie doar pentru o rezervare confirmată.");
    }
    if (booking.endTime > new Date()) {
      return fail("Poți lăsa o recenzie după ce se încheie rezervarea.");
    }
    if (booking.review) {
      return fail("Ai lăsat deja o recenzie pentru această rezervare.");
    }

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        fieldId: booking.fieldId,
        authorId: session.user.id,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      },
    });

    revalidatePath("/rezervarile-mele");
    revalidatePath(`/terenuri/${booking.fieldId}`);
    revalidatePath("/dashboard/business/recenzii");
    return ok();
  } catch (error) {
    return toActionError("submitReview", error);
  }
}

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z
    .string()
    .trim()
    .min(1, "Scrie un răspuns.")
    .max(1000, "Răspunsul nu poate depăși 1000 de caractere."),
});

export async function replyToReview(input: z.infer<typeof replySchema>): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (session.user.role !== "BUSINESS") {
      return fail("Doar proprietarul terenului poate răspunde la recenzii.");
    }
    const data = replySchema.parse(input);

    const review = await prisma.review.findUnique({
      where: { id: data.reviewId },
      include: { field: { select: { id: true, ownerId: true } } },
    });
    if (!review || review.field.ownerId !== session.user.id) {
      return fail("Recenzia nu a fost găsită.");
    }

    await prisma.review.update({
      where: { id: data.reviewId },
      data: { ownerReply: data.reply, ownerReplyAt: new Date() },
    });

    revalidatePath("/dashboard/business/recenzii");
    revalidatePath(`/terenuri/${review.field.id}`);
    return ok();
  } catch (error) {
    return toActionError("replyToReview", error);
  }
}
