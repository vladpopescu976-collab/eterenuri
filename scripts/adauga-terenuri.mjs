/**
 * Populează contul Sport Arena cu terenuri: 20 de fotbal în Cluj-Napoca,
 * Oradea și Arad, plus 5-6 pentru fiecare celălalt sport.
 *
 * Rulare: node -r dotenv/config scripts/adauga-terenuri.mjs dotenv_config_path=.env
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL_PROPRIETAR = "contact@sportarena.ro";

/** Aceeași cheie ca în src/lib/orase.ts: fără diacritice, litere mici. */
function cheieOras(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[şŞ]/g, "s")
    .replace(/[ţŢ]/g, "t")
    .toLowerCase()
    .replace(/[\s\-']+/g, " ")
    .trim();
}

const STRAZI = [
  "Str. Sportivilor", "Bd. Muncii", "Str. Aleea Stadionului", "Str. Parcului",
  "Bd. 21 Decembrie", "Str. Someșului", "Str. Republicii", "Aleea Tineretului",
  "Str. Crișului", "Bd. Dacia", "Str. Oașului", "Str. Podgoria",
];

const TELEFON = "0356 100 200";

function adresa(i) {
  return `${STRAZI[i % STRAZI.length]} ${((i * 7) % 90) + 3}`;
}

/** Terenurile de fotbal: 20, împărțite în trei orașe. */
const FOTBAL = [
  // Cluj-Napoca
  ["Arena Gruia", "Cluj-Napoca", 220, ["Nocturnă", "Vestiare", "Dușuri", "Parcare"], 8, 23],
  ["Terenul Mănăștur", "Cluj-Napoca", 160, ["Nocturnă", "Vestiare", "Parcare"], 8, 23],
  ["Baza Sportivă Zorilor", "Cluj-Napoca", 180, ["Vestiare", "Dușuri", "Parcare"], 9, 22],
  ["Sala Fotbal Mărăști", "Cluj-Napoca", 200, ["Acoperit", "Vestiare", "Dușuri"], 8, 23],
  ["Someș Arena", "Cluj-Napoca", 170, ["Nocturnă", "Vestiare"], 9, 23],
  ["Terenul Grigorescu", "Cluj-Napoca", 140, ["Nocturnă", "Vestiare"], 9, 22],
  ["Complex Iris", "Cluj-Napoca", 190, ["Nocturnă", "Vestiare", "Dușuri", "Parcare"], 8, 23],
  ["Mini Fotbal Dâmbul Rotund", "Cluj-Napoca", 130, ["Nocturnă", "Vestiare"], 9, 22],
  // Oradea
  ["Arena Rogerius", "Oradea", 175, ["Nocturnă", "Vestiare", "Dușuri", "Parcare"], 8, 23],
  ["Baza Crișul", "Oradea", 150, ["Nocturnă", "Vestiare", "Parcare"], 8, 22],
  ["Terenul Nufărul", "Oradea", 140, ["Nocturnă", "Vestiare"], 9, 22],
  ["Complex Ioșia", "Oradea", 165, ["Vestiare", "Dușuri", "Parcare"], 9, 23],
  ["Sala Fotbal Velența", "Oradea", 185, ["Acoperit", "Vestiare", "Dușuri"], 8, 23],
  ["Arena Olosig", "Oradea", 155, ["Nocturnă", "Vestiare", "Parcare"], 9, 22],
  ["Mini Fotbal Podgoria", "Oradea", 125, ["Nocturnă", "Vestiare"], 9, 22],
  // Arad
  ["Arena UTA", "Arad", 210, ["Nocturnă", "Vestiare", "Dușuri", "Parcare"], 8, 23],
  ["Baza Sportivă Aurel Vlaicu", "Arad", 160, ["Nocturnă", "Vestiare", "Parcare"], 8, 23],
  ["Terenul Micălaca", "Arad", 135, ["Nocturnă", "Vestiare"], 9, 22],
  ["Complex Gai", "Arad", 150, ["Vestiare", "Dușuri", "Parcare"], 9, 22],
  ["Sala Fotbal Alfa", "Arad", 180, ["Acoperit", "Vestiare", "Dușuri"], 8, 23],
];

/** Restul sporturilor: câte 5-6, împrăștiate prin țară. */
const ALTE_SPORTURI = {
  BASKETBALL: [
    ["Sala Baschet Central", "Cluj-Napoca", 120, ["Acoperit", "Vestiare", "Dușuri"], 8, 22],
    ["Arena Baschet Rogerius", "Oradea", 110, ["Acoperit", "Vestiare"], 9, 22],
    ["Sala Polivalentă Arad", "Arad", 130, ["Acoperit", "Vestiare", "Dușuri", "Parcare"], 8, 22],
    ["Baschet Club Timișoara", "Timișoara", 105, ["Acoperit", "Vestiare"], 9, 22],
    ["Sala Sporturilor Sibiu", "Sibiu", 100, ["Acoperit", "Vestiare", "Parcare"], 9, 22],
    ["Streetball Iulius", "Cluj-Napoca", 85, ["Nocturnă", "Parcare"], 8, 23],
  ],
  TENNIS: [
    ["Tenis Club Someș", "Cluj-Napoca", 90, ["Vestiare", "Dușuri", "Parcare"], 7, 22],
    ["Arena Tenis Crișul", "Oradea", 80, ["Vestiare", "Nocturnă"], 7, 22],
    ["Tenis Arad Center", "Arad", 85, ["Vestiare", "Dușuri"], 8, 22],
    ["Tenis Club Bega", "Timișoara", 95, ["Vestiare", "Dușuri", "Parcare"], 7, 22],
    ["Zgură Club Brașov", "Brașov", 100, ["Vestiare", "Nocturnă", "Parcare"], 8, 22],
    ["Tenis Indoor Sibiu", "Sibiu", 110, ["Acoperit", "Vestiare", "Dușuri"], 8, 23],
  ],
  VOLLEYBALL: [
    ["Sala Volei Central", "Cluj-Napoca", 100, ["Acoperit", "Vestiare", "Dușuri"], 9, 22],
    ["Volei Arena Oradea", "Oradea", 90, ["Acoperit", "Vestiare"], 9, 22],
    ["Beach Volei Arad", "Arad", 75, ["Nocturnă", "Vestiare", "Parcare"], 9, 22],
    ["Volei Club Timișoara", "Timișoara", 95, ["Acoperit", "Vestiare"], 9, 22],
    ["Beach Volei Mamaia", "Constanța", 85, ["Nocturnă", "Vestiare", "Parcare"], 8, 22],
  ],
  HANDBALL: [
    ["Sala Handbal Horia", "Cluj-Napoca", 130, ["Acoperit", "Vestiare", "Dușuri"], 9, 22],
    ["Arena Handbal Oradea", "Oradea", 120, ["Acoperit", "Vestiare", "Parcare"], 9, 22],
    ["Sala Handbal Arad", "Arad", 115, ["Acoperit", "Vestiare"], 9, 22],
    ["Handbal Club Timișoara", "Timișoara", 125, ["Acoperit", "Vestiare", "Dușuri"], 9, 22],
    ["Sala Sporturilor Baia Mare", "Baia Mare", 140, ["Acoperit", "Vestiare", "Dușuri", "Parcare"], 8, 22],
  ],
  PADEL: [
    ["Padel Club Cluj", "Cluj-Napoca", 150, ["Acoperit", "Vestiare", "Dușuri", "Parcare"], 7, 23],
    ["Padel Arena Oradea", "Oradea", 130, ["Acoperit", "Vestiare"], 8, 23],
    ["Padel Point Arad", "Arad", 125, ["Nocturnă", "Vestiare", "Parcare"], 8, 22],
    ["Padel Bega Timișoara", "Timișoara", 140, ["Acoperit", "Vestiare", "Dușuri"], 7, 23],
    ["Padel House București", "București", 180, ["Acoperit", "Vestiare", "Dușuri", "Parcare"], 7, 23],
    ["Padel Club Brașov", "Brașov", 145, ["Acoperit", "Vestiare"], 8, 22],
  ],
  BADMINTON: [
    ["Badminton Club Cluj", "Cluj-Napoca", 70, ["Acoperit", "Vestiare"], 9, 22],
    ["Sala Badminton Oradea", "Oradea", 60, ["Acoperit", "Vestiare"], 9, 22],
    ["Badminton Arena Arad", "Arad", 65, ["Acoperit", "Vestiare", "Parcare"], 9, 22],
    ["Badminton Timișoara", "Timișoara", 70, ["Acoperit", "Vestiare", "Dușuri"], 9, 22],
    ["Badminton Center Sibiu", "Sibiu", 65, ["Acoperit", "Vestiare"], 9, 22],
  ],
  OTHER: [
    ["Sala Multisport Cluj", "Cluj-Napoca", 110, ["Acoperit", "Vestiare", "Dușuri", "Parcare"], 8, 23],
    ["Complex Multisport Oradea", "Oradea", 95, ["Acoperit", "Vestiare"], 8, 22],
    ["Arena Polivalentă Arad", "Arad", 105, ["Acoperit", "Vestiare", "Parcare"], 8, 22],
    ["Centrul Sportiv Bega", "Timișoara", 100, ["Acoperit", "Vestiare", "Dușuri"], 8, 23],
    ["Sala Multisport Sibiu", "Sibiu", 90, ["Acoperit", "Vestiare"], 9, 22],
  ],
};

const DESCRIERI = {
  FOOTBALL: "Gazon sintetic de ultimă generație, marcaje proaspete și nocturnă puternică. Potrivit pentru meciuri 5v5 și 7v7.",
  BASKETBALL: "Suprafață din parchet sportiv, coșuri reglabile și tribună mică pentru spectatori.",
  TENNIS: "Suprafață bine întreținută, plasă nouă și bănci la umbră. Rachete de închiriat la recepție.",
  VOLLEYBALL: "Fileu reglabil, suprafață antiderapantă și marcaje clare pentru competiții.",
  HANDBALL: "Sală omologată, porți fixe și podea cu aderență bună. Vestiare spațioase.",
  PADEL: "Pereți de sticlă, iluminare uniformă și suprafață profesională. Rachete disponibile la fața locului.",
  BADMINTON: "Sală fără curenți de aer, iluminare de sus și fileuri reglabile pe înălțime.",
  OTHER: "Spațiu polivalent, potrivit pentru mai multe sporturi. Se poate configura la cerere.",
};

async function main() {
  const proprietar = await prisma.user.findUnique({ where: { email: EMAIL_PROPRIETAR } });
  if (!proprietar) throw new Error(`Nu există contul ${EMAIL_PROPRIETAR}.`);
  if (proprietar.role !== "BUSINESS") throw new Error("Contul nu este de tip Business.");

  const existente = new Set(
    (await prisma.field.findMany({ where: { ownerId: proprietar.id }, select: { name: true } }))
      .map((f) => f.name.toLowerCase())
  );

  const deAdaugat = [
    ...FOTBAL.map((t) => ["FOOTBALL", ...t]),
    ...Object.entries(ALTE_SPORTURI).flatMap(([sport, lista]) =>
      lista.map((t) => [sport, ...t])
    ),
  ];

  let adaugate = 0;
  let sarite = 0;

  for (const [index, [sport, nume, oras, pret, facilitati, deschidere, inchidere]] of deAdaugat.entries()) {
    if (existente.has(nume.toLowerCase())) {
      sarite++;
      continue;
    }
    await prisma.field.create({
      data: {
        ownerId: proprietar.id,
        name: nume,
        sportType: sport,
        city: oras,
        cityKey: cheieOras(oras),
        address: adresa(index),
        pricePerHour: pret,
        openingHour: deschidere,
        closingHour: inchidere,
        contactPhone: TELEFON,
        description: DESCRIERI[sport],
        amenities: facilitati,
        images: [],
        isActive: true,
      },
    });
    adaugate++;
  }

  console.log(`Adăugate: ${adaugate} | sărite (existau deja): ${sarite}`);

  const peSport = await prisma.field.groupBy({
    by: ["sportType"],
    where: { ownerId: proprietar.id },
    _count: { _all: true },
  });
  console.log("\nPe sport:");
  peSport
    .sort((a, b) => b._count._all - a._count._all)
    .forEach((g) => console.log(`  ${g.sportType.padEnd(11)} ${g._count._all}`));

  const peOras = await prisma.field.groupBy({
    by: ["city"],
    where: { ownerId: proprietar.id },
    _count: { _all: true },
  });
  console.log("\nPe oraș:");
  peOras
    .sort((a, b) => b._count._all - a._count._all)
    .forEach((g) => console.log(`  ${g.city.padEnd(14)} ${g._count._all}`));
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
