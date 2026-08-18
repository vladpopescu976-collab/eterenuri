import { prisma } from "@/lib/prisma";

/**
 * Limitare la autentificare: fără ea, cineva poate încerca parole la nesfârșit.
 *
 * Numărăm eșecurile pe (email + IP) într-o fereastră de timp. Cheia include
 * IP-ul ca să nu poată cineva bloca un cont străin doar trimițând parole
 * greșite pentru el.
 */
const MAX_INCERCARI = 8;
const FEREASTRA_MINUTE = 15;

export type RezultatLimitare = { permis: true } | { permis: false; mesaj: string };

function cheia(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

/** IP-ul real al clientului, așa cum îl trimite Vercel. */
export function ipDinCerere(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "necunoscut";
}

export async function verificaLimitarea(email: string, ip: string): Promise<RezultatLimitare> {
  const inregistrare = await prisma.loginAttempt.findUnique({ where: { cheie: cheia(email, ip) } });
  if (!inregistrare) return { permis: true };

  const expira = new Date(inregistrare.primaEroare.getTime() + FEREASTRA_MINUTE * 60_000);
  if (expira < new Date()) return { permis: true };
  if (inregistrare.incercari < MAX_INCERCARI) return { permis: true };

  const minuteRamase = Math.max(1, Math.ceil((expira.getTime() - Date.now()) / 60_000));
  return {
    permis: false,
    mesaj: `Prea multe încercări. Încearcă din nou peste ${minuteRamase} ${
      minuteRamase === 1 ? "minut" : "minute"
    }.`,
  };
}

export async function inregistreazaEsec(email: string, ip: string): Promise<void> {
  const cheie = cheia(email, ip);
  const acum = new Date();
  const inregistrare = await prisma.loginAttempt.findUnique({ where: { cheie } });

  // După ce fereastra a trecut, numărătoarea o ia de la capăt.
  const fereastraExpirata =
    inregistrare && inregistrare.primaEroare.getTime() + FEREASTRA_MINUTE * 60_000 < acum.getTime();

  await prisma.loginAttempt.upsert({
    where: { cheie },
    create: { cheie, incercari: 1, primaEroare: acum, ultimaEroare: acum },
    update: fereastraExpirata
      ? { incercari: 1, primaEroare: acum, ultimaEroare: acum }
      : { incercari: { increment: 1 }, ultimaEroare: acum },
  });
}

export async function stergeEsecurile(email: string, ip: string): Promise<void> {
  await prisma.loginAttempt
    .delete({ where: { cheie: cheia(email, ip) } })
    .catch(() => {}); // nu exista nicio inregistrare — e in regula
}
