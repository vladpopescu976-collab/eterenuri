import { PrismaClient } from "@prisma/client";

// Deschiderea unei conexiuni noi către endpoint-ul pooled al Prisma Postgres
// costă ~7s (handshake), în timp ce interogările ulterioare durează ~50ms.
// Cu un pool prea mic, cererile paralele se blochează în coadă în spatele
// conexiunilor reci și pică cu „Timed out fetching a new connection".
// Baza permite 50 de conexiuni, deci 10 per client este sigur.
//
// Setăm parametrii în cod, nu în DATABASE_URL, pentru că pe Prisma Compute
// variabila e gestionată de platformă și nu o putem edita.
function withPoolSettings(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("connection_limit", "10");
    parsed.searchParams.set("pool_timeout", "60");
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cache-ul pe globalThis este necesar și în producție: Next.js poate evalua
// modulul de mai multe ori (context RSC vs. route handler), iar fiecare
// instanță nouă ar deschide propriul set de conexiuni reci.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: withPoolSettings(process.env.DATABASE_URL) });

globalForPrisma.prisma = prisma;
