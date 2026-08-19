import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularParolaUitata } from "@/components/auth/formular-parola-uitata";

export const metadata: Metadata = {
  title: "Ți-ai uitat parola? — Scorer",
};

export default function ParolaUitataPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          nativeButton={false}
          render={<Link href="/autentificare" />}
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la autentificare
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Ți-ai uitat parola?</CardTitle>
            <CardDescription>
              Scrie adresa cu care te-ai înscris și îți trimitem un link prin care îți alegi una nouă.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormularParolaUitata />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
