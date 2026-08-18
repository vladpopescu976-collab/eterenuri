import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { trimiteEmail, urlAplicatie, type RezultatEmail } from "@/lib/email";

const VALABIL_ORE = 24;

/** Linkul conține tokenul în clar; în baza de date ținem doar amprenta lui. */
function amprenta(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Un singur link valabil per cont: la fiecare cerere nouă le ștergem pe cele
 * vechi, ca un link scăpat dintr-un email mai vechi să nu mai funcționeze.
 */
async function creeazaToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: amprenta(token),
        expires: new Date(Date.now() + VALABIL_ORE * 60 * 60 * 1000),
      },
    }),
  ]);

  return token;
}

function sablon(nume: string, link: string) {
  const html = `<!doctype html>
<html lang="ro">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#16a34a;font-weight:600">Eterenuri</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Confirmă-ți adresa de email</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Bună, ${nume}!</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6">
          Mai e un singur pas până îți poți folosi contul. Apasă butonul de mai jos ca să confirmi că adresa aceasta îți aparține.
        </p>
        <p style="margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">Confirmă contul</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
          Dacă butonul nu funcționează, copiază linkul acesta în browser:
        </p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#16a34a">${link}</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px" />
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
          Linkul este valabil ${VALABIL_ORE} de ore. Dacă nu tu ai cerut acest cont, poți ignora mesajul — fără confirmare, contul nu poate fi folosit.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bună, ${nume}!

Confirmă-ți adresa de email ca să îți poți folosi contul Eterenuri:
${link}

Linkul este valabil ${VALABIL_ORE} de ore. Dacă nu tu ai cerut acest cont, ignoră mesajul.`;

  return { html, text };
}

/** Creează un link nou și îl trimite pe email. */
export async function trimiteConfirmarea(user: {
  id: string;
  name: string;
  email: string;
}): Promise<RezultatEmail> {
  const token = await creeazaToken(user.id);
  const link = `${urlAplicatie()}/confirma-email?token=${token}`;
  const { html, text } = sablon(user.name, link);

  return trimiteEmail({
    catre: user.email,
    subiect: "Confirmă-ți contul Eterenuri",
    html,
    text,
  });
}

export type RezultatConfirmare =
  | { stare: "confirmat"; email: string; rol: "PERSONAL" | "BUSINESS" }
  | { stare: "deja-confirmat"; email: string; rol: "PERSONAL" | "BUSINESS" }
  | { stare: "expirat" }
  | { stare: "invalid" };

/** Validează tokenul din link și marchează contul drept confirmat. */
export async function confirmaToken(token: string): Promise<RezultatConfirmare> {
  const curat = token.trim();
  if (!curat) return { stare: "invalid" };

  const inregistrare = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: amprenta(curat) },
    include: { user: { select: { id: true, email: true, role: true, emailVerified: true } } },
  });

  if (!inregistrare) return { stare: "invalid" };

  const { user } = inregistrare;

  if (inregistrare.expires < new Date()) {
    // Îl ștergem oricum: un token expirat nu mai are de ce să stea în baza de date.
    await prisma.emailVerificationToken.delete({ where: { id: inregistrare.id } });
    return user.emailVerified
      ? { stare: "deja-confirmat", email: user.email, rol: user.role }
      : { stare: "expirat" };
  }

  // Al doilea clic pe același link (sau prefetch-ul unui client de email) nu
  // trebuie să pară o eroare.
  if (user.emailVerified) {
    await prisma.emailVerificationToken.delete({ where: { id: inregistrare.id } });
    return { stare: "deja-confirmat", email: user.email, rol: user.role };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
  ]);

  return { stare: "confirmat", email: user.email, rol: user.role };
}

/**
 * Retrimite linkul. Răspunsul este intenționat același pentru orice adresă,
 * ca pagina să nu poată fi folosită ca să se afle ce emailuri au cont.
 */
export async function retrimiteConfirmarea(email: string): Promise<RezultatEmail> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user || user.emailVerified) return { trimis: true };

  return trimiteConfirmarea(user);
}
