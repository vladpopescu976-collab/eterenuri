"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";
import { fieldSchema, fieldUpdateSchema } from "@/lib/validations/field";

async function requireBusinessSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS") {
    throw new ActionError("Sesiunea a expirat. Autentifică-te din nou cu contul Business.");
  }
  return session;
}

function revalidateDashboard() {
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/business/orar");
  revalidatePath("/dashboard/business/rezervari");
  revalidatePath("/dashboard/business/terenuri");
}

async function assertOwnsBooking(bookingId: string, ownerId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { field: true },
  });
  if (!booking || booking.field.ownerId !== ownerId) {
    throw new ActionError("Rezervarea nu a fost găsită.");
  }
  return booking;
}

export async function approveBooking(bookingId: string): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    await assertOwnsBooking(bookingId, session.user.id);
    await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("approveBooking", error);
  }
}

export async function rejectBooking(bookingId: string): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    await assertOwnsBooking(bookingId, session.user.id);
    await prisma.booking.update({ where: { id: bookingId }, data: { status: "REJECTED" } });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("rejectBooking", error);
  }
}

const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  date: z.string().min(1, "Alege o dată."),
  startTime: z.string().min(1, "Alege ora de start."),
  endTime: z.string().min(1, "Alege ora de sfârșit."),
  note: z.string().optional(),
});

export async function proposeReschedule(
  input: z.infer<typeof rescheduleSchema>
): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = rescheduleSchema.parse(input);
    const booking = await assertOwnsBooking(data.bookingId, session.user.id);

    const proposedStartTime = new Date(`${data.date}T${data.startTime}:00`);
    const proposedEndTime = new Date(`${data.date}T${data.endTime}:00`);
    if (Number.isNaN(proposedStartTime.getTime()) || Number.isNaN(proposedEndTime.getTime())) {
      return fail("Data sau ora aleasă nu este validă.");
    }
    if (proposedEndTime <= proposedStartTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "RESCHEDULE_PROPOSED",
        proposedStartTime,
        proposedEndTime,
        rescheduleNote: data.note?.trim() || null,
      },
    });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("proposeReschedule", error);
  }
}

export async function addField(input: z.input<typeof fieldSchema>): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = fieldSchema.parse(input);

    const { description, amenities, images, ...rest } = data;
    await prisma.field.create({
      data: {
        ...rest,
        ownerId: session.user.id,
        description: description || null,
        amenities: amenities ?? [],
        images: images ?? [],
      },
    });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("addField", error);
  }
}

export async function updateField(
  input: z.input<typeof fieldUpdateSchema>
): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = fieldUpdateSchema.parse(input);

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field || field.ownerId !== session.user.id) {
      return fail("Terenul nu a fost găsit.");
    }
    await prisma.field.update({
      where: { id: data.fieldId },
      data: {
        pricePerHour: data.pricePerHour,
        openingHour: data.openingHour,
        closingHour: data.closingHour,
        isActive: data.isActive,
        contactPhone: data.contactPhone,
      },
    });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("updateField", error);
  }
}

export async function removeField(fieldId: string): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const field = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!field || field.ownerId !== session.user.id) {
      return fail("Terenul nu a fost găsit.");
    }
    await prisma.field.delete({ where: { id: fieldId } });
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("removeField", error);
  }
}
