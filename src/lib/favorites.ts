import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Id-urile terenurilor salvate de utilizatorul curent. Întoarce null pentru
 * vizitatori și pentru conturile Business — acolo inima nu se afișează deloc,
 * ceea ce e diferit de „utilizator conectat, dar fără favorite”.
 */
export async function getFavoriteFieldIds(): Promise<Set<string> | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PERSONAL") return null;

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { fieldId: true },
  });
  return new Set(favorites.map((f) => f.fieldId));
}
