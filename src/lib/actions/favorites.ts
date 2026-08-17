"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

export async function toggleFavorite(fieldId: string): Promise<ActionResult<{ favorite: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return fail("Autentifică-te ca să salvezi terenuri favorite.");
    }
    if (session.user.role !== "PERSONAL") {
      return fail("Doar conturile Personal pot salva terenuri favorite.");
    }

    const field = await prisma.field.findUnique({ where: { id: fieldId }, select: { id: true } });
    if (!field) return fail("Terenul nu a fost găsit.");

    const userId = session.user.id;
    const existing = await prisma.favorite.findUnique({
      where: { userId_fieldId: { userId, fieldId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
    } else {
      // Dublu-click rapid poate trimite două cereri; unicitatea din baza de
      // date le face inofensive, așa că ignorăm conflictul.
      await prisma.favorite
        .create({ data: { userId, fieldId } })
        .catch((error: unknown) => {
          const text = error instanceof Error ? error.message : "";
          if (!text.includes("Unique constraint")) throw error;
        });
    }

    revalidatePath("/favorite");
    revalidatePath(`/terenuri/${fieldId}`);
    return ok({ favorite: !existing });
  } catch (error) {
    return toActionError("toggleFavorite", error);
  }
}
