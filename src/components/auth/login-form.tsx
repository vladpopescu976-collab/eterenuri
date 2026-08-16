"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import type { Role } from "@prisma/client";

export function LoginForm({ role, error }: { role: Role; error?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [durataMare, setDurataMare] = useState(false);

  // Daca autentificarea trece de 5 secunde, explicam de ce dureaza, ca sa nu
  // para blocata si sa renunte utilizatorul.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setDurataMare(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setDurataMare(false);
    setIsLoading(true);
    try {
      // Lasam NextAuth sa faca redirectionarea (navigare completa), nu
      // router.push dupa `redirect: false`. Cu varianta veche, cookie-ul de
      // sesiune putea sa nu fie inca disponibil cand pagina urmatoare il
      // citea, iar pe conexiuni lente (telefon) autentificarea parea ca nu
      // face nimic. La eroare, NextAuth ne trimite inapoi cu ?error=.
      await signIn("credentials", {
        email: values.email,
        password: values.password,
        expectedRole: role,
        redirectTo: "/dupa-autentificare",
      });
    } catch (error) {
      // Redirectionarea reusita este semnalata tot printr-o exceptie, pe
      // care trebuie sa o lasam sa treaca mai departe.
      if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      toast.error("A apărut o eroare. Te rugăm să încerci din nou.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <p className="font-medium">Email sau parolă incorectă.</p>
            <p className="mt-0.5 text-destructive/80">
              {role === "PERSONAL"
                ? "Dacă ai un cont Business, revino și alege „Cont Business”."
                : "Dacă ai un cont Personal, revino și alege „Cont Personal”."}
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="nume@exemplu.ro" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parolă</FormLabel>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Se verifică…" : "Autentificare"}
        </Button>

        {durataMare && (
          <p className="text-center text-[12.5px] text-muted-foreground">
            Prima autentificare după o pauză poate dura până la un minut, cât
            pornește serverul. Te rugăm să aștepți.
          </p>
        )}
      </form>
    </Form>
  );
}
