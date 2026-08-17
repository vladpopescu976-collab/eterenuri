import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereAutentificare, cerePersonal, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { serializeazaRezervare } from "@/lib/api/serializare";

export const maxDuration = 60;

const includeStandard = {
  field: { select: { id: true, name: true, city: true, openingHour: true, closingHour: true } },
  review: { select: { rating: true, comment: true, ownerReply: true } },
} as const;

/** Rezervările contului curent. Business vede cererile primite, Personal pe ale lui. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    if (sesiune.role === "BUSINESS") {
      const rezervari = await prisma.booking.findMany({
        where: { field: { ownerId: sesiune.userId } },
        orderBy: { startTime: "desc" },
        include: {
          ...includeStandard,
          customer: { select: { name: true, phone: true } },
        },
      });
      return raspuns(rezervari.map(serializeazaRezervare));
    }

    const rezervari = await prisma.booking.findMany({
      where: { customerId: sesiune.userId },
      orderBy: { startTime: "desc" },
      include: includeStandard,
    });
    return raspuns(rezervari.map(serializeazaRezervare));
  } catch (error) {
    return eroareNeasteptata("rezervari", error);
  }
}

const creeazaSchema = z.object({
  terenId: z.string().min(1),
  inceput: z.iso.datetime({ message: "Ora de start nu este validă." }),
  sfarsit: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  observatii: z.string().max(600, "Observațiile nu pot depăși 600 de caractere.").optional(),
});

export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cerePersonal(request);
    if (refuz) return refuz;

    const date = creeazaSchema.parse(await request.json());

    const field = await prisma.field.findUnique({ where: { id: date.terenId } });
    if (!field || !field.isActive) return eroare("Terenul nu este disponibil pentru rezervare.", 404);

    const inceput = new Date(date.inceput);
    const sfarsit = new Date(date.sfarsit);
    if (sfarsit <= inceput) return eroare("Ora de sfârșit trebuie să fie după ora de start.", 422);
    if (inceput < new Date()) return eroare("Nu poți rezerva un interval din trecut.", 422);

    const ore = (sfarsit.getTime() - inceput.getTime()) / 3_600_000;

    try {
      const rezervare = await prisma.$transaction(async (tx) => {
        // Același lock ca pe web: serializează scrierile pe teren, ca două
        // cereri simultane să nu treacă amândouă de verificări.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${field.id}))`;

        const suprapunere = await tx.booking.findFirst({
          where: {
            fieldId: field.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { lt: sfarsit },
            endTime: { gt: inceput },
          },
        });
        if (suprapunere) throw new Error("SUPRAPUNERE");

        const blocat = await tx.blockedSlot.findFirst({
          where: { fieldId: field.id, startTime: { lt: sfarsit }, endTime: { gt: inceput } },
        });
        if (blocat) throw new Error("BLOCAT");

        return tx.booking.create({
          data: {
            fieldId: field.id,
            customerId: sesiune.userId,
            startTime: inceput,
            endTime: sfarsit,
            totalPrice: Number(field.pricePerHour) * ore,
            notes: date.observatii?.trim() || null,
            status: "PENDING",
          },
          include: includeStandard,
        });
      });

      return raspuns(serializeazaRezervare(rezervare), 201);
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      if (text.includes("BLOCAT") || text.includes("BOOKING_ON_BLOCKED_SLOT")) {
        return eroare("Intervalul ales este blocat de proprietarul terenului.", 409);
      }
      if (text.includes("SUPRAPUNERE") || text.includes("23P01")) {
        return eroare("Intervalul ales se suprapune cu o altă rezervare.", 409);
      }
      throw err;
    }
  } catch (error) {
    return eroareNeasteptata("creeaza-rezervare", error);
  }
}
