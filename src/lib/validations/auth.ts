import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Emailul este obligatoriu.").email("Adresă de email invalidă."),
  password: z.string().min(1, "Parola este obligatorie."),
});

export type LoginInput = z.infer<typeof loginSchema>;

const registerBaseFields = {
  name: z
    .string()
    .min(2, "Numele trebuie să aibă cel puțin 2 caractere.")
    .max(100, "Numele este prea lung."),
  email: z.string().min(1, "Emailul este obligatoriu.").email("Adresă de email invalidă."),
  password: z
    .string()
    .min(8, "Parola trebuie să aibă cel puțin 8 caractere.")
    .max(72, "Parola este prea lungă."),
  confirmPassword: z.string().min(1, "Confirmarea parolei este obligatorie."),
  phone: z.string().optional(),
};

const passwordsMatch = <T extends { password: string; confirmPassword: string }>(data: T) =>
  data.password === data.confirmPassword;

const passwordsMatchIssue = {
  message: "Parolele nu coincid.",
  path: ["confirmPassword"],
};

// Used by the register form (role comes from the selected tab, not a form field).
export const registerFormSchema = z
  .object(registerBaseFields)
  .refine(passwordsMatch, passwordsMatchIssue);

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// Used to validate the full payload (including role) on the server.
export const registerSchema = z
  .object({ ...registerBaseFields, role: z.enum(["PERSONAL", "BUSINESS"]) })
  .refine(passwordsMatch, passwordsMatchIssue);

export type RegisterInput = z.infer<typeof registerSchema>;
