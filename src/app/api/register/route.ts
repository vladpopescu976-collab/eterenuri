import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { trimiteConfirmarea } from "@/lib/verificare-email";
import { normalizeazaOras } from "@/lib/orase";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide. Verifică formularul." },
      { status: 400 }
    );
  }

  const { name, email, password, role, phone, city, sports } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (existingUser) {
    // Un cont creat si neconfirmat blocheaza adresa. In loc sa spunem doar
    // „exista deja”, retrimitem linkul: e cazul cel mai probabil, cineva care
    // a inchis emailul si a reluat inregistrarea.
    if (!existingUser.emailVerified) {
      const rezultat = await trimiteConfirmarea(existingUser);
      return NextResponse.json({
        stare: "asteapta-confirmare",
        email: existingUser.email,
        emailTrimis: rezultat.trimis,
        motiv: rezultat.trimis ? undefined : rezultat.motiv,
      });
    }

    return NextResponse.json(
      { error: "Există deja un cont cu acest email." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || null,
      city: city ? normalizeazaOras(city) : null,
      sports,
      // emailVerified ramane null: contul exista, dar nu se poate autentifica
      // pana cand adresa nu e confirmata.
    },
  });

  const rezultat = await trimiteConfirmarea(user);

  return NextResponse.json(
    {
      stare: "asteapta-confirmare",
      email: user.email,
      emailTrimis: rezultat.trimis,
      motiv: rezultat.trimis ? undefined : rezultat.motiv,
    },
    { status: 201 }
  );
}
