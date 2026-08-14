import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: "contact@sportarena.ro" },
  });

  if (!owner) {
    console.log(
      "Contul Business demo (contact@sportarena.ro) nu există — sari peste seed."
    );
    return;
  }

  const demoFields = [
    {
      name: "Arena Centrală Fotbal",
      description: "Teren de fotbal cu gazon sintetic de ultimă generație, nocturnă inclusă.",
      sportType: "FOOTBALL" as const,
      city: "București",
      address: "Str. Sportivilor 12",
      pricePerHour: 150,
      amenities: ["Nocturnă", "Vestiare", "Parcare"],
    },
    {
      name: "Sport Arena Baschet",
      description: "Teren de baschet outdoor, suprafață premium antiderapantă.",
      sportType: "BASKETBALL" as const,
      city: "Cluj-Napoca",
      address: "Bulevardul Eroilor 45",
      pricePerHour: 90,
      amenities: ["Vestiare", "Fântână de apă"],
    },
    {
      name: "Padel Club Nord",
      description: "Teren de padel acoperit, ideal pentru jocul pe orice vreme.",
      sportType: "PADEL" as const,
      city: "București",
      address: "Șos. Nordului 88",
      pricePerHour: 120,
      amenities: ["Acoperit", "Echipament inclus", "Parcare"],
    },
    {
      name: "Tenis Club Riviera",
      description: "Teren de tenis cu zgură, întreținut zilnic de personal specializat.",
      sportType: "TENNIS" as const,
      city: "Constanța",
      address: "Bd. Mamaia 210",
      pricePerHour: 80,
      amenities: ["Vestiare", "Iluminat"],
    },
    {
      name: "Volei Beach Arena",
      description: "Teren de volei pe plajă, la doi pași de mare.",
      sportType: "VOLLEYBALL" as const,
      city: "Constanța",
      address: "Faleza Nord 5",
      pricePerHour: 70,
      amenities: ["Duș exterior", "Închiriere mingi"],
    },
    {
      name: "Handbal Arena Vest",
      description: "Sală de handbal multifuncțională, potrivită și pentru futsal.",
      sportType: "HANDBALL" as const,
      city: "Timișoara",
      address: "Calea Aradului 33",
      pricePerHour: 110,
      amenities: ["Vestiare", "Tribună"],
    },
  ];

  for (const field of demoFields) {
    const existing = await prisma.field.findFirst({
      where: { name: field.name, ownerId: owner.id },
    });
    if (existing) continue;

    await prisma.field.create({
      data: {
        ...field,
        images: [],
        ownerId: owner.id,
      },
    });
  }

  console.log(`Seed complet — ${demoFields.length} terenuri demo verificate/create.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
