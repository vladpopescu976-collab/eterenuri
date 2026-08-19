import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { anuntaRezervareAcum } from "@/lib/emailuri/rezervari";

const STATUSURI_ACTIVE = ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"] as const;

export type RezultatStergere =
  | { ok: true }
  | { ok: false; motiv: string };

/**
 * Șterge definitiv contul și tot ce ține de el.
 *
 * Parola e cerută din nou fiindcă ștergerea nu se poate desface: un telefon
 * lăsat deblocat pe masă n-ar trebui să fie de ajuns.
 *
 * Un cont Business cu rezervări viitoare nu se poate șterge. Ștergerea ar
 * duce, în cascadă, și rezervările clienților, iar aceștia ar afla că nu mai
 * au teren abia când ajung la el. Proprietarul trebuie întâi să le rezolve.
 */
export async function stergeContul(userId: string, parola: string): Promise<RezultatStergere> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, role: true, name: true },
  });
  if (!user) return { ok: false, motiv: "Contul nu mai există." };

  if (!(await bcrypt.compare(parola, user.password))) {
    return { ok: false, motiv: "Parola nu este corectă." };
  }

  const acum = new Date();

  if (user.role === "BUSINESS") {
    const viitoare = await prisma.booking.count({
      where: {
        field: { ownerId: user.id },
        status: { in: [...STATUSURI_ACTIVE] },
        endTime: { gt: acum },
      },
    });
    if (viitoare > 0) {
      return {
        ok: false,
        motiv:
          viitoare === 1
            ? "Ai o rezervare viitoare pe terenurile tale. Rezolv-o (aprob-o și onoreaz-o sau respinge-o) înainte să ștergi contul."
            : `Ai ${viitoare} rezervări viitoare pe terenurile tale. Rezolvă-le înainte să ștergi contul.`,
      };
    }
  } else {
    // Clientul își poate șterge contul oricând, dar proprietarii trebuie să
    // afle că orele redevin libere.
    const viitoare = await prisma.booking.findMany({
      where: {
        customerId: user.id,
        status: { in: [...STATUSURI_ACTIVE] },
        endTime: { gt: acum },
      },
      select: { id: true },
    });

    if (viitoare.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: viitoare.map((b) => b.id) } },
        data: { status: "CANCELLED", proposedStartTime: null, proposedEndTime: null },
      });
      // Trimise acum, nu prin `after`: peste o clipă rândurile nu mai există.
      for (const rezervare of viitoare) {
        await anuntaRezervareAcum(rezervare.id, "anulata-de-client");
      }
    }
  }

  // Restul (terenuri, rezervări trecute, favorite, recenzii, tokenuri) pleacă
  // în cascadă, după cum e declarat în schemă.
  await prisma.user.delete({ where: { id: user.id } });

  return { ok: true };
}
