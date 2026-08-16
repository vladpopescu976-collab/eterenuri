import { redirect } from "next/navigation";

import { auth } from "@/auth";

// Redirecționare făcută pe server, unde sesiunea e citită din cookie și e
// mereu actuală. Pe client, `getSession()` chemat imediat după `signIn()`
// poate returna încă sesiunea veche (cookie-ul nu s-a propagat), ceea ce
// trimitea conturile Business pe pagina publică.
export const dynamic = "force-dynamic";

export default async function DupaAutentificarePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/autentificare");
  }

  redirect(session.user.role === "BUSINESS" ? "/dashboard/business" : "/");
}
