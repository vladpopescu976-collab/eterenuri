import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

// Sumar ușor pentru badge-ul din navbar: câte rezervări îi cer clientului
// un răspuns (proprietarul a propus o mutare) și câte sunt încă în așteptare.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PERSONAL") {
    return NextResponse.json({ actionNeeded: 0, pending: 0 });
  }

  const [actionNeeded, pending] = await Promise.all([
    prisma.booking.count({
      where: { customerId: session.user.id, status: "RESCHEDULE_PROPOSED" },
    }),
    prisma.booking.count({
      where: { customerId: session.user.id, status: "PENDING" },
    }),
  ]);

  return NextResponse.json({ actionNeeded, pending });
}
