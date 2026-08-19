import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

import { AuthChooser } from "@/components/auth/auth-chooser";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Autentificare — Scorer",
};

function parseRole(value: string | undefined): Role | null {
  if (value === "personal") return "PERSONAL";
  if (value === "business") return "BUSINESS";
  return null;
}

export default async function AutentificarePage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string; mod?: string; error?: string; code?: string }>;
}) {
  const { tip, mod, error, code } = await searchParams;

  // Cand autentificarea esueaza, NextAuth ne trimite inapoi pe pagina de login
  // cu ?error=..., dar fara ?tip=. Fara linia urmatoare am arata alegerea de
  // rol si mesajul de eroare nu s-ar mai vedea nicaieri. Formularul lasa
  // ultimul tip ales intr-un cookie tocmai pentru cazul asta.
  const dinCookie = error ? (await cookies()).get("scorer_tip")?.value : undefined;
  const role = parseRole(tip) ?? parseRole(dinCookie);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      {role ? (
        <AuthPanel
          role={role}
          initialMode={mod === "inregistrare" ? "register" : "login"}
          error={error}
          code={code}
        />
      ) : (
        <AuthChooser />
      )}
    </div>
  );
}
