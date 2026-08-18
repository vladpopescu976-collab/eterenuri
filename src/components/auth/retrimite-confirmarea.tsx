"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Cere un link nou de confirmare. Răspunsul serverului este intenționat același
 * pentru orice adresă, ca formularul să nu spună cine are cont.
 */
export function RetrimiteConfirmarea({ email: emailInitial = "" }: { email?: string }) {
  const [email, setEmail] = useState(emailInitial);
  const [seTrimite, setSeTrimite] = useState(false);
  const [trimis, setTrimis] = useState(false);

  async function trimite() {
    if (!email.trim()) {
      toast.error("Scrie adresa de email.");
      return;
    }

    setSeTrimite(true);
    try {
      const raspuns = await fetch("/api/retrimite-confirmare", {
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
        // Contul e în regulă, dar emailul nu a plecat: spunem exact de ce, ca
        // să nu aștepte degeaba un mesaj care nu vine.
        toast.error(date.motiv);
        return;
      }

      setTrimis(true);
      toast.success("Dacă adresa are un cont neconfirmat, linkul e pe drum.");
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    } finally {
      setSeTrimite(false);
    }
  }

  return (
    <div className="space-y-3">
      {!emailInitial && (
        <Input
          type="email"
          placeholder="nume@exemplu.ro"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      )}
      <Button
        variant={emailInitial ? "outline" : "default"}
        className="w-full"
        onClick={trimite}
        disabled={seTrimite || trimis}
      >
        {seTrimite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {trimis ? "Link trimis" : "Trimite din nou linkul"}
      </Button>
    </div>
  );
}
