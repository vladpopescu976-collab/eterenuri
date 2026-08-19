import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { stergeContul } from "@/lib/cont";

export const maxDuration = 60;

/** Verifică dacă tokenul salvat pe telefon mai e bun, la pornirea aplicației. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const user = await prisma.user.findUnique({
      where: { id: sesiune.userId },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        city: true, sports: true, companyName: true, createdAt: true,
      },
    });
    if (!user) return raspuns(null, 401);

    return raspuns({
      id: user.id,
      nume: user.name,
      email: user.email,
      rol: user.role,
      telefon: user.phone,
      oras: user.city,
      sporturi: user.sports,
      numeFirma: user.companyName,
      membruDin: user.createdAt,
    });
  } catch (error) {
    return eroareNeasteptata("eu", error);
  }
}

const stergereSchema = z.object({
  parola: z.string().min(1, "Parola este obligatorie."),
});

/** Șterge definitiv contul, după confirmarea parolei. */
export async function DELETE(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const date = stergereSchema.parse(await request.json());
    const rezultat = await stergeContul(sesiune.userId, date.parola);
    if (!rezultat.ok) return eroare(rezultat.motiv, 409);

    return raspuns({ sters: true });
  } catch (error) {
    return eroareNeasteptata("stergere-cont", error);
  }
}
