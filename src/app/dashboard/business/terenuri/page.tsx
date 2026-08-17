import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FieldSettingsClient } from "@/components/dashboard/field-settings-client";
import { normalizeazaOras } from "@/lib/orase";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function BusinessFieldsPage() {
  const session = await auth();
  const ownerId = session!.user.id;

  const fields = await prisma.field.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });

  return (
    <FieldSettingsClient
      fields={fields.map((f) => ({
        id: f.id,
        name: f.name,
        sportType: f.sportType,
        city: normalizeazaOras(f.city),
        address: f.address,
        pricePerHour: Number(f.pricePerHour),
        openingHour: f.openingHour,
        closingHour: f.closingHour,
        isActive: f.isActive,
        contactPhone: f.contactPhone,
        description: f.description,
        amenities: f.amenities,
        images: f.images,
      }))}
    />
  );
}
