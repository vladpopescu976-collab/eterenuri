import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Baza Prisma Postgres se suspenda cand e inactiva si o cerere care o
// trezeste poate dura ~30-55s. Pagina de autentificare cheama ruta asta la
// incarcare, ca baza sa se trezeasca in timp ce utilizatorul isi scrie
// datele — altfel autentificarea pare ca nu face nimic si utilizatorul
// renunta (mai ales pe telefon).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ gata: true });
  } catch {
    return NextResponse.json({ gata: false }, { status: 503 });
  }
}
