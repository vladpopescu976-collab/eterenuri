"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterWizard } from "@/components/auth/register-wizard";
import type { Role } from "@prisma/client";

const copy: Record<Role, { title: string; description: string }> = {
  PERSONAL: {
    title: "Cont Personal",
    description: "Caută terenuri sportive și fă rezervări în câteva secunde.",
  },
  BUSINESS: {
    title: "Cont Business",
    description: "Administrează-ți terenurile și cererile de rezervare.",
  },
};

export function AuthPanel({
  role,
  initialMode,
  error,
  code,
}: {
  role: Role;
  initialMode: "login" | "register";
  error?: string;
  code?: string;
}) {
  const [mod, setMod] = useState(initialMode);

  // Trezim baza de date cat utilizatorul isi scrie datele. Fara asta, prima
  // autentificare dupa o pauza astepta ~30-55s pentru pornirea bazei si
  // parea ca butonul nu face nimic.
  useEffect(() => {
    fetch("/api/incalzire").catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-lg space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        nativeButton={false}
        render={<Link href="/autentificare" />}
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi
      </Button>

      <Card>
        <CardHeader>
          {/* La înregistrare, tipul contului se alege în primul pas al
              formularului, deci antetul nu poate pretinde că îl știe: spunea
              „Cont Personal” și după ce alegeai Business. */}
          <CardTitle>{mod === "register" ? "Cont nou" : copy[role].title}</CardTitle>
          <CardDescription>
            {mod === "register"
              ? "Îți faci cont în patru pași. Poți reveni oricând la pasul dinainte."
              : copy[role].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mod} onValueChange={(valoare) => setMod(valoare as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Autentificare</TabsTrigger>
              <TabsTrigger value="register">Înregistrare</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="pt-4">
              <LoginForm role={role} error={error} code={code} />
            </TabsContent>
            <TabsContent value="register" className="pt-4">
              <RegisterWizard role={role} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        sau{" "}
        <Link href="/" className="font-medium text-foreground underline underline-offset-4">
          continuă ca vizitator
        </Link>
      </p>
    </div>
  );
}
