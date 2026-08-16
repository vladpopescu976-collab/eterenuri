"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

// Statusurile care chiar ocupă terenul. Aceleași sunt folosite și de
// constrângerea din baza de date (vezi migrarea prevent_booking_overlap).
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ActionError("Sesiunea a expirat. Autentifică-te din nou pentru a rezerva.");
  }
  return session;
}

// Baza de date respinge suprapunerile cu eroarea Postgres 23P01. O prindem ca
// să îi arătăm clientului un mesaj în română, nu o eroare tehnică.
function isOverlapViolation(error: unknown): boolean {
  const text =
    error instanceof Error ? `${error.message}` : typeof error === "string" ? error : "";
  return text.includes("23P01") || text.includes("bookings_no_overlap");
}

const OVERLAP_MESSAGE =
  "Intervalul ales tocmai a fost rezervat de altcineva. Alege alt interval.";

async function assertOwnsAsCustomer(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.customerId !== customerId) {
    throw new ActionError("Rezervarea nu a fost găsită.");
  }
  return booking;
}

// Ca și la propunerea de mutare: orele vin ca momente ISO complete, calculate
// în browser. Serverul le construia din „dată + oră” în fusul lui, iar pe
// Vercel (UTC) rezervarea ajungea în baza de date cu câteva ore mai târziu
// decât alesese clientul.
const createBookingSchema = z.object({
  fieldId: z.string().min(1),
  startTime: z.iso.datetime({ message: "Ora de start nu este validă." }),
  endTime: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
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

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }
    if (startTime < new Date()) {
      return fail("Nu poți rezerva un interval din trecut.");
    }

    // Verificarea asta prinde cazul obișnuit și dă un mesaj mai bun, dar nu
    // poate opri două cereri simultane — între citire și scriere e o fereastră
    // în care ambele văd terenul liber. Garanția reală o dă constrângerea din
    // baza de date, prinsă mai jos.
    const overlap = await prisma.booking.findFirst({
      where: {
        fieldId: field.id,
        status: { in: [...ACTIVE_STATUSES] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlap) {
      return fail("Intervalul ales se suprapune cu o altă rezervare. Alege alt interval.");
    }

    const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
    const totalPrice = Number(field.pricePerHour) * hours;

    let booking;
    try {
      booking = await prisma.booking.create({
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
    } catch (error) {
      if (isOverlapViolation(error)) return fail(OVERLAP_MESSAGE);
      throw error;
    }

    revalidatePath(`/terenuri/${field.id}`);
    revalidatePath("/rezervarile-mele");
    return ok(booking.id);
  } catch (error) {
    return toActionError("createBookingRequest", error);
  }
}

// Intervalele deja ocupate dintr-o zi, ca formularul să le poată arăta gri.
// `excludeBookingId` e folosit când clientul își mută propria rezervare —
// altfel orele ei actuale ar apărea ca fiind ocupate de altcineva.
const bookedSlotsSchema = z.object({
  fieldId: z.string().min(1),
  dayStart: z.iso.datetime(),
  dayEnd: z.iso.datetime(),
  excludeBookingId: z.string().optional(),
});

export async function getBookedSlots(
  input: z.infer<typeof bookedSlotsSchema>
): Promise<ActionResult<{ start: string; end: string }[]>> {
  try {
    const data = bookedSlotsSchema.parse(input);

    const bookings = await prisma.booking.findMany({
      where: {
        fieldId: data.fieldId,
        status: { in: [...ACTIVE_STATUSES] },
        startTime: { lt: new Date(data.dayEnd) },
        endTime: { gt: new Date(data.dayStart) },
        ...(data.excludeBookingId ? { NOT: { id: data.excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    });

    return ok(
      bookings.map((b) => ({
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
      }))
    );
  } catch (error) {
    return toActionError("getBookedSlots", error);
  }
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const booking = await assertOwnsAsCustomer(bookingId, session.user.id);

    if (booking.status === "CANCELLED") {
      return fail("Rezervarea este deja anulată.");
    }
    if (booking.status === "REJECTED") {
      return fail("Rezervarea a fost deja respinsă de proprietar.");
    }
    if (booking.endTime < new Date()) {
      return fail("Nu poți anula o rezervare care s-a încheiat deja.");
    }

    // Statusul CANCELLED nu intră în constrângerea de suprapunere, deci orele
    // redevin libere pentru alți clienți în momentul anulării.
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", proposedStartTime: null, proposedEndTime: null },
    });

    revalidatePath("/rezervarile-mele");
    revalidatePath(`/terenuri/${booking.fieldId}`);
    revalidatePath("/dashboard/business");
    revalidatePath("/dashboard/business/orar");
    revalidatePath("/dashboard/business/rezervari");
    return ok();
  } catch (error) {
    return toActionError("cancelBooking", error);
  }
}

const updateBookingTimeSchema = z.object({
  bookingId: z.string().min(1),
  startTime: z.iso.datetime({ message: "Ora de start nu este validă." }),
  endTime: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
});

export async function updateBookingTime(
  input: z.infer<typeof updateBookingTimeSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = updateBookingTimeSchema.parse(input);
    const booking = await assertOwnsAsCustomer(data.bookingId, session.user.id);

    if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
      return fail("Rezervarea nu mai este activă, așa că nu poate fi modificată.");
    }
    if (booking.endTime < new Date()) {
      return fail("Nu poți modifica o rezervare care s-a încheiat deja.");
    }

    const field = await prisma.field.findUnique({ where: { id: booking.fieldId } });
    if (!field || !field.isActive) {
      return fail("Terenul nu mai este disponibil pentru rezervare.");
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }
    if (startTime < new Date()) {
      return fail("Nu poți muta rezervarea într-un interval din trecut.");
    }

    const startHour = startTime.getHours();
    const endHour = endTime.getHours() === 0 ? 24 : endTime.getHours();
    if (startHour < field.openingHour || endHour > field.closingHour) {
      return fail(
        `Terenul este deschis între ${String(field.openingHour).padStart(2, "0")}:00 și ${String(field.closingHour).padStart(2, "0")}:00.`
      );
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        fieldId: booking.fieldId,
        id: { not: booking.id },
        status: { in: [...ACTIVE_STATUSES] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlap) {
      return fail("Intervalul ales se suprapune cu o altă rezervare. Alege alt interval.");
    }

    const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
    const totalPrice = Number(field.pricePerHour) * hours;

    try {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          startTime,
          endTime,
          totalPrice,
          // Rezervarea mutată de client pleacă din nou spre aprobare, iar o
          // eventuală propunere a proprietarului nu mai are obiect.
          status: "PENDING",
          proposedStartTime: null,
          proposedEndTime: null,
          rescheduleNote: null,
        },
      });
    } catch (error) {
      if (isOverlapViolation(error)) return fail(OVERLAP_MESSAGE);
      throw error;
    }

    revalidatePath("/rezervarile-mele");
    revalidatePath(`/terenuri/${booking.fieldId}`);
    revalidatePath("/dashboard/business");
    revalidatePath("/dashboard/business/orar");
    revalidatePath("/dashboard/business/rezervari");
    return ok();
  } catch (error) {
    return toActionError("updateBookingTime", error);
  }
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

    try {
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
    } catch (error) {
      if (isOverlapViolation(error)) {
        return fail(
          "Ora propusă s-a ocupat între timp. Cere proprietarului o altă oră."
        );
      }
      throw error;
    }

    revalidatePath("/rezervarile-mele");
    revalidatePath(`/terenuri/${booking.fieldId}`);
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
