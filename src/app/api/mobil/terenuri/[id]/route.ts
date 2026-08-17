import { prisma } from "@/lib/prisma";
import { eroare, eroareNeasteptata, raspuns, sesiuneDinCerere } from "@/lib/api/raspuns";
import { serializeazaTeren } from "@/lib/api/serializare";

export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sesiune = await sesiuneDinCerere(request);

    const field = await prisma.field.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { name: true } } },
        },
      },
    });

    if (!field) return eroare("Terenul nu a fost găsit.", 404);

    const esteProprietar = sesiune?.userId === field.ownerId;
    if (!field.isActive && !esteProprietar) {
      return eroare("Terenul nu a fost găsit.", 404);
    }

    const favorit =
      sesiune?.role === "PERSONAL"
        ? !!(await prisma.favorite.findUnique({
            where: { userId_fieldId: { userId: sesiune.userId, fieldId: field.id } },
            select: { id: true },
          }))
        : false;

    const note = field.reviews.map((r) => r.rating);

    return raspuns({
      teren: serializeazaTeren(field, {
        notaMedie: note.length ? note.reduce((a, b) => a + b, 0) / note.length : null,
        numarRecenzii: note.length,
        favorit,
      }),
      esteProprietar,
      recenzii: field.reviews.map((r) => ({
        id: r.id,
        nota: r.rating,
        comentariu: r.comment,
        raspunsProprietar: r.ownerReply,
        autor: r.author.name,
        data: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return eroareNeasteptata("teren", error);
  }
}
