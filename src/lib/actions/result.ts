import { z } from "zod";

// De ce există fișierul ăsta:
// Next.js ascunde în producție mesajul oricărei erori aruncate dintr-o acțiune
// de server, ca să nu scape detalii sensibile către client. Clientul primea în
// locul lui un text generic ("Minified React error #441"), pe care noi îl
// afișam ca și cum ar fi fost mesajul nostru. Așa că acțiunile nu mai aruncă
// erori — întorc un rezultat pe care îl putem afișa în română.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

// Eroare cu mesaj scris de noi, pe care avem voie să îl arătăm clientului.
// Orice altă excepție (Prisma, rețea, bug) rămâne în logurile serverului.
export class ActionError extends Error {}

const MESAJ_GENERIC = "A apărut o eroare. Te rugăm să încerci din nou.";

// Transformă orice excepție într-un mesaj afișabil și o lasă în logurile
// serverului (pe Vercel: Runtime Logs), unde o putem citi la nevoie.
export function toActionError(context: string, error: unknown): { ok: false; error: string } {
  if (error instanceof z.ZodError) {
    return fail(error.issues[0]?.message ?? MESAJ_GENERIC);
  }
  if (error instanceof ActionError) {
    return fail(error.message);
  }
  console.error(`[${context}]`, error);
  return fail(MESAJ_GENERIC);
}
