import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { citesteToken, type TokenPayload } from "@/lib/api/token";

/** Toate rutele întorc aceeași formă, ca aplicația nativă să aibă un singur caz de tratat. */
export function raspuns<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function eroare(mesaj: string, status = 400) {
  return NextResponse.json({ ok: false, error: mesaj }, { status });
}

export function eroareNeasteptata(context: string, error: unknown) {
  if (error instanceof z.ZodError) {
    return eroare(error.issues[0]?.message ?? "Date invalide.", 422);
  }
  console.error(`[api:${context}]`, error);
  return eroare("A apărut o eroare. Încearcă din nou.", 500);
}

/** Citește `Authorization: Bearer …`. Întoarce null dacă lipsește sau e invalid. */
export async function sesiuneDinCerere(request: Request): Promise<TokenPayload | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return citesteToken(header.slice(7).trim());
}

// Uniunea e scrisă explicit ca TypeScript să știe că `sesiune` există sigur
// atunci când `eroare` e null.
type Acces =
  | { eroare: NextResponse; sesiune: null }
  | { eroare: null; sesiune: TokenPayload };

export async function cereAutentificare(request: Request): Promise<Acces> {
  const sesiune = await sesiuneDinCerere(request);
  if (!sesiune) return { eroare: eroare("Autentificare necesară.", 401), sesiune: null };

  // Contul poate fi șters între timp, iar tokenul ar rămâne valid până expiră.
  const exista = await prisma.user.findUnique({
    where: { id: sesiune.userId },
    select: { id: true },
  });
  if (!exista) return { eroare: eroare("Contul nu mai există.", 401), sesiune: null };

  return { eroare: null, sesiune };
}

export async function cereBusiness(request: Request): Promise<Acces> {
  const rezultat = await cereAutentificare(request);
  if (rezultat.eroare) return rezultat;
  if (rezultat.sesiune.role !== "BUSINESS") {
    return { eroare: eroare("Este nevoie de un cont Business.", 403), sesiune: null };
  }
  return rezultat;
}

export async function cerePersonal(request: Request): Promise<Acces> {
  const rezultat = await cereAutentificare(request);
  if (rezultat.eroare) return rezultat;
  if (rezultat.sesiune.role !== "PERSONAL") {
    return { eroare: eroare("Este nevoie de un cont Personal.", 403), sesiune: null };
  }
  return rezultat;
}
