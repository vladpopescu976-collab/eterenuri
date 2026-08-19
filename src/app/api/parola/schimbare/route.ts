import { NextResponse } from "next/server";
import { z } from "zod";

import { schimbaParola } from "@/lib/emailuri/parola";
import { parolaSchema } from "@/lib/validations/auth";

export const maxDuration = 60;

const schema = z.object({
  token: z.string().min(1),
  parola: parolaSchema,
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide." },
      { status: 400 }
    );
  }

  const rezultat = await schimbaParola(parsed.data.token, parsed.data.parola);

  if (rezultat.stare === "expirat") {
    return NextResponse.json(
      { error: "Linkul a expirat. Cere altul din pagina de autentificare." },
      { status: 410 }
    );
  }
  if (rezultat.stare === "invalid") {
    return NextResponse.json(
      { error: "Linkul este invalid sau a fost deja folosit." },
      { status: 400 }
    );
  }

  return NextResponse.json({ schimbat: true, email: rezultat.email });
}
