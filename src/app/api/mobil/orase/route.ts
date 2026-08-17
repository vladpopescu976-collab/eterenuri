import { prisma } from "@/lib/prisma";
import { eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/**
 * Orașele în care există terenuri active, ca aplicația să le poată oferi la ales.
 *
 * Orașele sunt scrise de mână de proprietari, deci același oraș poate apărea în
 * mai multe feluri („Timisoara”, „timisoara”, „TImisoara”). Le grupăm ignorând
 * majusculele și arătăm o singură variantă, altfel lista de ales arată rupt.
 */
export async function GET() {
  try {
    const grupuri = await prisma.field.groupBy({
      by: ["city"],
      where: { isActive: true },
      _count: { _all: true },
    });

    type Intrare = { scrieri: { text: string; cate: number }[]; total: number };
    const dupaCheie = new Map<string, Intrare>();

    for (const grup of grupuri) {
      const text = grup.city.trim();
      if (!text) continue;
      const cheie = text.toLocaleLowerCase("ro-RO");
      const intrare = dupaCheie.get(cheie) ?? { scrieri: [], total: 0 };
      intrare.scrieri.push({ text, cate: grup._count._all });
      intrare.total += grup._count._all;
      dupaCheie.set(cheie, intrare);
    }

    const orase = [...dupaCheie.values()].map((intrare) => {
      // Varianta afișată: cea folosită de cele mai multe terenuri; la egalitate,
      // cea scrisă cu majusculă la început.
      const preferata = intrare.scrieri.sort((a, b) => {
        if (b.cate !== a.cate) return b.cate - a.cate;
        const aMare = a.text[0] === a.text[0].toLocaleUpperCase("ro-RO");
        const bMare = b.text[0] === b.text[0].toLocaleUpperCase("ro-RO");
        if (aMare !== bMare) return aMare ? -1 : 1;
        return a.text.localeCompare(b.text, "ro-RO");
      })[0];

      return { oras: preferata.text, terenuri: intrare.total };
    });

    orase.sort((a, b) => a.oras.localeCompare(b.oras, "ro-RO"));
    return raspuns(orase);
  } catch (error) {
    return eroareNeasteptata("orase", error);
  }
}
