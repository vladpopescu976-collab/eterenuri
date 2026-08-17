import type { Booking, BookingStatus, Field, Review, SportType } from "@prisma/client";

import { normalizeazaOras } from "@/lib/orase";

// Formele trimise către aplicația nativă. Sunt scrise explicit ca să nu ajungă
// din greșeală câmpuri interne în răspuns și ca structurile din Swift să aibă
// un contract stabil.

export type TerenApi = {
  id: string;
  nume: string;
  sport: SportType;
  oras: string;
  adresa: string;
  descriere: string | null;
  pretPeOra: number;
  poze: string[];
  facilitati: string[];
  oraDeschidere: number;
  oraInchidere: number;
  telefonContact: string | null;
  activ: boolean;
  notaMedie: number | null;
  numarRecenzii: number;
  favorit: boolean;
};

export function serializeazaTeren(
  field: Field,
  extra: { notaMedie?: number | null; numarRecenzii?: number; favorit?: boolean } = {}
): TerenApi {
  return {
    id: field.id,
    nume: field.name,
    sport: field.sportType,
    // Datele vechi pot avea orașul scris oricum; îl arătăm mereu corect.
    oras: normalizeazaOras(field.city),
    adresa: field.address,
    descriere: field.description,
    pretPeOra: Number(field.pricePerHour),
    poze: field.images,
    facilitati: field.amenities,
    oraDeschidere: field.openingHour,
    oraInchidere: field.closingHour,
    telefonContact: field.contactPhone,
    activ: field.isActive,
    notaMedie: extra.notaMedie ?? null,
    numarRecenzii: extra.numarRecenzii ?? 0,
    favorit: extra.favorit ?? false,
  };
}

export type RezervareApi = {
  id: string;
  status: BookingStatus;
  inceput: string;
  sfarsit: string;
  inceputPropus: string | null;
  sfarsitPropus: string | null;
  notaMutare: string | null;
  pretTotal: number;
  observatii: string | null;
  teren: { id: string; nume: string; oras: string; oraDeschidere: number; oraInchidere: number };
  client?: { nume: string; telefon: string | null };
  recenzie?: { nota: number; comentariu: string | null; raspunsProprietar: string | null } | null;
};

type BookingCuTeren = Booking & {
  field: Pick<Field, "id" | "name" | "city" | "openingHour" | "closingHour">;
  customer?: { name: string; phone: string | null };
  review?: Pick<Review, "rating" | "comment" | "ownerReply"> | null;
};

export function serializeazaRezervare(booking: BookingCuTeren): RezervareApi {
  return {
    id: booking.id,
    status: booking.status,
    inceput: booking.startTime.toISOString(),
    sfarsit: booking.endTime.toISOString(),
    inceputPropus: booking.proposedStartTime?.toISOString() ?? null,
    sfarsitPropus: booking.proposedEndTime?.toISOString() ?? null,
    notaMutare: booking.rescheduleNote,
    pretTotal: Number(booking.totalPrice),
    observatii: booking.notes,
    teren: {
      id: booking.field.id,
      nume: booking.field.name,
      oras: normalizeazaOras(booking.field.city),
      oraDeschidere: booking.field.openingHour,
      oraInchidere: booking.field.closingHour,
    },
    ...(booking.customer
      ? { client: { nume: booking.customer.name, telefon: booking.customer.phone } }
      : {}),
    ...(booking.review !== undefined
      ? {
          recenzie: booking.review
            ? {
                nota: booking.review.rating,
                comentariu: booking.review.comment,
                raspunsProprietar: booking.review.ownerReply,
              }
            : null,
        }
      : {}),
  };
}

export type IntervalApi = { inceput: string; sfarsit: string };
