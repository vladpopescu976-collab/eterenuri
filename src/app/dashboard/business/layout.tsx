import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export default async function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/autentificare?tip=business");
  }
  if (session.user.role !== "BUSINESS") {
    redirect("/");
  }

  const pendingCount = await prisma.booking.count({
    where: { status: "PENDING", field: { ownerId: session.user.id } },
  });

  return (
    <DashboardShell userName={session.user.name ?? ""} pendingCount={pendingCount}>
      {children}
    </DashboardShell>
  );
}
