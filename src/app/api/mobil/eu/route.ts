import { prisma } from "@/lib/prisma";
import { cereAutentificare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

/** Verifică dacă tokenul salvat pe telefon mai e bun, la pornirea aplicației. */
export async function GET(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereAutentificare(request);
    if (refuz) return refuz;

    const user = await prisma.user.findUnique({
      where: { id: sesiune.userId },
      select: { id: true, name: true, email: true, role: true, phone: true },
    });
    if (!user) return raspuns(null, 401);

    return raspuns({
      id: user.id,
      nume: user.name,
      email: user.email,
      rol: user.role,
      telefon: user.phone,
    });
  } catch (error) {
    return eroareNeasteptata("eu", error);
  }
}
