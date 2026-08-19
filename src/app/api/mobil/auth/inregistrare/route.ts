import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { trimiteConfirmarea } from "@/lib/verificare-email";
import { normalizeazaOras } from "@/lib/orase";
import {
  intervalValues,
  nivelValues,
  numeSchema,
  parolaSchema,
  sportValues,
  telefonSchema,
} from "@/lib/validations/auth";

export const maxDuration = 60;

const schema = z
  .object({
  name: numeSchema,
  email: z
    .string()
    .min(1, "Emailul este obligatoriu.")
    .email("Adresă de email invalidă.")
    .transform((valoare) => valoare.trim().toLowerCase()),
  password: parolaSchema,
  phone: telefonSchema.optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  sports: z.array(z.enum(sportValues)).max(8).optional().default([]),
  role: z.enum(["PERSONAL", "BUSINESS"]),

  birthDate: z.string().trim().optional().default(""),
  skillLevel: z.enum(nivelValues).optional(),
  preferredTimes: z.array(z.enum(intervalValues)).max(5).optional().default([]),

  companyName: z.string().trim().max(120).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),

  marketingOptIn: z.boolean().optional().default(false),
  })
  // Aceleași reguli ca pe web: fără telefon, proprietarul și clientul nu se
  // pot găsi când apare o schimbare la rezervare.
  .superRefine((date, context) => {
    if (date.phone.trim() === "") {
      context.addIssue({ code: "custom", path: ["phone"], message: "Numărul de telefon este obligatoriu." });
    }
    if (date.city.trim().length < 2) {
      context.addIssue({ code: "custom", path: ["city"], message: "Orașul este obligatoriu." });
    }
    if (date.role !== "BUSINESS") return;
    if (date.companyName.trim().length < 2) {
      context.addIssue({ code: "custom", path: ["companyName"], message: "Denumirea firmei este obligatorie." });
    }
  });

export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    const existent = await prisma.user.findUnique({
      where: { email: date.email },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (existent) {
      // Neconfirmat inseamna, cel mai probabil, o inregistrare intrerupta.
      if (!existent.emailVerified) {
        const stare = await trimiteConfirmarea(existent);
        return raspuns({ email: existent.email, emailTrimis: stare.trimis });
      }
      return eroare("Există deja un cont cu acest email.", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: date.name,
        email: date.email,
        password: await bcrypt.hash(date.password, 10),
        phone: date.phone || null,
        city: date.city ? normalizeazaOras(date.city) : null,
        sports: date.sports,
        role: date.role,
        // Fiecare tip de cont pastreaza doar ce l-am intrebat.
        ...(date.role === "BUSINESS"
          ? {
              companyName: date.companyName || null,
              website: date.website || null,
            }
          : {
              birthDate: date.birthDate ? new Date(`${date.birthDate}T00:00:00Z`) : null,
              skillLevel: date.skillLevel ?? null,
              preferredTimes: date.preferredTimes,
            }),
        acceptedTermsAt: new Date(),
        marketingOptIn: date.marketingOptIn,
      },
    });

    // Contul nu primeste token de acces: intai trebuie confirmata adresa.
    const stare = await trimiteConfirmarea(user);

    return raspuns({ email: user.email, emailTrimis: stare.trimis }, 201);
  } catch (error) {
    return eroareNeasteptata("inregistrare", error);
  }
}
