import type { Metadata } from "next";
import Link from "next/link";
import { Clock, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularParolaNoua } from "@/components/auth/formular-parola-noua";
import { tokenulEsteValabil } from "@/lib/emailuri/parola";

export const metadata: Metadata = {
  title: "Parolă nouă — Eterenuri",
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ParolaNouaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Verificăm întâi linkul: n-are rost să completeze cineva o parolă nouă
  // într-un formular care oricum va fi refuzat.
  const valabil = await tokenulEsteValabil(token ?? "");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        {valabil ? (
          <>
            <CardHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle>Alege o parolă nouă</CardTitle>
              <CardDescription>
                După ce o salvezi, te poți autentifica imediat cu ea.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormularParolaNoua token={token ?? ""} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <CardTitle>Linkul nu mai este valabil</CardTitle>
              <CardDescription>
                Linkurile de schimbare a parolei țin o oră și pot fi folosite o singură dată.
                Cere altul și îl trimitem imediat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" nativeButton={false} render={<Link href="/parola-uitata" />}>
                Cere alt link
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
