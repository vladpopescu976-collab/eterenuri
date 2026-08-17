import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const blocari = await prisma.blockedSlot.findMany({
      where: { field: { ownerId: sesiune.userId } },
      orderBy: { startTime: "asc" },
      include: { field: { select: { id: true, name: true } } },
    });

    return raspuns(
      blocari.map((b) => ({
        id: b.id,
        terenId: b.fieldId,
        terenNume: b.field.name,
        inceput: b.startTime.toISOString(),
        sfarsit: b.endTime.toISOString(),
        motiv: b.reason,
      }))
    );
  } catch (error) {
    return eroareNeasteptata("business-blocari", error);
  }
}

const schema = z.object({
  terenId: z.string().min(1),
  inceput: z.iso.datetime({ message: "Ora de start nu este validă." }),
  sfarsit: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  motiv: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const date = schema.parse(await request.json());

    const field = await prisma.field.findUnique({ where: { id: date.terenId } });
    if (!field || field.ownerId !== sesiune.userId) return eroare("Terenul nu a fost găsit.", 404);

    const inceput = new Date(date.inceput);
    const sfarsit = new Date(date.sfarsit);
    if (sfarsit <= inceput) return eroare("Ora de sfârșit trebuie să fie după ora de start.", 422);

    try {
      const blocare = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${field.id}))`;

        const rezervare = await tx.booking.findFirst({
          where: {
            fieldId: field.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { lt: sfarsit },
            endTime: { gt: inceput },
          },
          include: { customer: { select: { name: true } } },
        });
        if (rezervare) throw new Error(`REZERVAT:${rezervare.customer.name}`);

        return tx.blockedSlot.create({
          data: {
            fieldId: field.id,
            startTime: inceput,
            endTime: sfarsit,
            reason: date.motiv?.trim() || null,
          },
        });
      });

      return raspuns(
        {
          id: blocare.id,
          terenId: blocare.fieldId,
          inceput: blocare.startTime.toISOString(),
          sfarsit: blocare.endTime.toISOString(),
          motiv: blocare.reason,
        },
        201
      );
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      if (text.startsWith("REZERVAT:")) {
        return eroare(
          `Nu poți bloca intervalul: există o rezervare a lui ${text.slice(9)}. Respinge-o mai întâi.`,
          409
        );
      }
      if (text.includes("BLOCKED_SLOT_ON_BOOKING")) {
        return eroare("Între timp a apărut o rezervare pe acest interval.", 409);
      }
      if (text.includes("blocked_slots_no_overlap")) {
        return eroare("Intervalul este deja blocat.", 409);
      }
      throw err;
    }
  } catch (error) {
    return eroareNeasteptata("business-blocheaza", error);
  }
}
