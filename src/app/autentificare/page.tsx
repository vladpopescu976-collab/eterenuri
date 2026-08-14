import type { Metadata } from "next";
import type { Role } from "@prisma/client";

import { AuthChooser } from "@/components/auth/auth-chooser";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Autentificare — Eterenuri",
};

function parseRole(value: string | undefined): Role | null {
  if (value === "personal") return "PERSONAL";
  if (value === "business") return "BUSINESS";
  return null;
}

export default async function AutentificarePage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string; mod?: string }>;
}) {
  const { tip, mod } = await searchParams;
  const role = parseRole(tip);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      {role ? (
        <AuthPanel role={role} initialMode={mod === "inregistrare" ? "register" : "login"} />
      ) : (
        <AuthChooser />
      )}
    </div>
  );
}
