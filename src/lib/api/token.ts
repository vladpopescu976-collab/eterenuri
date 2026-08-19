import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

// De ce un token separat de NextAuth:
// Sesiunea din web e un cookie httpOnly cu flux CSRF, gândit pentru browser.
// O aplicație nativă are nevoie de ceva ce poate trimite singură în header, așa
// că folosim un JWT semnat cu același secret, trimis ca `Authorization: Bearer`.

const ISSUER = "scorer";
const AUDIENCE = "scorer-mobil";
const DURATA = "30d";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET lipsește.");
  return new TextEncoder().encode(value);
}

export type TokenPayload = { userId: string; role: Role };

export async function creeazaToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(DURATA)
    .sign(secret());
}

export async function citesteToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || (payload.role !== "PERSONAL" && payload.role !== "BUSINESS")) {
      return null;
    }
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
