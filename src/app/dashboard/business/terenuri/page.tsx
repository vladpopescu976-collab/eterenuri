import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FieldSettingsClient } from "@/components/dashboard/field-settings-client";

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
        city: f.city,
        pricePerHour: Number(f.pricePerHour),
        openingHour: f.openingHour,
        closingHour: f.closingHour,
        isActive: f.isActive,
        contactPhone: f.contactPhone,
      }))}
    />
  );
}
