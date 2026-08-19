import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZonaPericuloasa } from "@/components/cont/zona-periculoasa";
import { sportMeta } from "@/lib/sports";

export const metadata: Metadata = { title: "Contul meu — Eterenuri" };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NIVELURI: Record<string, string> = {
  INCEPATOR: "Începător",
  MEDIU: "Mediu",
  AVANSAT: "Avansat",
  COMPETITIV: "Competitiv",
};

const INTERVALE: Record<string, string> = {
  DIMINEATA: "Dimineața",
  PRANZ: "La prânz",
  DUPA_AMIAZA: "După-amiaza",
  SEARA: "Seara",
  WEEKEND: "În weekend",
};

export default async function ContulMeuPage() {
  const session = await auth();
  if (!session?.user) redirect("/autentificare");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, email: true, role: true, phone: true, city: true, sports: true,
      birthDate: true, skillLevel: true, preferredTimes: true,
      companyName: true, website: true,
      marketingOptIn: true, createdAt: true,
      _count: { select: { bookings: true, fields: true, reviews: true } },
    },
  });
  if (!user) redirect("/autentificare");

  const esteBusiness = user.role === "BUSINESS";

  const randuri: { eticheta: string; valoare: string }[] = [
    { eticheta: "Nume", valoare: user.name },
    { eticheta: "Email", valoare: user.email },
    { eticheta: "Tip cont", valoare: esteBusiness ? "Business" : "Personal" },
    ...(user.phone ? [{ eticheta: "Telefon", valoare: user.phone }] : []),
    ...(user.city ? [{ eticheta: "Oraș", valoare: user.city }] : []),
  ];

  if (esteBusiness) {
    if (user.companyName) randuri.push({ eticheta: "Firmă", valoare: user.companyName });
    if (user.website) randuri.push({ eticheta: "Site", valoare: user.website });
    randuri.push({ eticheta: "Terenuri publicate", valoare: String(user._count.fields) });
  } else {
    if (user.birthDate) {
      randuri.push({
        eticheta: "Data nașterii",
        valoare: user.birthDate.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
      });
    }
    if (user.skillLevel) randuri.push({ eticheta: "Nivel", valoare: NIVELURI[user.skillLevel] });
    if (user.preferredTimes.length) {
      randuri.push({
        eticheta: "Când joacă",
        valoare: user.preferredTimes.map((interval) => INTERVALE[interval]).join(", "),
      });
    }
    randuri.push({ eticheta: "Rezervări", valoare: String(user._count.bookings) });
  }

  randuri.push({
    eticheta: "Membru din",
    valoare: user.createdAt.toLocaleDateString("ro-RO", { month: "long", year: "numeric" }),
  });
  randuri.push({
    eticheta: "Mesaje de marketing",
    valoare: user.marketingOptIn ? "Acceptate" : "Refuzate",
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4"
        nativeButton={false}
        render={<Link href={esteBusiness ? "/dashboard/business" : "/"} />}
      >
        <ArrowLeft className="h-4 w-4" />
        {esteBusiness ? "Înapoi la panou" : "Înapoi pe site"}
      </Button>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contul meu</CardTitle>
            <CardDescription>Datele pe care le avem despre tine.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y rounded-xl border">
              {randuri.map((rand) => (
                <div key={rand.eticheta} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{rand.eticheta}</dt>
                  <dd className="text-right text-sm font-medium">{rand.valoare}</dd>
                </div>
              ))}
            </dl>

            {!esteBusiness && user.sports.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Sporturi preferate</p>
                <div className="flex flex-wrap gap-2">
                  {user.sports.map((sport) => (
                    <Badge key={sport} variant="secondary">
                      {sportMeta[sport].label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ZonaPericuloasa esteBusiness={esteBusiness} />
      </div>
    </div>
  );
}
