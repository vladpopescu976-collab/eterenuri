import { NextResponse } from "next/server";

import { retrimiteConfirmarea } from "@/lib/verificare-email";
import { retrimitereSchema } from "@/lib/validations/auth";
import { ipDinCerere, inregistreazaEsec, verificaLimitarea } from "@/lib/limitare";

export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = retrimitereSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Adresă de email invalidă." }, { status: 400 });
  }

  // Fara limitare, butonul „retrimite” devine un mod de a trimite oricui
  // oricate emailuri, de pe serverul nostru.
  const ip = ipDinCerere(request);
  const limitare = await verificaLimitarea(`retrimitere:${parsed.data.email}`, ip);
  if (!limitare.permis) {
    return NextResponse.json({ error: limitare.mesaj }, { status: 429 });
  }
  await inregistreazaEsec(`retrimitere:${parsed.data.email}`, ip);

  const rezultat = await retrimiteConfirmarea(parsed.data.email);

  // Raspunsul e acelasi pentru orice adresa, ca ruta sa nu spuna cine are cont.
  return NextResponse.json({
    trimis: rezultat.trimis,
    motiv: rezultat.trimis ? undefined : rezultat.motiv,
  });
}
