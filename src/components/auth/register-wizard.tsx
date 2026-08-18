"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RetrimiteConfirmarea } from "@/components/auth/retrimite-confirmarea";
import {
  registerFormSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { ORASE_ROMANIA } from "@/lib/orase";
import { sportOptions, sportMeta } from "@/lib/sports";
import { cn } from "@/lib/utils";
import type { Role, SportType } from "@prisma/client";

const PASI = [
  { titlu: "Date de bază", descriere: "Cum te cheamă și cum intri în cont." },
  { titlu: "Profil", descriere: "Câteva detalii ca să îți arătăm ce te interesează." },
  { titlu: "Confirmare", descriere: "Verifică datele și creează contul." },
] as const;

// Câmpurile validate înainte de trecerea la pasul următor. Restul nu blochează
// avansarea, ca formularul să nu se plângă de ce nu ai completat încă.
const CAMPURI_PAS: Record<number, (keyof RegisterFormInput)[]> = {
  0: ["name", "email", "password", "confirmPassword"],
  1: ["role", "phone", "city"],
  2: ["acceptaTermenii"],
};

type FormularInregistrare = UseFormReturn<RegisterFormInput, unknown, RegisterFormValues>;

type Stare =
  | { faza: "formular" }
  | { faza: "trimis"; email: string; emailTrimis: boolean; motiv?: string };

export function RegisterWizard({ role }: { role: Role }) {
  const [pas, setPas] = useState(0);
  // -1 la întoarcere, ca animația să meargă în direcția potrivită.
  const [directie, setDirectie] = useState(1);
  const [seTrimite, setSeTrimite] = useState(false);
  const [stare, setStare] = useState<Stare>({ faza: "formular" });

  // Trei tipuri: ce ține formularul, contextul, și ce iese după ce zod aplică
  // valorile implicite. Fără al treilea, `handleSubmit` ar primi tipul de
  // intrare, în care `phone`, `city` și `sports` pot lipsi.
  const form = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    // Validare în timp real: mesajul apare pe măsură ce scrii, nu abia la final.
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role,
      phone: "",
      city: "",
      sports: [],
      acceptaTermenii: false as unknown as true,
    },
  });

  async function inainte() {
    const valid = await form.trigger(CAMPURI_PAS[pas]);
    if (!valid) return;
    setDirectie(1);
    setPas((curent) => Math.min(curent + 1, PASI.length - 1));
  }

  function inapoi() {
    setDirectie(-1);
    setPas((curent) => Math.max(curent - 1, 0));
  }

  async function trimite(valori: RegisterFormValues) {
    setSeTrimite(true);
    try {
      const raspuns = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valori),
      });
      const date = await raspuns.json();

      if (!raspuns.ok) {
        toast.error(date.error ?? "Nu s-a putut crea contul.");
        // Emailul deja folosit se corectează în primul pas.
        if (raspuns.status === 409) {
          setDirectie(-1);
          setPas(0);
          form.setError("email", { message: "Există deja un cont cu acest email." });
        }
        return;
      }

      setStare({
        faza: "trimis",
        email: date.email,
        emailTrimis: date.emailTrimis !== false,
        motiv: date.motiv,
      });
    } catch {
      toast.error("A apărut o eroare. Te rugăm să încerci din nou.");
    } finally {
      setSeTrimite(false);
    }
  }

  if (stare.faza === "trimis") {
    return <VerificaEmailul {...stare} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(trimite)} className="space-y-5">
        <Progres pas={pas} />

        {/* Pasul vechi dispare imediat, cel nou intră cu o alunecare. Fără
            animație de ieșire: cu ea, cele două seturi de câmpuri fie se
            suprapuneau, fie pasul nou rămânea invizibil până se termina
            ieșirea. `key` forțează remontarea, deci animația de intrare
            pornește la fiecare schimbare de pas. */}
        <div className="overflow-x-clip">
          <motion.div
            key={pas}
            initial={{ opacity: 0, x: directie * 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {pas === 0 && <PasDate form={form} />}
            {pas === 1 && <PasProfil form={form} />}
            {pas === 2 && <PasRezumat form={form} />}
          </motion.div>
        </div>

        <div className="flex gap-2 pt-1">
          {pas > 0 && (
            <Button type="button" variant="outline" onClick={inapoi} disabled={seTrimite}>
              <ArrowLeft className="h-4 w-4" />
              Înapoi
            </Button>
          )}

          {pas < PASI.length - 1 ? (
            <Button type="button" className="flex-1" onClick={inainte}>
              Continuă
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={seTrimite}>
              {seTrimite && <Loader2 className="h-4 w-4 animate-spin" />}
              {seTrimite ? "Se creează contul…" : "Creează contul"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

// MARK: - Progres

function Progres({ pas }: { pas: number }) {
  const procent = ((pas + 1) / PASI.length) * 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{PASI[pas].titlu}</p>
        <p className="text-xs text-muted-foreground">
          Pasul {pas + 1} din {PASI.length}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${procent}%` }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{PASI[pas].descriere}</p>
    </div>
  );
}

// MARK: - Pasul 1

function PasDate({ form }: { form: FormularInregistrare }) {
  const parola = form.watch("password");
  const rol = form.watch("role");

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {rol === "BUSINESS" ? "Nume companie / persoană de contact" : "Nume complet"}
            </FormLabel>
            <FormControl>
              <Input placeholder="Ion Popescu" autoComplete="name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="nume@exemplu.ro" type="email" autoComplete="email" {...field} />
            </FormControl>
            <FormDescription>Aici primești linkul de confirmare a contului.</FormDescription>
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
                placeholder="Minim 8 caractere"
                type="password"
                autoComplete="new-password"
                {...field}
              />
            </FormControl>
            <PutereaParolei parola={parola} />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirmă parola</FormLabel>
            <FormControl>
              <Input
                placeholder="••••••••"
                type="password"
                autoComplete="new-password"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** Cât de bună e parola, cât o scrii. Nu blochează nimic, doar arată. */
function PutereaParolei({ parola }: { parola: string }) {
  const scor = useMemo(() => {
    if (!parola) return 0;
    let puncte = 0;
    if (parola.length >= 8) puncte++;
    if (parola.length >= 12) puncte++;
    if (/[a-z]/.test(parola) && /[A-Z]/.test(parola)) puncte++;
    if (/\d/.test(parola)) puncte++;
    if (/[^\w\s]/.test(parola)) puncte++;
    return Math.min(puncte, 4);
  }, [parola]);

  if (!parola) return null;

  const etichete = ["Foarte slabă", "Slabă", "Acceptabilă", "Bună", "Puternică"];
  const culori = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < scor ? culori[scor] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Parolă {etichete[scor].toLowerCase()}</p>
    </div>
  );
}

// MARK: - Pasul 2

function PasProfil({ form }: { form: FormularInregistrare }) {
  const rol = form.watch("role");
  const sporturi = form.watch("sports") ?? [];

  function comutaSport(sport: SportType) {
    // Citim valoarea din formular, nu pe cea prinsă la randare: două apăsări
    // înainte de următoarea randare ar porni amândouă de la aceeași listă
    // veche, iar a doua ar șterge prima alegere.
    const curente = form.getValues("sports") ?? [];
    const urmatoare = curente.includes(sport)
      ? curente.filter((valoare) => valoare !== sport)
      : [...curente, sport];
    form.setValue("sports", urmatoare, { shouldDirty: true });
  }

  return (
    <>
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tip cont</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <CardRol
                activ={field.value === "PERSONAL"}
                titlu="Personal"
                descriere="Caut terenuri și rezerv."
                Icon={User}
                onClick={() => field.onChange("PERSONAL")}
              />
              <CardRol
                activ={field.value === "BUSINESS"}
                titlu="Business"
                descriere="Am terenuri de închiriat."
                Icon={Building2}
                onClick={() => field.onChange("BUSINESS")}
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefon</FormLabel>
            <FormControl>
              <Input placeholder="0722 123 456" type="tel" autoComplete="tel" {...field} />
            </FormControl>
            <FormDescription>
              {rol === "BUSINESS"
                ? "Apare pe paginile terenurilor tale, ca să te poată suna clienții."
                : "Îl folosește proprietarul terenului dacă apare o schimbare la rezervare."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Oraș</FormLabel>
            <FormControl>
              <Input
                placeholder="Timișoara"
                list="orase-inregistrare"
                autoComplete="address-level2"
                {...field}
              />
            </FormControl>
            <datalist id="orase-inregistrare">
              {ORASE_ROMANIA.map((oras) => (
                <option key={oras} value={oras} />
              ))}
            </datalist>
            <FormDescription>
              {rol === "BUSINESS"
                ? "Orașul în care ai terenurile."
                : "Îl folosim ca să îți arătăm terenurile din apropiere."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {rol === "PERSONAL" && (
        <FormItem>
          <FormLabel>Sporturi preferate</FormLabel>
          <div className="flex flex-wrap gap-2">
            {sportOptions.map((sport) => {
              const activ = sporturi.includes(sport.value);
              return (
                <button
                  key={sport.value}
                  type="button"
                  onClick={() => comutaSport(sport.value)}
                  aria-pressed={activ}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    activ
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {activ && <Check className="h-3.5 w-3.5" />}
                  {sport.label}
                </button>
              );
            })}
          </div>
          <FormDescription>Opțional. Le poți schimba oricând din contul tău.</FormDescription>
        </FormItem>
      )}
    </>
  );
}

function CardRol({
  activ,
  titlu,
  descriere,
  Icon,
  onClick,
}: {
  activ: boolean;
  titlu: string;
  descriere: string;
  Icon: typeof User;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activ}
      aria-label={titlu}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        activ ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          activ ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{titlu}</span>
        <span className="block text-xs text-muted-foreground">{descriere}</span>
      </span>
    </button>
  );
}

// MARK: - Pasul 3

function PasRezumat({ form }: { form: FormularInregistrare }) {
  const valori = form.watch();
  const sporturi = valori.sports ?? [];
  // Bifa e goală la intrarea în pas, deci validarea are deja o eroare pentru
  // ea. Nu o arătăm până nu o atinge cineva — altfel pasul se deschide direct
  // cu un mesaj roșu pentru ceva ce nu ai apucat să faci.
  const [atinsaBifa, setAtinsaBifa] = useState(false);

  return (
    <>
      <dl className="divide-y rounded-xl border">
        <Rand eticheta="Nume" valoare={valori.name} />
        <Rand eticheta="Email" valoare={valori.email} />
        <Rand eticheta="Tip cont" valoare={valori.role === "BUSINESS" ? "Business" : "Personal"} />
        {valori.phone ? <Rand eticheta="Telefon" valoare={valori.phone} /> : null}
        {valori.city ? <Rand eticheta="Oraș" valoare={valori.city} /> : null}
        {sporturi.length > 0 ? (
          <Rand
            eticheta="Sporturi"
            valoare={sporturi.map((sport) => sportMeta[sport].label).join(", ")}
          />
        ) : null}
      </dl>

      <FormField
        control={form.control}
        name="acceptaTermenii"
        render={({ field }) => (
          <FormItem>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(event) => {
                  setAtinsaBifa(true);
                  field.onChange(event.target.checked);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-muted-foreground">
                Am citit și accept{" "}
                <Link
                  href="/pagini/termeni-si-conditii"
                  target="_blank"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  termenii și condițiile
                </Link>{" "}
                și{" "}
                <Link
                  href="/pagini/politica-de-confidentialitate"
                  target="_blank"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  politica de confidențialitate
                </Link>
                .
              </span>
            </label>
            {(atinsaBifa || form.formState.isSubmitted) && <FormMessage />}
          </FormItem>
        )}
      />

      <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
        După ce creezi contul îți trimitem un email de confirmare. Contul se poate folosi
        abia după ce apeși linkul din el.
      </p>
    </>
  );
}

function Rand({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{eticheta}</dt>
      <dd className="truncate text-sm font-medium">{valoare}</dd>
    </div>
  );
}

// MARK: - După trimitere

function VerificaEmailul({
  email,
  emailTrimis,
  motiv,
}: {
  email: string;
  emailTrimis: boolean;
  motiv?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {emailTrimis ? <Mail className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">Verifică-ți emailul</h3>
        <p className="text-sm text-muted-foreground">
          Am trimis un link de confirmare la{" "}
          <span className="font-medium text-foreground">{email}</span>. Apasă-l ca să îți
          activezi contul.
        </p>
      </div>

      {!emailTrimis && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-left text-xs text-amber-700 dark:text-amber-500">
          Contul a fost creat, dar emailul nu a putut fi trimis
          {motiv ? `: ${motiv}` : "."} Încearcă din nou mai jos.
        </p>
      )}

      <div className="space-y-2 text-left">
        <RetrimiteConfirmarea email={email} />
        <p className="text-center text-xs text-muted-foreground">
          Nu găsești mesajul? Verifică și folderul Spam.
        </p>
      </div>
    </motion.div>
  );
}
