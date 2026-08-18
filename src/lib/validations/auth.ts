import { z } from "zod";

const email = z
  .string()
  .min(1, "Emailul este obligatoriu.")
  .email("Adresă de email invalidă.")
  // Adresele sunt case-insensitive în practică. Fără normalizare, „Ion@X.ro”
  // și „ion@x.ro” ar ajunge două conturi diferite.
  .transform((valoare) => valoare.trim().toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Parola este obligatorie."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const sportValues = [
  "FOOTBALL",
  "BASKETBALL",
  "TENNIS",
  "VOLLEYBALL",
  "HANDBALL",
  "PADEL",
  "BADMINTON",
  "OTHER",
] as const;

// Un număr de telefon românesc, scris cu sau fără spații și prefix de țară.
const telefonValid = /^(\+4)?0[237]\d{8}$/;

export const numeSchema = z
  .string()
  .trim()
  .min(2, "Numele trebuie să aibă cel puțin 2 caractere.")
  .max(100, "Numele este prea lung.");

export const parolaSchema = z
  .string()
  .min(8, "Parola trebuie să aibă cel puțin 8 caractere.")
  .max(72, "Parola este prea lungă.")
  .regex(/[a-zA-Z]/, "Parola trebuie să conțină cel puțin o literă.")
  .regex(/\d/, "Parola trebuie să conțină cel puțin o cifră.");

export const telefonSchema = z
  .string()
  .trim()
  .refine((valoare) => valoare === "" || telefonValid.test(valoare.replace(/[\s.-]/g, "")), {
    message: "Număr de telefon invalid. Exemplu: 0722 123 456.",
  });

/** Pasul 1 al formularului: cine ești și cum intri în cont. */
export const pas1Schema = z
  .object({
    name: numeSchema,
    email,
    password: parolaSchema,
    confirmPassword: z.string().min(1, "Confirmarea parolei este obligatorie."),
  })
  .refine((date) => date.password === date.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

/** Pasul 2: detaliile de profil. */
export const pas2Schema = z.object({
  role: z.enum(["PERSONAL", "BUSINESS"]),
  phone: telefonSchema,
  city: z.string().trim().max(80).optional(),
  sports: z.array(z.enum(sportValues)).max(8),
});

const campuriInregistrare = {
  name: numeSchema,
  email,
  password: parolaSchema,
  confirmPassword: z.string().min(1, "Confirmarea parolei este obligatorie."),
  role: z.enum(["PERSONAL", "BUSINESS"]),
  phone: telefonSchema.optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  sports: z.array(z.enum(sportValues)).max(8).optional().default([]),
  // Bifa de acceptare a termenilor, cerută la ultimul pas.
  acceptaTermenii: z.literal(true, {
    message: "Trebuie să accepți termenii ca să continui.",
  }),
};

/** Formularul complet, așa cum îl trimite pasul 3. */
export const registerFormSchema = z
  .object(campuriInregistrare)
  .refine((date) => date.password === date.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

export type RegisterFormInput = z.input<typeof registerFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

/** Aceleași reguli, verificate din nou pe server. */
export const registerSchema = registerFormSchema;

export type RegisterInput = z.infer<typeof registerSchema>;

export const retrimitereSchema = z.object({ email });
