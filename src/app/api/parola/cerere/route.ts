import { NextResponse } from "next/server";
import { z } from "zod";

import { cereResetarea } from "@/lib/emailuri/parola";
import { inregistreazaEsec, ipDinCerere, verificaLimitarea } from "@/lib/limitare";

export const maxDuration = 60;

const schema = z.object({
  email: z.string().email("Adresă de email invalidă.").transform((v) => v.trim().toLowerCase()),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Adresă de email invalidă." }, { status: 400 });
  }

  // Fără limitare, formularul devine un mod de a trimite oricui oricâte
  // emailuri, de pe serverul nostru.
  const ip = ipDinCerere(request);
  const limitare = await verificaLimitarea(`parola:${parsed.data.email}`, ip);
  if (!limitare.permis) return NextResponse.json({ error: limitare.mesaj }, { status: 429 });
  await inregistreazaEsec(`parola:${parsed.data.email}`, ip);

  const rezultat = await cereResetarea(parsed.data.email);

  // Același răspuns pentru orice adresă, ca pagina să nu spună cine are cont.
  return NextResponse.json({
    trimis: rezultat.trimis,
    motiv: rezultat.trimis ? undefined : rezultat.motiv,
  });
}
