import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cerePersonal, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { serializeazaTeren } from "@/lib/api/serializare";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;

    const favorite = await prisma.favorite.findMany({
      where: { userId: sesiune.userId },
      orderBy: { createdAt: "desc" },
      include: { field: { include: { reviews: { select: { rating: true } } } } },
    });

    return raspuns(
      favorite
        .filter((f) => f.field.isActive)
        .map((f) => {
          const note = f.field.reviews.map((r) => r.rating);
          return serializeazaTeren(f.field, {
            notaMedie: note.length ? note.reduce((a, b) => a + b, 0) / note.length : null,
            numarRecenzii: note.length,
            favorit: true,
          });
        })
    );
  } catch (error) {
    return eroareNeasteptata("favorite", error);
  }
}

const schema = z.object({ terenId: z.string().min(1) });

/** Comută starea de favorit și întoarce starea nouă. */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;

    const { terenId } = schema.parse(await request.json());

    const field = await prisma.field.findUnique({ where: { id: terenId }, select: { id: true } });
    if (!field) return eroare("Terenul nu a fost găsit.", 404);

    const existent = await prisma.favorite.findUnique({
      where: { userId_fieldId: { userId: sesiune.userId, fieldId: terenId } },
    });

    if (existent) {
      await prisma.favorite.delete({ where: { id: existent.id } });
      return raspuns({ favorit: false });
    }

    await prisma.favorite.create({ data: { userId: sesiune.userId, fieldId: terenId } });
    return raspuns({ favorit: true });
  } catch (error) {
    return eroareNeasteptata("comuta-favorit", error);
  }
}
