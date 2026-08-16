"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        expectedRole: role,
        redirect: false,
      });

      if (result?.error) {
        // Nu dezvaluim daca emailul exista: acelasi mesaj si pentru parola
        // gresita, si pentru cont de alt tip, dar cu un indiciu util.
        toast.error("Email sau parolă incorectă.", {
          description:
            role === "PERSONAL"
              ? "Dacă ai un cont Business, revino și alege „Cont Business”."
              : "Dacă ai un cont Personal, revino și alege „Cont Personal”.",
        });
        return;
      }

      toast.success("Autentificare reușită! Bine ai revenit.");
      // Pagina decide pe server unde te duce, in functie de rolul contului.
      // Sesiunea e citita din cookie pe server, deci nu depinde de starea
      // inca nepropagata din client.
      router.push("/dupa-autentificare");
    } catch {
      toast.error("A apărut o eroare. Te rugăm să încerci din nou.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          Autentificare
        </Button>
      </form>
    </Form>
  );
}
