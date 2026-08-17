import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/** Business: recenziile primite pe terenurile proprii. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    if (sesiune.role !== "BUSINESS") return eroare("Este nevoie de un cont Business.", 403);

    const recenzii = await prisma.review.findMany({
      where: { field: { ownerId: sesiune.userId } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } }, field: { select: { name: true } } },
    });

    return raspuns(
      recenzii.map((r) => ({
        id: r.id,
        nota: r.rating,
        comentariu: r.comment,
        raspunsProprietar: r.ownerReply,
        autor: r.author.name,
        teren: r.field.name,
        data: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return eroareNeasteptata("recenzii", error);
  }
}

const creeazaSchema = z.object({
  rezervareId: z.string().min(1),
  nota: z.number().int().min(1, "Ratingul trebuie să fie între 1 și 5.").max(5, "Ratingul trebuie să fie între 1 și 5."),
  comentariu: z.string().trim().max(1000, "Comentariul e prea lung.").optional(),
});

/** Personal: lasă o recenzie pentru o rezervare proprie, confirmată și încheiată. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const date = creeazaSchema.parse(await request.json());

    const rezervare = await prisma.booking.findUnique({
      where: { id: date.rezervareId },
      include: { review: { select: { id: true } } },
    });
    if (!rezervare || rezervare.customerId !== sesiune.userId) {
      return eroare("Rezervarea nu a fost găsită.", 404);
    }
    if (rezervare.status !== "CONFIRMED") {
      return eroare("Poți lăsa o recenzie doar pentru o rezervare confirmată.", 409);
    }
    if (rezervare.endTime > new Date()) {
      return eroare("Poți lăsa o recenzie după ce se încheie rezervarea.", 409);
    }
    if (rezervare.review) return eroare("Ai lăsat deja o recenzie pentru această rezervare.", 409);

    await prisma.review.create({
      data: {
        bookingId: rezervare.id,
        fieldId: rezervare.fieldId,
        authorId: sesiune.userId,
        rating: date.nota,
        comment: date.comentariu?.trim() || null,
      },
    });

    return raspuns({ creata: true }, 201);
  } catch (error) {
    return eroareNeasteptata("creeaza-recenzie", error);
  }
}

const raspundeSchema = z.object({
  recenzieId: z.string().min(1),
  raspuns: z.string().trim().min(1, "Scrie un răspuns.").max(1000, "Răspunsul e prea lung."),
});

/** Business: răspunde la o recenzie primită. */
export async function PATCH(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;
    if (sesiune.role !== "BUSINESS") return eroare("Este nevoie de un cont Business.", 403);

    const date = raspundeSchema.parse(await request.json());

    const recenzie = await prisma.review.findUnique({
      where: { id: date.recenzieId },
      include: { field: { select: { ownerId: true } } },
    });
    if (!recenzie || recenzie.field.ownerId !== sesiune.userId) {
      return eroare("Recenzia nu a fost găsită.", 404);
    }

    await prisma.review.update({
      where: { id: date.recenzieId },
      data: { ownerReply: date.raspuns, ownerReplyAt: new Date() },
    });

    return raspuns({ actualizata: true });
  } catch (error) {
    return eroareNeasteptata("raspunde-recenzie", error);
  }
}
