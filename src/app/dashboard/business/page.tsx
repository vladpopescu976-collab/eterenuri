import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OverviewClient } from "@/components/dashboard/overview-client";
import { UrgentBookingsAlert } from "@/components/dashboard/urgent-bookings-alert";

function oneHourAgo() {
  return new Date(Date.now() - 60 * 60 * 1000);
}

export default async function BusinessOverviewPage() {
  const session = await auth();
  const ownerId = session!.user.id;

  const [fields, bookings, urgentBookings, owner] = await Promise.all([
    prisma.field.findMany({ where: { ownerId } }),
    prisma.booking.findMany({
      where: { field: { ownerId } },
      select: { id: true, status: true, startTime: true, endTime: true, totalPrice: true, fieldId: true },
    }),
    prisma.booking.findMany({
      where: { field: { ownerId }, status: "PENDING", createdAt: { lt: oneHourAgo() } },
      select: {
        id: true,
        createdAt: true,
        startTime: true,
        customer: { select: { name: true, phone: true } },
        field: { select: { name: true, contactPhone: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: ownerId }, select: { phone: true } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-[20px] font-semibold">Privire de ansamblu</h1>
        <p className="text-[13px] text-muted-foreground">Rezumatul activității tale pe Eterenuri</p>
      </div>
      <div className="mb-6">
        <UrgentBookingsAlert bookings={urgentBookings} ownerPhone={owner?.phone ?? null} />
      </div>
      <OverviewClient
        fields={fields.map((f) => ({
          id: f.id,
          sportType: f.sportType,
          isActive: f.isActive,
          openingHour: f.openingHour,
          closingHour: f.closingHour,
        }))}
        bookings={bookings.map((b) => ({ ...b, totalPrice: Number(b.totalPrice) }))}
      />
    </div>
  );
}
