import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { adaugaZile, instantInAppZone, ziuaSaptamanii } from "@/lib/datetime";

/** Cea mai lungă serie pe care o scriem dintr-o singură apăsare. */
export const MAX_SAPTAMANI = 52;

export type RegulaBlocare = {
  fieldId: string;
  /** Zilele săptămânii, ISO: 1 = luni … 7 = duminică. */
  zile: number[];
  oraStart: number;
  oraSfarsit: number;
  /** Prima zi luată în calcul, „2026-08-24”. */
  dataInceput: string;
  saptamani: number;
  motiv?: string | null;
  clientNume?: string | null;
  clientTelefon?: string | null;
};

export type RezultatSerie = {
  serieId: string;
  create: number;
  /** Aparițiile pe care nu le-am scris, cu motivul, ca proprietarul să știe. */
  sarite: { zi: string; motiv: "rezervat" | "blocat" | "trecut" }[];
};

export type EroareSerie = { eroare: string };

/** Toate zilele calendaristice acoperite de regulă, în ordine. */
export function zileleRegulii(regula: {
  zile: number[];
  dataInceput: string;
  saptamani: number;
}): string[] {
  const alese = new Set(regula.zile);
  const rezultat: string[] = [];

  // Pornim din ziua aleasă și mergem înainte, zi cu zi. E mai simplu de urmărit
  // decât un calcul de „următoarea zi de luni” și costă la fel de puțin.
  for (let i = 0; i < regula.saptamani * 7; i++) {
    const zi = adaugaZile(regula.dataInceput, i);
    if (alese.has(ziuaSaptamanii(zi))) rezultat.push(zi);
  }
  return rezultat;
}

/**
 * Scrie toate aparițiile unei reguli, într-o singură tranzacție.
 *
 * Aparițiile se scriu ca rânduri obișnuite în `blocked_slots`, nu ca o regulă
 * citită mai târziu: așa rămân valabile toate verificările care există deja —
 * constrângerea care interzice suprapunerile, calendarul, disponibilitatea și
 * validarea rezervărilor nu trebuie să știe nimic despre repetare.
 *
 * Ce se lovește de o rezervare sau de o blocare existentă e sărit, nu oprește
 * restul: dacă o singură zi din douăsprezece e ocupată, celelalte unsprezece
 * trebuie să se scrie oricum.
 */
export async function creeazaSerie(
  regula: RegulaBlocare,
  ownerId: string
): Promise<RezultatSerie | EroareSerie> {
  const field = await prisma.field.findUnique({ where: { id: regula.fieldId } });
  if (!field || field.ownerId !== ownerId) return { eroare: "Terenul nu a fost găsit." };

  if (regula.zile.length === 0) return { eroare: "Alege cel puțin o zi a săptămânii." };
  if (regula.oraSfarsit <= regula.oraStart) {
    return { eroare: "Ora de sfârșit trebuie să fie după ora de start." };
  }
  if (regula.oraStart < field.openingHour || regula.oraSfarsit > field.closingHour) {
    return {
      eroare: `Terenul este deschis între ${ora(field.openingHour)} și ${ora(field.closingHour)}. Alege un interval din acest program.`,
    };
  }
  if (regula.saptamani < 1 || regula.saptamani > MAX_SAPTAMANI) {
    return { eroare: `Poți repeta cel mult ${MAX_SAPTAMANI} de săptămâni odată.` };
  }

  const zile = zileleRegulii(regula);
  if (zile.length === 0) return { eroare: "Regula nu acoperă nicio zi." };

  const acum = new Date();
  const candidati: { zi: string; inceput: Date; sfarsit: Date }[] = [];
  const sarite: RezultatSerie["sarite"] = [];

  for (const zi of zile) {
    const inceput = instantInAppZone(zi, regula.oraStart);
    const sfarsit = instantInAppZone(zi, regula.oraSfarsit);
    if (!inceput || !sfarsit) continue;
    // O oră care a trecut nu mai are ce bloca.
    if (sfarsit <= acum) {
      sarite.push({ zi, motiv: "trecut" });
      continue;
    }
    candidati.push({ zi, inceput, sfarsit });
  }

  if (candidati.length === 0) {
    return { serieId: "", create: 0, sarite };
  }

  const primul = candidati[0].inceput;
  const ultimul = candidati[candidati.length - 1].sfarsit;
  const serieId = randomUUID();

  const create = await prisma.$transaction(async (tx) => {
    await lockField(tx, field.id);

    // O singură interogare pentru tot intervalul, nu una pe zi: o serie de un
    // an ar fi însemnat sute de dus-întorsuri la baza de date.
    const [rezervari, blocari] = await Promise.all([
      tx.booking.findMany({
        where: {
          fieldId: field.id,
          status: { in: ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"] },
          startTime: { lt: ultimul },
          endTime: { gt: primul },
        },
        select: { startTime: true, endTime: true },
      }),
      tx.blockedSlot.findMany({
        where: { fieldId: field.id, startTime: { lt: ultimul }, endTime: { gt: primul } },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const deScris: Prisma.BlockedSlotCreateManyInput[] = [];

    for (const candidat of candidati) {
      const seSuprapune = (interval: { startTime: Date; endTime: Date }) =>
        interval.startTime < candidat.sfarsit && interval.endTime > candidat.inceput;

      if (rezervari.some(seSuprapune)) {
        sarite.push({ zi: candidat.zi, motiv: "rezervat" });
        continue;
      }
      // Aceeași oră în aceeași zi nu se scrie de două ori.
      if (blocari.some(seSuprapune)) {
        sarite.push({ zi: candidat.zi, motiv: "blocat" });
        continue;
      }

      deScris.push({
        fieldId: field.id,
        startTime: candidat.inceput,
        endTime: candidat.sfarsit,
        reason: regula.motiv?.trim() || null,
        clientName: regula.clientNume?.trim() || null,
        clientPhone: regula.clientTelefon?.trim() || null,
        serieId,
      });
    }

    if (deScris.length === 0) return 0;

    const rezultat = await tx.blockedSlot.createMany({ data: deScris });
    return rezultat.count;
  });

  return { serieId, create, sarite };
}

/** Șterge dintr-o serie tot ce nu s-a întâmplat încă. */
export async function stergeSeria(
  serieId: string,
  ownerId: string
): Promise<{ sterse: number } | EroareSerie> {
  const exista = await prisma.blockedSlot.findFirst({
    where: { serieId, field: { ownerId } },
    select: { id: true },
  });
  if (!exista) return { eroare: "Seria nu a fost găsită." };

  // Aparițiile trecute rămân: sunt istoricul terenului, nu ceva de anulat.
  const rezultat = await prisma.blockedSlot.deleteMany({
    where: { serieId, field: { ownerId }, endTime: { gt: new Date() } },
  });
  return { sterse: rezultat.count };
}

async function lockField(tx: Prisma.TransactionClient, fieldId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${fieldId}))`;
}

function ora(valoare: number): string {
  return `${String(valoare).padStart(2, "0")}:00`;
}
