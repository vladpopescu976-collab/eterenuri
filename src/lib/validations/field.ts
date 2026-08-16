import { z } from "zod";

// Aceleași reguli sunt folosite și în formular (client), și în acțiunea de
// server. Altfel formularul lăsa să treacă date pe care serverul le respingea,
// iar în producție mesajul real era ascuns de Next.
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Numărul de telefon este obligatoriu.")
  .regex(
    /^[0-9+()\s-]{7,20}$/,
    "Numărul de telefon nu pare valid. Folosește doar cifre, spații și semnele + ( ) -."
  );

// Acceptăm fie un link extern (http:// sau https://), fie o poză încărcată de
// noi, servită din bucket-ul privat prin /api/poze/…
export const imageSourceSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^https?:\/\//i.test(value) || value.startsWith("/api/poze/"),
    "Linkul unei poze trebuie să înceapă cu http:// sau https://"
  );

export const MAX_FIELD_IMAGES = 6;

export const fieldSchema = z
  .object({
    name: z.string().trim().min(2, "Numele terenului trebuie să aibă cel puțin 2 caractere."),
    sportType: z.enum([
      "FOOTBALL",
      "BASKETBALL",
      "TENNIS",
      "VOLLEYBALL",
      "HANDBALL",
      "PADEL",
      "BADMINTON",
      "OTHER",
    ]),
    city: z.string().trim().min(2, "Orașul trebuie să aibă cel puțin 2 caractere."),
    address: z.string().trim().min(2, "Adresa trebuie să aibă cel puțin 2 caractere."),
    pricePerHour: z
      .number({ message: "Prețul pe oră este obligatoriu." })
      .positive("Prețul pe oră trebuie să fie mai mare decât 0."),
    openingHour: z
      .number({ message: "Ora de deschidere este obligatorie." })
      .int("Ora de deschidere trebuie să fie un număr întreg.")
      .min(0, "Ora de deschidere trebuie să fie între 0 și 23.")
      .max(23, "Ora de deschidere trebuie să fie între 0 și 23."),
    closingHour: z
      .number({ message: "Ora de închidere este obligatorie." })
      .int("Ora de închidere trebuie să fie un număr întreg.")
      .min(1, "Ora de închidere trebuie să fie între 1 și 24.")
      .max(24, "Ora de închidere trebuie să fie între 1 și 24."),
    contactPhone: phoneSchema,
    description: z.string().trim().max(600, "Descrierea nu poate depăși 600 de caractere.").optional(),
    amenities: z
      .array(z.string().trim().min(1))
      .max(20, "Poți adăuga maximum 20 de facilități.")
      .optional(),
    images: z
      .array(imageSourceSchema)
      .max(MAX_FIELD_IMAGES, `Poți adăuga maximum ${MAX_FIELD_IMAGES} poze.`)
      .optional(),
  })
  .refine((data) => data.closingHour > data.openingHour, {
    message: "Ora de închidere trebuie să fie după ora de deschidere.",
    path: ["closingHour"],
  });

export type FieldInput = z.infer<typeof fieldSchema>;

export const fieldUpdateSchema = z
  .object({
    fieldId: z.string().min(1),
    pricePerHour: z
      .number({ message: "Prețul pe oră este obligatoriu." })
      .positive("Prețul pe oră trebuie să fie mai mare decât 0."),
    openingHour: z
      .number()
      .int()
      .min(0, "Ora de deschidere trebuie să fie între 0 și 23.")
      .max(23, "Ora de deschidere trebuie să fie între 0 și 23."),
    closingHour: z
      .number()
      .int()
      .min(1, "Ora de închidere trebuie să fie între 1 și 24.")
      .max(24, "Ora de închidere trebuie să fie între 1 și 24."),
    isActive: z.boolean(),
    contactPhone: phoneSchema,
  })
  .refine((data) => data.closingHour > data.openingHour, {
    message: "Ora de închidere trebuie să fie după ora de deschidere.",
    path: ["closingHour"],
  });

export type FieldUpdateInput = z.infer<typeof fieldUpdateSchema>;
