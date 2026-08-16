"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ActionError("Sesiunea a expirat. Autentifică-te din nou pentru a rezerva.");
  }
  return session;
}

const createBookingSchema = z.object({
  fieldId: z.string().min(1),
  date: z.string().min(1, "Alege o dată."),
  startTime: z.string().min(1, "Alege ora de start."),
  endTime: z.string().min(1, "Alege ora de sfârșit."),
  notes: z.string().max(600, "Mesajul nu poate depăși 600 de caractere.").optional(),
});

export async function createBookingRequest(
  input: z.infer<typeof createBookingSchema>
): Promise<ActionResult<string>> {
  try {
    const session = await requireSession();
    const data = createBookingSchema.parse(input);

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field || !field.isActive) {
      return fail("Terenul nu este disponibil pentru rezervare.");
    }

    const startTime = new Date(`${data.date}T${data.startTime}:00`);
    const endTime = new Date(`${data.date}T${data.endTime}:00`);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return fail("Data sau ora aleasă nu este validă.");
    }
    if (endTime <= startTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }
    if (startTime < new Date()) {
      return fail("Nu poți rezerva un interval din trecut.");
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
      return fail("Intervalul ales se suprapune cu o altă rezervare. Alege alt interval.");
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
    return ok(booking.id);
  } catch (error) {
    return toActionError("createBookingRequest", error);
  }
}

async function assertOwnsAsCustomer(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.customerId !== customerId) {
    throw new ActionError("Rezervarea nu a fost găsită.");
  }
  return booking;
}

export async function acceptReschedule(bookingId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const booking = await assertOwnsAsCustomer(bookingId, session.user.id);
    if (
      booking.status !== "RESCHEDULE_PROPOSED" ||
      !booking.proposedStartTime ||
      !booking.proposedEndTime
    ) {
      return fail("Nu există o propunere de mutare pentru această rezervare.");
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
    return ok();
  } catch (error) {
    return toActionError("acceptReschedule", error);
  }
}

export async function declineReschedule(bookingId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const booking = await assertOwnsAsCustomer(bookingId, session.user.id);
    if (booking.status !== "RESCHEDULE_PROPOSED") {
      return fail("Nu există o propunere de mutare pentru această rezervare.");
    }
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "REJECTED", proposedStartTime: null, proposedEndTime: null },
    });
    revalidatePath("/rezervarile-mele");
    return ok();
  } catch (error) {
    return toActionError("declineReschedule", error);
  }
}
