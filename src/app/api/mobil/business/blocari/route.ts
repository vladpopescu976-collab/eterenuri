import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { creeazaSerie, stergeSeria, MAX_SAPTAMANI } from "@/lib/blocari-recurente";

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
        clientNume: b.clientName,
        clientTelefon: b.clientPhone,
        serieId: b.serieId,
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
  // Completat doar când proprietarul notează o rezervare primită la telefon.
  clientNume: z.string().trim().max(100).optional(),
  clientTelefon: z.string().trim().max(30).optional(),
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
            clientName: date.clientNume?.trim() || null,
            clientPhone: date.clientTelefon?.trim() || null,
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
          clientNume: blocare.clientName,
          clientTelefon: blocare.clientPhone,
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

const serieSchema = z.object({
  terenId: z.string().min(1),
  zile: z.array(z.number().int().min(1).max(7)).min(1, "Alege cel puțin o zi a săptămânii."),
  oraStart: z.number().int().min(0).max(23),
  oraSfarsit: z.number().int().min(1).max(24),
  dataInceput: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saptamani: z.number().int().min(1).max(MAX_SAPTAMANI),
  motiv: z.string().trim().max(200).optional(),
  clientNume: z.string().trim().max(100).optional(),
  clientTelefon: z.string().trim().max(30).optional(),
});

/** Blochează aceeași oră în fiecare săptămână, pe zilele alese. */
export async function PUT(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const date = serieSchema.parse(await request.json());
    const rezultat = await creeazaSerie(
      {
        fieldId: date.terenId,
        zile: date.zile,
        oraStart: date.oraStart,
        oraSfarsit: date.oraSfarsit,
        dataInceput: date.dataInceput,
        saptamani: date.saptamani,
        motiv: date.motiv,
        clientNume: date.clientNume,
        clientTelefon: date.clientTelefon,
      },
      sesiune.userId
    );

    if ("eroare" in rezultat) return eroare(rezultat.eroare, 422);

    return raspuns(
      {
        serieId: rezultat.serieId,
        create: rezultat.create,
        rezervate: rezultat.sarite.filter((s) => s.motiv === "rezervat").length,
        blocate: rezultat.sarite.filter((s) => s.motiv === "blocat").length,
        trecute: rezultat.sarite.filter((s) => s.motiv === "trecut").length,
      },
      201
    );
  } catch (error) {
    return eroareNeasteptata("blocari-serie", error);
  }
}

/** Șterge toate blocările viitoare dintr-o serie. */
export async function DELETE(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const { serieId } = z.object({ serieId: z.string().min(1) }).parse(await request.json());
    const rezultat = await stergeSeria(serieId, sesiune.userId);
    if ("eroare" in rezultat) return eroare(rezultat.eroare, 404);

    return raspuns({ sterse: rezultat.sterse });
  } catch (error) {
    return eroareNeasteptata("blocari-serie-stergere", error);
  }
}
