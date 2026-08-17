import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { creeazaToken } from "@/lib/api/token";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

const schema = z.object({
  name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere.").max(100),
  email: z.string().min(1, "Emailul este obligatoriu.").email("Adresă de email invalidă."),
  password: z
    .string()
    .min(8, "Parola trebuie să aibă cel puțin 8 caractere.")
    .max(72, "Parola este prea lungă."),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["PERSONAL", "BUSINESS"]),
});

export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    const existent = await prisma.user.findUnique({ where: { email: date.email } });
    if (existent) {
      return eroare("Există deja un cont cu acest email.", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: date.name,
        email: date.email,
        password: await bcrypt.hash(date.password, 10),
        phone: date.phone || null,
        role: date.role,
      },
    });

    const token = await creeazaToken({ userId: user.id, role: user.role });

    return raspuns(
      {
        token,
        utilizator: {
          id: user.id,
          nume: user.name,
          email: user.email,
          rol: user.role,
          telefon: user.phone,
        },
      },
      201
    );
  } catch (error) {
    return eroareNeasteptata("inregistrare", error);
  }
}
