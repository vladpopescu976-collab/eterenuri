import type { Prisma, SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dayRangeInAppZone } from "@/lib/datetime";
import { sportMeta } from "@/lib/sports";
import { eroareNeasteptata, raspuns, sesiuneDinCerere } from "@/lib/api/raspuns";
import { serializeazaTeren } from "@/lib/api/serializare";

export const maxDuration = 60;

function esteSport(value: string | null): value is SportType {
  return !!value && value in sportMeta;
}

/** Lista publică de terenuri, cu aceleași filtre ca pe web. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sport = url.searchParams.get("sport");
    const oras = url.searchParams.get("oras")?.trim();
    const pretMax = Number(url.searchParams.get("pretMax"));
    const zi = url.searchParams.get("zi");

    const where: Prisma.FieldWhereInput = { isActive: true };
    if (esteSport(sport)) where.sportType = sport;
    if (oras) where.city = { contains: oras, mode: "insensitive" };
    if (Number.isFinite(pretMax) && pretMax > 0) where.pricePerHour = { lte: pretMax };

    const sesiune = await sesiuneDinCerere(request);
    const interval = zi ? dayRangeInAppZone(zi) : null;

    const [fields, favorite] = await Promise.all([
      prisma.field.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          reviews: { select: { rating: true } },
          ...(interval
            ? {
                bookings: {
                  where: {
                    status: { in: ["PENDING", "CONFIRMED"] },
                    startTime: { lt: interval.end },
                    endTime: { gt: interval.start },
                  },
                  select: { startTime: true, endTime: true },
                },
                blockedSlots: {
                  where: {
                    startTime: { lt: interval.end },
                    endTime: { gt: interval.start },
                  },
                  select: { startTime: true, endTime: true },
                },
              }
            : {}),
        },
      }),
      sesiune?.role === "PERSONAL"
        ? prisma.favorite.findMany({
            where: { userId: sesiune.userId },
            select: { fieldId: true },
          })
        : Promise.resolve([]),
    ]);

    const favoriteIds = new Set(favorite.map((f) => f.fieldId));

    // Când e cerută o zi anume, scoatem terenurile deja pline în ziua aceea.
    const vizibile = interval
      ? fields.filter((field) => {
          const ocupate = [
            ...("bookings" in field ? field.bookings : []),
            ...("blockedSlots" in field ? field.blockedSlots : []),
          ];
          const deschidere = interval.start.getTime() + field.openingHour * 3_600_000;
          const inchidere = interval.start.getTime() + field.closingHour * 3_600_000;
          const oreOcupate = ocupate.reduce((sum, o) => {
            const de = Math.max(o.startTime.getTime(), deschidere);
            const pana = Math.min(o.endTime.getTime(), inchidere);
            return sum + Math.max(0, pana - de) / 3_600_000;
          }, 0);
          return oreOcupate < field.closingHour - field.openingHour;
        })
      : fields;

    return raspuns(
      vizibile.map((field) => {
        const note = field.reviews.map((r) => r.rating);
        return serializeazaTeren(field, {
          notaMedie: note.length ? note.reduce((a, b) => a + b, 0) / note.length : null,
          numarRecenzii: note.length,
          favorit: favoriteIds.has(field.id),
        });
      })
    );
  } catch (error) {
    return eroareNeasteptata("terenuri", error);
  }
}
