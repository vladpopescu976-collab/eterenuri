import { prisma } from "@/lib/prisma";
import { fieldEditSchema } from "@/lib/validations/field";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { serializeazaTeren } from "@/lib/api/serializare";

export const maxDuration = 60;

async function terenulMeu(id: string, ownerId: string) {
  const field = await prisma.field.findUnique({ where: { id } });
  return field && field.ownerId === ownerId ? field : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { id } = await params;
    if (!(await terenulMeu(id, sesiune.userId))) return eroare("Terenul nu a fost găsit.", 404);

    const date = fieldEditSchema.parse({ ...(await request.json()), fieldId: id });
    const { fieldId, description, amenities, images, ...rest } = date;

    const field = await prisma.field.update({
      where: { id: fieldId },
      data: {
        ...rest,
        description: description || null,
        amenities: amenities ?? [],
        images: images ?? [],
      },
    });

    return raspuns(serializeazaTeren(field));
  } catch (error) {
    return eroareNeasteptata("business-editeaza-teren", error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { id } = await params;
    if (!(await terenulMeu(id, sesiune.userId))) return eroare("Terenul nu a fost găsit.", 404);

    await prisma.field.delete({ where: { id } });
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("business-sterge-teren", error);
  }
}
