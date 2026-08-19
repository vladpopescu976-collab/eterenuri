import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { outsideOpeningHours } from "@/lib/availability";
import { anuntaRezervare, type EvenimentRezervare } from "@/lib/emailuri/rezervari";
import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { serializeazaRezervare } from "@/lib/api/serializare";

export const maxDuration = 60;

const includeStandard = {
  field: { select: { id: true, name: true, city: true, openingHour: true, closingHour: true } },
  customer: { select: { name: true, phone: true } },
  review: { select: { rating: true, comment: true, ownerReply: true } },
} as const;

// O singură rută pentru toate acțiunile asupra unei rezervări, ca aplicația să
// nu trebuiască să știe endpointuri diferite pentru fiecare buton.
const actiuneSchema = z.discriminatedUnion("actiune", [
  z.object({ actiune: z.literal("anuleaza") }),
  z.object({
    actiune: z.literal("muta"),
    inceput: z.iso.datetime({ message: "Ora de start nu este validă." }),
    sfarsit: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  }),
  z.object({ actiune: z.literal("accepta-mutarea") }),
  z.object({ actiune: z.literal("refuza-mutarea") }),
  z.object({ actiune: z.literal("aproba") }),
  z.object({ actiune: z.literal("respinge") }),
  z.object({
    actiune: z.literal("propune-mutare"),
    inceput: z.iso.datetime({ message: "Ora de start nu este validă." }),
    sfarsit: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
    nota: z.string().max(300).optional(),
  }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const { id } = await params;
    const date = actiuneSchema.parse(await request.json());

    const rezervare = await prisma.booking.findUnique({
      where: { id },
      include: { field: { select: { id: true, ownerId: true, openingHour: true, closingHour: true, pricePerHour: true, isActive: true } } },
    });
    if (!rezervare) return eroare("Rezervarea nu a fost găsită.", 404);

    const esteClient = rezervare.customerId === sesiune.userId;
    const esteProprietar = rezervare.field.ownerId === sesiune.userId;
    if (!esteClient && !esteProprietar) return eroare("Rezervarea nu a fost găsită.", 404);

    const actiuniClient = ["anuleaza", "muta", "accepta-mutarea", "refuza-mutarea"];
    const actiuniProprietar = ["aproba", "respinge", "propune-mutare"];
    if (actiuniClient.includes(date.actiune) && !esteClient) {
      return eroare("Doar clientul poate face asta.", 403);
    }
    if (actiuniProprietar.includes(date.actiune) && !esteProprietar) {
      return eroare("Doar proprietarul terenului poate face asta.", 403);
    }

    const incheiata = rezervare.endTime < new Date();

    // Ce email pleacă după acțiune. Rămâne null dacă acțiunea nu anunță pe
    // nimeni sau dacă s-a întors mai devreme cu o eroare.
    let anunt: EvenimentRezervare | null = null;

    switch (date.actiune) {
      case "anuleaza": {
        if (rezervare.status === "CANCELLED") return eroare("Rezervarea este deja anulată.", 409);
        if (rezervare.status === "REJECTED") return eroare("Rezervarea a fost deja respinsă.", 409);
        if (incheiata) return eroare("Nu poți anula o rezervare încheiată.", 409);
        await prisma.booking.update({
          where: { id },
          data: { status: "CANCELLED", proposedStartTime: null, proposedEndTime: null },
        });
        anunt = "anulata-de-client";
        break;
      }

      case "muta": {
        if (rezervare.status === "CANCELLED" || rezervare.status === "REJECTED") {
          return eroare("Rezervarea nu mai este activă.", 409);
        }
        if (incheiata) return eroare("Nu poți modifica o rezervare încheiată.", 409);
        if (!rezervare.field.isActive) return eroare("Terenul nu mai este disponibil.", 409);

        const inceput = new Date(date.inceput);
        const sfarsit = new Date(date.sfarsit);
        if (sfarsit <= inceput) return eroare("Ora de sfârșit trebuie să fie după ora de start.", 422);
        if (inceput < new Date()) return eroare("Nu poți muta rezervarea în trecut.", 422);

        const inAfara = outsideOpeningHours(
          inceput, sfarsit, rezervare.field.openingHour, rezervare.field.closingHour
        );
        if (inAfara) return eroare(inAfara, 422);

        const ore = (sfarsit.getTime() - inceput.getTime()) / 3_600_000;

        try {
          await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rezervare.fieldId}))`;

            const suprapunere = await tx.booking.findFirst({
              where: {
                fieldId: rezervare.fieldId,
                id: { not: rezervare.id },
                status: { in: ["PENDING", "CONFIRMED"] },
                startTime: { lt: sfarsit },
                endTime: { gt: inceput },
              },
            });
            if (suprapunere) throw new Error("SUPRAPUNERE");

            const blocat = await tx.blockedSlot.findFirst({
              where: { fieldId: rezervare.fieldId, startTime: { lt: sfarsit }, endTime: { gt: inceput } },
            });
            if (blocat) throw new Error("BLOCAT");

            await tx.booking.update({
              where: { id },
              data: {
                startTime: inceput,
                endTime: sfarsit,
                totalPrice: Number(rezervare.field.pricePerHour) * ore,
                status: "PENDING",
                proposedStartTime: null,
                proposedEndTime: null,
                rescheduleNote: null,
              },
            });
          });
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
        anunt = "mutata-de-client";
        break;
      }

      case "accepta-mutarea": {
        if (
          rezervare.status !== "RESCHEDULE_PROPOSED" ||
          !rezervare.proposedStartTime ||
          !rezervare.proposedEndTime
        ) {
          return eroare("Nu există o propunere de mutare.", 409);
        }
        try {
          await prisma.booking.update({
            where: { id },
            data: {
              status: "CONFIRMED",
              startTime: rezervare.proposedStartTime,
              endTime: rezervare.proposedEndTime,
              proposedStartTime: null,
              proposedEndTime: null,
            },
          });
        } catch (err) {
          const text = err instanceof Error ? err.message : "";
          if (text.includes("23P01")) {
            return eroare("Ora propusă s-a ocupat între timp.", 409);
          }
          throw err;
        }
        anunt = "mutare-acceptata";
        break;
      }

      case "refuza-mutarea": {
        if (rezervare.status !== "RESCHEDULE_PROPOSED") {
          return eroare("Nu există o propunere de mutare.", 409);
        }
        await prisma.booking.update({
          where: { id },
          data: { status: "REJECTED", proposedStartTime: null, proposedEndTime: null },
        });
        anunt = "mutare-refuzata";
        break;
      }

      case "aproba": {
        await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED" } });
        anunt = "aprobata";
        break;
      }

      case "respinge": {
        await prisma.booking.update({ where: { id }, data: { status: "REJECTED" } });
        anunt = "respinsa";
        break;
      }

      case "propune-mutare": {
        const inceput = new Date(date.inceput);
        const sfarsit = new Date(date.sfarsit);
        if (sfarsit <= inceput) return eroare("Ora de sfârșit trebuie să fie după ora de start.", 422);

        // Propunerea devine rezervare dacă e acceptată, deci trebuie să
        // respecte programul la fel ca orice altă rezervare.
        const inAfaraPropunerii = outsideOpeningHours(
          inceput, sfarsit, rezervare.field.openingHour, rezervare.field.closingHour
        );
        if (inAfaraPropunerii) return eroare(inAfaraPropunerii, 422);

        await prisma.booking.update({
          where: { id },
          data: {
            status: "RESCHEDULE_PROPOSED",
            proposedStartTime: inceput,
            proposedEndTime: sfarsit,
            rescheduleNote: date.nota?.trim() || null,
          },
        });
        anunt = "mutare-propusa";
        break;
      }
    }

    if (anunt) anuntaRezervare(id, anunt);

    const actualizata = await prisma.booking.findUnique({ where: { id }, include: includeStandard });
    return raspuns(actualizata ? serializeazaRezervare(actualizata) : null);
  } catch (error) {
    return eroareNeasteptata("actiune-rezervare", error);
  }
}
