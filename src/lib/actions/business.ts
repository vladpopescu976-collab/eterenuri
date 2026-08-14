"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireBusinessSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS") {
    throw new Error("Trebuie să fii autentificat cu un cont Business.");
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
    throw new Error("Rezervarea nu a fost găsită.");
  }
  return booking;
}

export async function approveBooking(bookingId: string) {
  const session = await requireBusinessSession();
  await assertOwnsBooking(bookingId, session.user.id);
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
  revalidateDashboard();
}

export async function rejectBooking(bookingId: string) {
  const session = await requireBusinessSession();
  await assertOwnsBooking(bookingId, session.user.id);
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "REJECTED" } });
  revalidateDashboard();
}

const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  note: z.string().optional(),
});

export async function proposeReschedule(input: z.infer<typeof rescheduleSchema>) {
  const session = await requireBusinessSession();
  const data = rescheduleSchema.parse(input);
  const booking = await assertOwnsBooking(data.bookingId, session.user.id);

  const proposedStartTime = new Date(`${data.date}T${data.startTime}:00`);
  const proposedEndTime = new Date(`${data.date}T${data.endTime}:00`);
  if (proposedEndTime <= proposedStartTime) {
    throw new Error("Ora de sfârșit trebuie să fie după ora de start.");
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
}

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Numărul de telefon este obligatoriu.")
  .regex(/^[0-9+()\s-]{7,20}$/, "Număr de telefon invalid.");

const fieldSchema = z.object({
  name: z.string().min(2, "Numele este obligatoriu."),
  sportType: z.enum(["FOOTBALL", "BASKETBALL", "TENNIS", "VOLLEYBALL", "HANDBALL", "PADEL", "BADMINTON", "OTHER"]),
  city: z.string().min(2, "Orașul este obligatoriu."),
  address: z.string().min(2, "Adresa este obligatorie."),
  pricePerHour: z.number().positive("Prețul trebuie să fie pozitiv."),
  openingHour: z.number().int().min(0).max(23),
  closingHour: z.number().int().min(1).max(24),
  contactPhone: phoneSchema,
  description: z.string().trim().max(600, "Descrierea este prea lungă.").optional(),
  amenities: z.array(z.string().trim().min(1)).max(20).optional(),
  // Acceptăm fie un link extern (https://…), fie o poză încărcată de noi,
  // servită din bucket-ul privat prin /api/poze/…
  images: z
    .array(
      z
        .string()
        .trim()
        .refine(
          (value) => /^https?:\/\//.test(value) || value.startsWith("/api/poze/"),
          "Link de imagine invalid."
        )
    )
    .max(6)
    .optional(),
});

export async function addField(input: z.infer<typeof fieldSchema>) {
  const session = await requireBusinessSession();
  const data = fieldSchema.parse(input);
  if (data.closingHour <= data.openingHour) {
    throw new Error("Ora de închidere trebuie să fie după ora de deschidere.");
  }
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
}

const fieldUpdateSchema = z.object({
  fieldId: z.string().min(1),
  pricePerHour: z.number().positive(),
  openingHour: z.number().int().min(0).max(23),
  closingHour: z.number().int().min(1).max(24),
  isActive: z.boolean(),
  contactPhone: phoneSchema,
});

export async function updateField(input: z.infer<typeof fieldUpdateSchema>) {
  const session = await requireBusinessSession();
  const data = fieldUpdateSchema.parse(input);
  if (data.closingHour <= data.openingHour) {
    throw new Error("Ora de închidere trebuie să fie după ora de deschidere.");
  }
  const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
  if (!field || field.ownerId !== session.user.id) {
    throw new Error("Terenul nu a fost găsit.");
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
}

export async function removeField(fieldId: string) {
  const session = await requireBusinessSession();
  const field = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!field || field.ownerId !== session.user.id) {
    throw new Error("Terenul nu a fost găsit.");
  }
  await prisma.field.delete({ where: { id: fieldId } });
  revalidateDashboard();
}
