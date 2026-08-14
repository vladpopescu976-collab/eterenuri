import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MyBookingsClient } from "@/components/dashboard/my-bookings-client";

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/autentificare?tip=personal");
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: { field: { select: { id: true, name: true, city: true } } },
    orderBy: { startTime: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Rezervările mele</h1>
      <p className="mt-1 text-muted-foreground">Urmărește statusul cererilor tale de rezervare.</p>

      <div className="mt-8">
        <MyBookingsClient bookings={bookings.map((b) => ({ ...b, totalPrice: Number(b.totalPrice) }))} />
      </div>
    </div>
  );
}
