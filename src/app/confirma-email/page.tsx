import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, MailX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RetrimiteConfirmarea } from "@/components/auth/retrimite-confirmarea";
import { confirmaToken } from "@/lib/verificare-email";

export const metadata: Metadata = {
  title: "Confirmare cont — Scorer",
};

// Tokenul se citeste si se sterge din baza de date la fiecare deschidere.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ConfirmaEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const rezultat = await confirmaToken(token ?? "");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        {rezultat.stare === "confirmat" || rezultat.stare === "deja-confirmat" ? (
          <>
            <CardHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle>
                {rezultat.stare === "confirmat" ? "Contul tău este activ" : "Contul era deja confirmat"}
              </CardTitle>
              <CardDescription>
                Adresa <span className="font-medium text-foreground">{rezultat.email}</span> a fost
                confirmată. Te poți autentifica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                nativeButton={false}
                render={
                  <Link
                    href={`/autentificare?tip=${rezultat.rol === "BUSINESS" ? "business" : "personal"}`}
                  />
                }
              >
                Mergi la autentificare
              </Button>
            </CardContent>
          </>
        ) : rezultat.stare === "expirat" ? (
          <>
            <CardHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <CardTitle>Linkul a expirat</CardTitle>
              <CardDescription>
                Linkurile de confirmare sunt valabile 24 de ore. Îți trimitem unul nou.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RetrimiteConfirmarea />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <MailX className="h-6 w-6" />
              </div>
              <CardTitle>Link invalid</CardTitle>
              <CardDescription>
                Linkul este incomplet sau a fost deja folosit. Dacă ți-ai confirmat deja contul,
                poți intra direct în cont.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/autentificare" />}
              >
                Mergi la autentificare
              </Button>
              <RetrimiteConfirmarea />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
