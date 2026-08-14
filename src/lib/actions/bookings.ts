"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Trebuie să fii autentificat pentru a face o rezervare.");
  }
  return session;
}

const createBookingSchema = z.object({
  fieldId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional(),
});

export async function createBookingRequest(input: z.infer<typeof createBookingSchema>) {
  const session = await requireSession();
  const data = createBookingSchema.parse(input);

  const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
  if (!field || !field.isActive) {
    throw new Error("Terenul nu este disponibil pentru rezervare.");
  }

  const startTime = new Date(`${data.date}T${data.startTime}:00`);
  const endTime = new Date(`${data.date}T${data.endTime}:00`);
  if (endTime <= startTime) {
    throw new Error("Ora de sfârșit trebuie să fie după ora de start.");
  }
  if (startTime < new Date()) {
    throw new Error("Nu poți rezerva un interval din trecut.");
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      fieldId: field.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (overlap) {
    throw new Error("Intervalul ales se suprapune cu o altă rezervare. Alege alt interval.");
  }

  const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
  const totalPrice = Number(field.pricePerHour) * hours;

  const booking = await prisma.booking.create({
    data: {
      fieldId: field.id,
      customerId: session.user.id,
      startTime,
      endTime,
      totalPrice,
      notes: data.notes?.trim() || null,
      status: "PENDING",
    },
  });

  revalidatePath(`/terenuri/${field.id}`);
  revalidatePath("/rezervarile-mele");
  return booking.id;
}

async function assertOwnsAsCustomer(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.customerId !== customerId) {
    throw new Error("Rezervarea nu a fost găsită.");
  }
  return booking;
}

export async function acceptReschedule(bookingId: string) {
  const session = await requireSession();
  const booking = await assertOwnsAsCustomer(bookingId, session.user.id);
  if (booking.status !== "RESCHEDULE_PROPOSED" || !booking.proposedStartTime || !booking.proposedEndTime) {
    throw new Error("Nu există o propunere de mutare pentru această rezervare.");
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      startTime: booking.proposedStartTime,
      endTime: booking.proposedEndTime,
      proposedStartTime: null,
      proposedEndTime: null,
    },
  });
  revalidatePath("/rezervarile-mele");
}

export async function declineReschedule(bookingId: string) {
  const session = await requireSession();
  const booking = await assertOwnsAsCustomer(bookingId, session.user.id);
  if (booking.status !== "RESCHEDULE_PROPOSED") {
    throw new Error("Nu există o propunere de mutare pentru această rezervare.");
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", proposedStartTime: null, proposedEndTime: null },
  });
  revalidatePath("/rezervarile-mele");
}
