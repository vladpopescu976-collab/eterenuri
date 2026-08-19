"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PutereaParolei } from "@/components/auth/puterea-parolei";

export function FormularParolaNoua({ token }: { token: string }) {
  const router = useRouter();
  const [parola, setParola] = useState("");
  const [confirmare, setConfirmare] = useState("");
  const [seTrimite, setSeTrimite] = useState(false);

  async function trimite(eveniment: React.FormEvent) {
    eveniment.preventDefault();

    if (parola !== confirmare) {
      toast.error("Parolele nu coincid.");
      return;
    }

    setSeTrimite(true);
    try {
      const raspuns = await fetch("/api/parola/schimbare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, parola }),
      });
      const date = await raspuns.json();

      if (!raspuns.ok) {
        toast.error(date.error ?? "Nu am putut schimba parola.");
        return;
      }

      toast.success("Parola a fost schimbată. Te poți autentifica.");
      router.push("/autentificare");
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    } finally {
      setSeTrimite(false);
    }
  }

  return (
    <form onSubmit={trimite} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="parola-noua">Parolă nouă</Label>
        <Input
          id="parola-noua"
          type="password"
          placeholder="Minim 8 caractere"
          autoComplete="new-password"
          value={parola}
          onChange={(eveniment) => setParola(eveniment.target.value)}
        />
        <PutereaParolei parola={parola} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parola-confirmare">Confirmă parola</Label>
        <Input
          id="parola-confirmare"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmare}
          onChange={(eveniment) => setConfirmare(eveniment.target.value)}
        />
        {confirmare.length > 0 && parola !== confirmare && (
          <p className="text-[13px] text-destructive">Parolele nu coincid.</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={seTrimite || parola.length < 8}>
        {seTrimite && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvează parola
      </Button>
    </form>
  );
}
