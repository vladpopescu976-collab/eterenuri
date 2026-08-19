"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { stergeContulMeu } from "@/lib/actions/cont";

const CUVANT = "STERGE";

export function ZonaPericuloasa({ esteBusiness }: { esteBusiness: boolean }) {
  const router = useRouter();
  const [deschis, setDeschis] = useState(false);
  const [parola, setParola] = useState("");
  const [confirmare, setConfirmare] = useState("");
  const [seSterge, setSeSterge] = useState(false);

  const gata = parola.length > 0 && confirmare.trim().toUpperCase() === CUVANT;

  async function sterge() {
    setSeSterge(true);
    try {
      const rezultat = await stergeContulMeu(parola);
      if (!rezultat.ok) {
        toast.error(rezultat.error);
        return;
      }
      toast.success("Contul a fost șters.");
      // `refresh` înainte de navigare: fără el, componentele server rămân în
      // memoria clientului cu sesiunea de dinainte de ștergere.
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    } finally {
      setSeSterge(false);
    }
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Ștergerea contului</CardTitle>
          <CardDescription>
            {esteBusiness
              ? "Se șterg definitiv contul, terenurile publicate și istoricul rezervărilor. Dacă ai rezervări viitoare, rezolvă-le întâi."
              : "Se șterg definitiv contul, rezervările, favoritele și recenziile tale. Rezervările viitoare se anulează, iar proprietarii sunt anunțați."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeschis(true)}>
            <AlertTriangle className="h-4 w-4" />
            Șterge contul
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deschis} onOpenChange={setDeschis}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ștergi definitiv contul?</DialogTitle>
            <DialogDescription>
              Operațiunea nu poate fi anulată și datele nu pot fi recuperate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parola-stergere">Parola contului</Label>
              <Input
                id="parola-stergere"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={parola}
                onChange={(eveniment) => setParola(eveniment.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuvant-stergere">
                Scrie <span className="font-mono font-semibold">{CUVANT}</span> ca să confirmi
              </Label>
              <Input
                id="cuvant-stergere"
                autoComplete="off"
                placeholder={CUVANT}
                value={confirmare}
                onChange={(eveniment) => setConfirmare(eveniment.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeschis(false)} disabled={seSterge}>
              Renunță
            </Button>
            <Button variant="destructive" onClick={sterge} disabled={!gata || seSterge}>
              {seSterge && <Loader2 className="h-4 w-4 animate-spin" />}
              Șterge definitiv
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
