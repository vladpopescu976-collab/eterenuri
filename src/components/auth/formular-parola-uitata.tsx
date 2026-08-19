"use client";

import { useState } from "react";
import { Loader2, MailCheck, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularParolaUitata() {
  const [email, setEmail] = useState("");
  const [seTrimite, setSeTrimite] = useState(false);
  const [trimis, setTrimis] = useState(false);

  async function trimite(eveniment: React.FormEvent) {
    eveniment.preventDefault();
    if (!email.trim()) {
      toast.error("Scrie adresa de email.");
      return;
    }

    setSeTrimite(true);
    try {
      const raspuns = await fetch("/api/parola/cerere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const date = await raspuns.json();

      if (!raspuns.ok) {
        toast.error(date.error ?? "Nu am putut trimite emailul.");
        return;
      }
      if (date.trimis === false && date.motiv) {
        // Serverul de email e picat: spunem exact de ce, ca să nu aștepte
        // degeaba un mesaj care nu vine.
        toast.error(date.motiv);
        return;
      }
      setTrimis(true);
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    } finally {
      setSeTrimite(false);
    }
  }

  if (trimis) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Verifică-ți emailul</p>
        <p className="text-sm text-muted-foreground">
          Dacă adresa <span className="font-medium text-foreground">{email}</span> are un cont,
          linkul de schimbare a parolei e pe drum. Este valabil o oră.
        </p>
        <p className="text-xs text-muted-foreground">Nu găsești mesajul? Verifică și folderul Spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={trimite} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-resetare">Email</Label>
        <Input
          id="email-resetare"
          type="email"
          placeholder="nume@exemplu.ro"
          autoComplete="email"
          value={email}
          onChange={(eveniment) => setEmail(eveniment.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={seTrimite}>
        {seTrimite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Trimite linkul
      </Button>
    </form>
  );
}
