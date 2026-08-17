import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { creeazaToken } from "@/lib/api/token";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";

export const maxDuration = 60;

const schema = z.object({
  email: z.string().min(1, "Emailul este obligatoriu.").email("Adresă de email invalidă."),
  password: z.string().min(1, "Parola este obligatorie."),
  // Trimis de ecranul de login, ca să nu intri pe alt tip de cont decât cel ales.
  role: z.enum(["PERSONAL", "BUSINESS"]).optional(),
});

export async function POST(request: Request) {
  try {
    const date = schema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { email: date.email } });
    // Același mesaj pentru email inexistent și parolă greșită, ca să nu se poată
    // afla care adrese au cont.
    if (!user || !(await bcrypt.compare(date.password, user.password))) {
      return eroare("Email sau parolă incorectă.", 401);
    }
    if (date.role && user.role !== date.role) {
      return eroare(
        date.role === "PERSONAL"
          ? "Acest email are un cont Business. Alege „Business” la autentificare."
          : "Acest email are un cont Personal. Alege „Personal” la autentificare.",
        401
      );
    }

    const token = await creeazaToken({ userId: user.id, role: user.role });

    return raspuns({
      token,
      utilizator: {
        id: user.id,
        nume: user.name,
        email: user.email,
        rol: user.role,
        telefon: user.phone,
      },
    });
  } catch (error) {
    return eroareNeasteptata("autentificare", error);
  }
}
