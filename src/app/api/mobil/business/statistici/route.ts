import { prisma } from "@/lib/prisma";
import { clockInAppZone } from "@/lib/datetime";
import { cereBusiness, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/** Cifrele din „Privire de ansamblu”, calculate pe server pentru aplicație. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    const [fields, rezervari] = await Promise.all([
      prisma.field.findMany({
        where: { ownerId: sesiune.userId },
        select: { id: true, name: true, isActive: true, openingHour: true, closingHour: true },
      }),
      prisma.booking.findMany({
        where: { field: { ownerId: sesiune.userId } },
        select: { status: true, startTime: true, endTime: true, totalPrice: true, fieldId: true },
      }),
    ]);

    const acum = new Date();
    const confirmate = rezervari.filter((b) => b.status === "CONFIRMED");
    const ore = (b: { startTime: Date; endTime: Date }) =>
      (b.endTime.getTime() - b.startTime.getTime()) / 3_600_000;

    const venitLunaCurenta = confirmate
      .filter(
        (b) =>
          b.startTime.getFullYear() === acum.getFullYear() &&
          b.startTime.getMonth() === acum.getMonth()
      )
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    const acumMinus7 = new Date(acum.getTime() - 7 * 24 * 3_600_000);
    const oreUltimele7 = confirmate
      .filter((b) => b.startTime >= acumMinus7 && b.startTime <= acum)
      .reduce((sum, b) => sum + ore(b), 0);

    const capacitateZilnica = fields
      .filter((f) => f.isActive)
      .reduce((sum, f) => sum + Math.max(0, f.closingHour - f.openingHour), 0);
    const capacitateSaptamanala = capacitateZilnica * 7;

    // Cele mai cerute ore, ca proprietarul să știe când merită să fie deschis.
    // Ora se citește în fusul terenurilor: pe Vercel serverul merge pe UTC, iar
    // un vârf real de la 19:00 ar fi apărut la 16:00.
    const peOra = new Map<number, number>();
    confirmate.forEach((b) => {
      const start = clockInAppZone(b.startTime).hour;
      const durata = Math.round((b.endTime.getTime() - b.startTime.getTime()) / 3_600_000);
      for (let h = start; h < start + durata; h++) {
        peOra.set(h % 24, (peOra.get(h % 24) ?? 0) + 1);
      }
    });

    return raspuns({
      venitLunaCurenta: Math.round(venitLunaCurenta),
      totalRezervari: rezervari.length,
      inAsteptare: rezervari.filter((b) => b.status === "PENDING").length,
      oreOcupate: Math.round(confirmate.reduce((sum, b) => sum + ore(b), 0)),
      gradOcupare:
        capacitateSaptamanala > 0
          ? Math.round((oreUltimele7 / capacitateSaptamanala) * 100)
          : 0,
      terenuri: fields.map((f) => ({
        id: f.id,
        nume: f.name,
        activ: f.isActive,
        rezervari: rezervari.filter((b) => b.fieldId === f.id).length,
      })),
      oreDeVarf: [...peOra.entries()]
        .map(([ora, rezervari]) => ({ ora, rezervari }))
        .sort((a, b) => b.rezervari - a.rezervari)
        .slice(0, 5),
    });
  } catch (error) {
    return eroareNeasteptata("business-statistici", error);
  }
}
