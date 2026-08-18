import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { creeazaToken } from "@/lib/api/token";
import { eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { inregistreazaEsec, ipDinCerere, stergeEsecurile, verificaLimitarea } from "@/lib/limitare";

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
    const ip = ipDinCerere(request);

    const limitare = await verificaLimitarea(date.email, ip);
    if (!limitare.permis) return eroare(limitare.mesaj, 429);

    const user = await prisma.user.findUnique({ where: { email: date.email } });
    // Același mesaj pentru email inexistent și parolă greșită, ca să nu se poată
    // afla care adrese au cont.
    if (!user || !(await bcrypt.compare(date.password, user.password))) {
      await inregistreazaEsec(date.email, ip);
      return eroare("Email sau parolă incorectă.", 401);
    }
    if (!user.emailVerified) {
      return eroare(
        "Contul nu este confirmat. Deschide emailul primit la înregistrare și apasă linkul de confirmare.",
        403
      );
    }
    if (date.role && user.role !== date.role) {
      return eroare(
        date.role === "PERSONAL"
          ? "Acest email are un cont Business. Alege „Business” la autentificare."
          : "Acest email are un cont Personal. Alege „Personal” la autentificare.",
        401
      );
    }

    await stergeEsecurile(date.email, ip);
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
