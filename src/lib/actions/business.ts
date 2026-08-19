"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anuntaRezervare } from "@/lib/emailuri/rezervari";
import { outsideOpeningHours } from "@/lib/availability";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";
import { fieldEditSchema, fieldSchema, fieldUpdateSchema } from "@/lib/validations/field";
import { cheieOras, normalizeazaOras } from "@/lib/orase";

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
    anuntaRezervare(bookingId, "aprobata");
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
    anuntaRezervare(bookingId, "respinsa");
    revalidateDashboard();
    return ok();
  } catch (error) {
    return toActionError("rejectBooking", error);
  }
}

// Orele vin ca momente ISO complete, calculate în browser (vezi
// src/lib/datetime.ts). Serverul nu mai reconstruiește ora din „dată + oră”,
// pentru că o făcea în fusul lui — pe Vercel, UTC — și muta propunerea cu
// câteva ore față de ce alesese proprietarul.
const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  startTime: z.iso.datetime({ message: "Ora de start nu este validă." }),
  endTime: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  note: z.string().optional(),
});

export async function proposeReschedule(
  input: z.infer<typeof rescheduleSchema>
): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = rescheduleSchema.parse(input);
    const booking = await assertOwnsBooking(data.bookingId, session.user.id);

    const proposedStartTime = new Date(data.startTime);
    const proposedEndTime = new Date(data.endTime);
    if (proposedEndTime <= proposedStartTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }

    // Propunerea devine rezervare dacă e acceptată, deci trebuie să respecte
    // programul la fel ca orice altă rezervare.
    const field = await prisma.field.findUnique({
      where: { id: booking.fieldId },
      select: { openingHour: true, closingHour: true },
    });
    if (field) {
      const inAfara = outsideOpeningHours(
        proposedStartTime, proposedEndTime, field.openingHour, field.closingHour
      );
      if (inAfara) return fail(inAfara);
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
    anuntaRezervare(booking.id, "mutare-propusa");
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

    const { description, amenities, images, city, ...rest } = data;
    await prisma.field.create({
      data: {
        ...rest,
        // Salvăm orașul scris corect, ca listele publice să arate îngrijit.
        city: normalizeazaOras(city),
        cityKey: cheieOras(city),
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

// Editare completă a unui teren deja publicat: nume, sport, adresă, preț,
// program, telefon, descriere, facilități și poze.
export async function updateFieldDetails(
  input: z.input<typeof fieldEditSchema>
): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = fieldEditSchema.parse(input);

    const existing = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!existing || existing.ownerId !== session.user.id) {
      return fail("Terenul nu a fost găsit.");
    }

    const { fieldId, description, amenities, images, city, ...rest } = data;
    await prisma.field.update({
      where: { id: fieldId },
      data: {
        ...rest,
        city: normalizeazaOras(city),
        cityKey: cheieOras(city),
        description: description || null,
        amenities: amenities ?? [],
        images: images ?? [],
      },
    });

    revalidateDashboard();
    // Pagina publică a terenului trebuie să arate imediat noile informații.
    revalidatePath(`/terenuri/${fieldId}`);
    revalidatePath("/");
    revalidatePath("/cauta-terenuri");
    return ok();
  } catch (error) {
    return toActionError("updateFieldDetails", error);
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
