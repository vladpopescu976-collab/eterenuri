"use server";

import { auth, signOut } from "@/auth";
import { stergeContul } from "@/lib/cont";
import { fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

/**
 * Ștergerea contului cerută din interfața web.
 *
 * Deconectarea se face aici, nu în client: după ștergere, cookie-ul de sesiune
 * ar trimite mai departe către un cont care nu mai există.
 */
export async function stergeContulMeu(parola: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return fail("Sesiunea a expirat. Autentifică-te din nou.");

    const rezultat = await stergeContul(session.user.id, parola);
    if (!rezultat.ok) return fail(rezultat.motiv);

    await signOut({ redirect: false });
    return ok();
  } catch (error) {
    return toActionError("stergeContulMeu", error);
  }
}
