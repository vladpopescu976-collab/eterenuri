import { prisma } from "@/lib/prisma";
import { eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { ORASE_ROMANIA, cheieOras, normalizeazaOras } from "@/lib/orase";

export const maxDuration = 60;

/**
 * Toate orașele din România, cu numărul de terenuri publicate în fiecare.
 *
 * Se întorc toate, nu doar cele cu terenuri, ca lista din aplicație să fie
 * completă și să se poată căuta în ea. Orașele scrise altfel de proprietari
 * („timisoara”) sunt potrivite cu lista ignorând diacriticele.
 */
export async function GET() {
  try {
    const grupuri = await prisma.field.groupBy({
      by: ["cityKey"],
      where: { isActive: true },
      _count: { _all: true },
    });

    const numarPeCheie = new Map(grupuri.map((g) => [g.cityKey, g._count._all]));

    const orase = ORASE_ROMANIA.map((oras) => ({
      oras,
      terenuri: numarPeCheie.get(cheieOras(oras)) ?? 0,
    }));

    // Localitățile din date care nu sunt în listă (sate, comune, scrieri greșite)
    // nu trebuie pierdute — altfel terenurile de acolo n-ar putea fi găsite.
    const cunoscute = new Set(ORASE_ROMANIA.map(cheieOras));
    const inPlus = grupuri
      .filter((g) => g.cityKey && !cunoscute.has(g.cityKey))
      .map((g) => ({ oras: normalizeazaOras(g.cityKey), terenuri: g._count._all }));

    return raspuns(
      [...orase, ...inPlus].sort((a, b) => a.oras.localeCompare(b.oras, "ro-RO"))
    );
  } catch (error) {
    return eroareNeasteptata("orase", error);
  }
}
