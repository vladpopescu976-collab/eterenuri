import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "@/components/dashboard/schedule-client";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function BusinessSchedulePage() {
  const session = await auth();
  const ownerId = session!.user.id;

  const [fields, bookings] = await Promise.all([
    prisma.field.findMany({ where: { ownerId }, select: { id: true, name: true, sportType: true } }),
    prisma.booking.findMany({
      where: { field: { ownerId } },
      include: { customer: { select: { name: true } }, field: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <ScheduleClient
      fields={fields}
      bookings={bookings.map((b) => ({ ...b, totalPrice: Number(b.totalPrice) }))}
    />
  );
}
