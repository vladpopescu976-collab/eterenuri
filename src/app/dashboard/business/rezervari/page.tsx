import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingsTable } from "@/components/dashboard/bookings-table";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function BusinessBookingsPage() {
  const session = await auth();
  const ownerId = session!.user.id;

  const [bookings, fields] = await Promise.all([
    prisma.booking.findMany({
      where: { field: { ownerId } },
      include: { customer: { select: { name: true, phone: true } }, field: { select: { id: true, name: true } } },
      orderBy: { startTime: "desc" },
    }),
    prisma.field.findMany({ where: { ownerId }, select: { id: true, name: true, sportType: true } }),
  ]);

  return (
    <BookingsTable
      bookings={bookings.map((b) => ({ ...b, totalPrice: Number(b.totalPrice) }))}
      fields={fields}
    />
  );
}
