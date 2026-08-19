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

export const nivelValues = ["INCEPATOR", "MEDIU", "AVANSAT", "COMPETITIV"] as const;
export const intervalValues = [
  "DIMINEATA",
  "PRANZ",
  "DUPA_AMIAZA",
  "SEARA",
  "WEEKEND",
] as const;

// Sub 16 ani nu se poate consimți valabil la prelucrarea datelor în România,
// deci nu se poate deschide cont.
const VARSTA_MINIMA = 16;

export const dataNasteriiSchema = z
  .string()
  .trim()
  .refine((valoare) => valoare === "" || /^\d{4}-\d{2}-\d{2}$/.test(valoare), {
    message: "Data nașterii nu este validă.",
  })
  .refine(
    (valoare) => {
      if (valoare === "") return true;
      const data = new Date(`${valoare}T00:00:00Z`);
      if (Number.isNaN(data.getTime())) return false;
      const limita = new Date();
      limita.setUTCFullYear(limita.getUTCFullYear() - VARSTA_MINIMA);
      return data <= limita;
    },
    { message: `Trebuie să ai cel puțin ${VARSTA_MINIMA} ani ca să îți faci cont.` }
  );

export const siteSchema = z
  .string()
  .trim()
  .refine(
    (valoare) => valoare === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(valoare),
    "Adresa site-ului nu pare validă. Exemplu: terenulmeu.ro"
  );

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
  // Telefonul e obligatoriu: rezervările se rezolvă la telefon când apare ceva
  // neprevăzut, iar fără el proprietarul și clientul nu se pot găsi.
  phone: telefonSchema.refine((valoare) => valoare !== "", "Numărul de telefon este obligatoriu."),
  city: z.string().trim().min(2, "Alege orașul.").max(80),

  // Doar pentru conturile Personal.
  birthDate: dataNasteriiSchema.optional().default(""),
  skillLevel: z.enum(nivelValues).optional(),
  preferredTimes: z.array(z.enum(intervalValues)).max(5).optional().default([]),
  sports: z.array(z.enum(sportValues)).max(8).optional().default([]),

  // Doar pentru conturile Business. Datele de facturare nu se cer la
  // înregistrare: contul trebuie să se poată deschide repede, iar ele sunt
  // necesare abia când se ajunge la facturi.
  companyName: z.string().trim().max(120).optional().default(""),
  website: siteSchema.optional().default(""),

  // Bifa de acceptare a termenilor, cerută la ultimul pas.
  acceptaTermenii: z.literal(true, {
    message: "Trebuie să accepți termenii ca să continui.",
  }),
  marketingOptIn: z.boolean().optional().default(false),
};

/** Formularul complet, așa cum îl trimite ultimul pas. */
export const registerFormSchema = z
  .object(campuriInregistrare)
  .refine((date) => date.password === date.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  })
  // Denumirea firmei e cerută doar de la conturile Business; verificarea nu
  // poate sta pe câmp, fiindcă depinde de tipul de cont ales la primul pas.
  .superRefine((date, context) => {
    if (date.role !== "BUSINESS") return;

    if (date.companyName.trim().length < 2) {
      context.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Denumirea firmei este obligatorie.",
      });
    }
  });

export type RegisterFormInput = z.input<typeof registerFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

/** Aceleași reguli, verificate din nou pe server. */
export const registerSchema = registerFormSchema;

export type RegisterInput = z.infer<typeof registerSchema>;

export const retrimitereSchema = z.object({ email });
