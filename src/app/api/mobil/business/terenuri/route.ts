import { prisma } from "@/lib/prisma";
import { fieldSchema } from "@/lib/validations/field";
import { cereBusiness, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { serializeazaTeren } from "@/lib/api/serializare";

export const maxDuration = 60;

/** Terenurile proprietarului, inclusiv cele dezactivate. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const fields = await prisma.field.findMany({
      where: { ownerId: sesiune.userId },
      orderBy: { createdAt: "desc" },
      include: { reviews: { select: { rating: true } } },
    });

    return raspuns(
      fields.map((field) => {
        const note = field.reviews.map((r) => r.rating);
        return serializeazaTeren(field, {
          notaMedie: note.length ? note.reduce((a, b) => a + b, 0) / note.length : null,
          numarRecenzii: note.length,
        });
      })
    );
  } catch (error) {
    return eroareNeasteptata("business-terenuri", error);
  }
}

export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    // Aceleași reguli ca pe web, ca să nu existe două seturi de validări.
    const date = fieldSchema.parse(await request.json());
    const { description, amenities, images, ...rest } = date;

    const field = await prisma.field.create({
      data: {
        ...rest,
        ownerId: sesiune.userId,
        description: description || null,
        amenities: amenities ?? [],
        images: images ?? [],
      },
    });

    return raspuns(serializeazaTeren(field), 201);
  } catch (error) {
    return eroareNeasteptata("business-creeaza-teren", error);
  }
}
