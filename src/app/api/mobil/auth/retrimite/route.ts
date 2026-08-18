import { z } from "zod";

import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { retrimiteConfirmarea } from "@/lib/verificare-email";
import { inregistreazaEsec, ipDinCerere, verificaLimitarea } from "@/lib/limitare";

export const maxDuration = 60;

const schema = z.object({
  email: z.string().email("Adresă de email invalidă.").transform((v) => v.trim().toLowerCase()),
});

export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    const ip = ipDinCerere(request);
    const limitare = await verificaLimitarea(`retrimitere:${date.email}`, ip);
    if (!limitare.permis) return eroare(limitare.mesaj, 429);
    await inregistreazaEsec(`retrimitere:${date.email}`, ip);

    const rezultat = await retrimiteConfirmarea(date.email);
    return raspuns({ trimis: rezultat.trimis });
  } catch (error) {
    return eroareNeasteptata("retrimite-confirmare", error);
  }
}
