import { prisma } from "@/lib/prisma";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { id } = await params;
    const blocare = await prisma.blockedSlot.findUnique({
      where: { id },
      include: { field: { select: { ownerId: true } } },
    });
    if (!blocare || blocare.field.ownerId !== sesiune.userId) {
      return eroare("Intervalul blocat nu a fost găsit.", 404);
    }

    await prisma.blockedSlot.delete({ where: { id } });
    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("business-deblocheaza", error);
  }
}
