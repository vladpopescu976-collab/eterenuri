import { z } from "zod";

import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { cereResetarea } from "@/lib/emailuri/parola";
import { inregistreazaEsec, ipDinCerere, verificaLimitarea } from "@/lib/limitare";

export const maxDuration = 60;

const schema = z.object({
  email: z.string().email("Adresă de email invalidă.").transform((v) => v.trim().toLowerCase()),
});

/**
 * Aplicația cere doar trimiterea linkului; parola nouă se alege pe site,
 * unde ajunge linkul din email.
 */
export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    const ip = ipDinCerere(request);
    const limitare = await verificaLimitarea(`parola:${date.email}`, ip);
    if (!limitare.permis) return eroare(limitare.mesaj, 429);
    await inregistreazaEsec(`parola:${date.email}`, ip);

    const rezultat = await cereResetarea(date.email);
    return raspuns({ trimis: rezultat.trimis });
  } catch (error) {
    return eroareNeasteptata("parola-cerere", error);
  }
}
