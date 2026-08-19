import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { trimiteEmail, urlAplicatie, type RezultatEmail } from "@/lib/email";
import { sablon } from "@/lib/emailuri/sablon";

// Mai scurt decât confirmarea contului: un link care schimbă parola nu are de
// ce să rămână valabil o zi întreagă.
const VALABIL_MINUTE = 60;

function amprenta(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Trimite linkul de resetare.
 *
 * Nu spune niciodată dacă adresa are cont: altfel pagina ar deveni un mod de a
 * afla cine e înscris. Apelantul primește același răspuns în ambele cazuri.
 */
export async function cereResetarea(email: string): Promise<RezultatEmail> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { trimis: true };

  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([
    // Un singur link activ: dacă ai cerut de două ori, merge doar ultimul.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: amprenta(token),
        expires: new Date(Date.now() + VALABIL_MINUTE * 60 * 1000),
      },
    }),
  ]);

  const link = `${urlAplicatie()}/parola-noua?token=${token}`;
  const { html, text } = sablon({
    titlu: "Ți-ai uitat parola?",
    salut: user.name,
    paragrafe: [
      "Am primit o cerere de schimbare a parolei pentru contul tău. Apasă butonul de mai jos ca să îți alegi una nouă.",
    ],
    actiune: { text: "Alege o parolă nouă", link },
    incheiere: `Linkul este valabil ${VALABIL_MINUTE} de minute și poate fi folosit o singură dată. Dacă nu tu ai cerut schimbarea, ignoră mesajul — parola rămâne cea veche.`,
  });

  return trimiteEmail({ catre: user.email, subiect: "Schimbarea parolei — Scorer", html, text });
}

export type RezultatResetare =
  | { stare: "reusit"; email: string }
  | { stare: "expirat" }
  | { stare: "invalid" };

/** Verifică tokenul din link și pune parola nouă. */
export async function schimbaParola(token: string, parolaNoua: string): Promise<RezultatResetare> {
  const curat = token.trim();
  if (!curat) return { stare: "invalid" };

  const inregistrare = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: amprenta(curat) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!inregistrare) return { stare: "invalid" };

  if (inregistrare.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: inregistrare.id } });
    return { stare: "expirat" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: inregistrare.user.id },
      data: {
        password: await bcrypt.hash(parolaNoua, 12),
        // Cine ajunge la email dovedește că adresa e a lui, deci contul poate
        // fi considerat confirmat chiar dacă nu apucase să apese linkul acela.
        emailVerified: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: inregistrare.user.id } }),
    // Parola s-a schimbat: încercările eșuate de până acum nu mai au rost să
    // țină contul blocat.
    prisma.loginAttempt.deleteMany({ where: { cheie: { startsWith: `${inregistrare.user.email}|` } } }),
  ]);

  return { stare: "reusit", email: inregistrare.user.email };
}

/** Doar verifică dacă linkul mai e bun, ca pagina să nu arate un formular inutil. */
export async function tokenulEsteValabil(token: string): Promise<boolean> {
  const curat = token.trim();
  if (!curat) return false;
  const inregistrare = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: amprenta(curat) },
    select: { expires: true },
  });
  return Boolean(inregistrare && inregistrare.expires > new Date());
}
