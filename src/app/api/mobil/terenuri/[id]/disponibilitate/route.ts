import { prisma } from "@/lib/prisma";
import { dayRangeInAppZone } from "@/lib/datetime";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/**
 * Intervalele ocupate dintr-o zi: rezervări active plus ore blocate de
 * proprietar. `exclude` lasă afară o rezervare anume, folosit când clientul
 * își mută propria rezervare.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const zi = url.searchParams.get("zi");
    const exclude = url.searchParams.get("exclude");

    const interval = zi ? dayRangeInAppZone(zi) : null;
    if (!interval) return eroare("Parametrul „zi” trebuie să fie de forma AAAA-LL-ZZ.", 422);

    const field = await prisma.field.findUnique({
      where: { id },
      select: { id: true, openingHour: true, closingHour: true },
    });
    if (!field) return eroare("Terenul nu a fost găsit.", 404);

    const [rezervari, blocate] = await Promise.all([
      prisma.booking.findMany({
        where: {
          fieldId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lt: interval.end },
          endTime: { gt: interval.start },
          ...(exclude ? { NOT: { id: exclude } } : {}),
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.blockedSlot.findMany({
        where: {
          fieldId: id,
          startTime: { lt: interval.end },
          endTime: { gt: interval.start },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const ocupate = [...rezervari, ...blocate]
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map((o) => ({ inceput: o.startTime.toISOString(), sfarsit: o.endTime.toISOString() }));

    return raspuns({
      oraDeschidere: field.openingHour,
      oraInchidere: field.closingHour,
      ocupate,
    });
  } catch (error) {
    return eroareNeasteptata("disponibilitate", error);
  }
}
