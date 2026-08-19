"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError, fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";
import { creeazaSerie, stergeSeria, MAX_SAPTAMANI } from "@/lib/blocari-recurente";

async function requireBusinessSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS") {
    throw new ActionError("Sesiunea a expirat. Autentifică-te din nou cu contul Business.");
  }
  return session;
}

async function assertOwnsField(fieldId: string, ownerId: string) {
  const field = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!field || field.ownerId !== ownerId) {
    throw new ActionError("Terenul nu a fost găsit.");
  }
  return field;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "";
}

async function lockField(tx: Prisma.TransactionClient, fieldId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${fieldId}))`;
}

function revalidateAll(fieldId: string) {
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/business/orar");
  revalidatePath("/dashboard/business/rezervari");
  revalidatePath(`/terenuri/${fieldId}`);
  revalidatePath("/cauta-terenuri");
}

const blockSchema = z.object({
  fieldId: z.string().min(1),
  startTime: z.iso.datetime({ message: "Ora de start nu este validă." }),
  endTime: z.iso.datetime({ message: "Ora de sfârșit nu este validă." }),
  reason: z.string().trim().max(200, "Motivul nu poate depăși 200 de caractere.").optional(),
  // Completate doar când proprietarul notează o rezervare primită la telefon.
  clientName: z.string().trim().max(100, "Numele este prea lung.").optional(),
  clientPhone: z.string().trim().max(30, "Numărul este prea lung.").optional(),
});

export async function blockSlot(input: z.infer<typeof blockSchema>): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();
    const data = blockSchema.parse(input);
    const field = await assertOwnsField(data.fieldId, session.user.id);

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      return fail("Ora de sfârșit trebuie să fie după ora de start.");
    }

    try {
      await prisma.$transaction(async (tx) => {
        await lockField(tx, field.id);

        const booking = await tx.booking.findFirst({
          where: {
            fieldId: field.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          include: { customer: { select: { name: true } } },
        });
        if (booking) {
          throw new ActionError(
            `Nu poți bloca intervalul: există deja o rezervare a lui ${booking.customer.name}. Respinge-o sau propune-i altă oră mai întâi.`
          );
        }

        const existing = await tx.blockedSlot.findFirst({
          where: {
            fieldId: field.id,
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });
        if (existing) throw new ActionError("Intervalul este deja blocat.");

        await tx.blockedSlot.create({
          data: {
            fieldId: field.id,
            startTime,
            endTime,
            reason: data.reason?.trim() || null,
            clientName: data.clientName?.trim() || null,
            clientPhone: data.clientPhone?.trim() || null,
          },
        });
      });
    } catch (error) {
      const text = errorText(error);
      if (text.includes("BLOCKED_SLOT_ON_BOOKING")) {
        return fail("Între timp a apărut o rezervare pe acest interval. Reîncarcă pagina.");
      }
      if (text.includes("blocked_slots_no_overlap")) {
        return fail("Intervalul este deja blocat.");
      }
      throw error;
    }

    revalidateAll(field.id);
    return ok();
  } catch (error) {
    return toActionError("blockSlot", error);
  }
}

export async function unblockSlot(blockedSlotId: string): Promise<ActionResult> {
  try {
    const session = await requireBusinessSession();

    const slot = await prisma.blockedSlot.findUnique({
      where: { id: blockedSlotId },
      include: { field: { select: { id: true, ownerId: true } } },
    });
    if (!slot || slot.field.ownerId !== session.user.id) {
      return fail("Intervalul blocat nu a fost găsit.");
    }

    await prisma.blockedSlot.delete({ where: { id: blockedSlotId } });

    revalidateAll(slot.field.id);
    return ok();
  } catch (error) {
    return toActionError("unblockSlot", error);
  }
}

const serieSchema = z.object({
  fieldId: z.string().min(1),
  // ISO: 1 = luni … 7 = duminică.
  zile: z.array(z.number().int().min(1).max(7)).min(1, "Alege cel puțin o zi a săptămânii."),
  oraStart: z.number().int().min(0).max(23),
  oraSfarsit: z.number().int().min(1).max(24),
  dataInceput: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de început nu este validă."),
  saptamani: z.number().int().min(1).max(MAX_SAPTAMANI),
  reason: z.string().trim().max(200, "Motivul nu poate depăși 200 de caractere.").optional(),
  clientName: z.string().trim().max(100, "Numele este prea lung.").optional(),
  clientPhone: z.string().trim().max(30, "Numărul este prea lung.").optional(),
});

export type RezumatSerie = { create: number; rezervate: number; blocate: number; trecute: number };

/** Blochează aceeași oră în fiecare săptămână, pe zilele alese. */
export async function blockSlotSeries(
  input: z.infer<typeof serieSchema>
): Promise<ActionResult<RezumatSerie>> {
  try {
    const session = await requireBusinessSession();
    const data = serieSchema.parse(input);

    const rezultat = await creeazaSerie(
      {
        fieldId: data.fieldId,
        zile: data.zile,
        oraStart: data.oraStart,
        oraSfarsit: data.oraSfarsit,
        dataInceput: data.dataInceput,
        saptamani: data.saptamani,
        motiv: data.reason,
        clientNume: data.clientName,
        clientTelefon: data.clientPhone,
      },
      session.user.id
    );

    if ("eroare" in rezultat) return fail(rezultat.eroare);

    revalidateAll(data.fieldId);
    return ok({
      create: rezultat.create,
      rezervate: rezultat.sarite.filter((s) => s.motiv === "rezervat").length,
      blocate: rezultat.sarite.filter((s) => s.motiv === "blocat").length,
      trecute: rezultat.sarite.filter((s) => s.motiv === "trecut").length,
    });
  } catch (error) {
    return toActionError("blockSlotSeries", error);
  }
}

/** Șterge toate blocările viitoare dintr-o serie. */
export async function unblockSeries(serieId: string, fieldId: string): Promise<ActionResult<number>> {
  try {
    const session = await requireBusinessSession();
    const rezultat = await stergeSeria(serieId, session.user.id);
    if ("eroare" in rezultat) return fail(rezultat.eroare);

    revalidateAll(fieldId);
    return ok(rezultat.sterse);
  } catch (error) {
    return toActionError("unblockSeries", error);
  }
}
