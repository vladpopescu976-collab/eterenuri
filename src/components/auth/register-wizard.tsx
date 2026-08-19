"use client";

import { useState } from "react";
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
import { PutereaParolei } from "@/components/auth/puterea-parolei";
import {
  intervalValues,
  nivelValues,
  registerFormSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { ORASE_ROMANIA } from "@/lib/orase";
import { sportOptions, sportMeta } from "@/lib/sports";
import { cn } from "@/lib/utils";
import type { Role, SportType } from "@prisma/client";

const PASI = [
  { titlu: "Tipul contului", descriere: "Ce faci pe Eterenuri: joci sau închiriezi?" },
  { titlu: "Date de bază", descriere: "Cum te cheamă și cum intri în cont." },
  { titlu: "Profil", descriere: "Detaliile de care avem nevoie ca să funcționeze rezervările." },
  { titlu: "Confirmare", descriere: "Verifică datele și creează contul." },
] as const;

// Câmpurile validate înainte de trecerea la pasul următor. Restul nu blochează
// avansarea, ca formularul să nu se plângă de ce nu ai completat încă.
const CAMPURI_PERSONAL: (keyof RegisterFormInput)[] = ["phone", "city", "birthDate"];
const CAMPURI_BUSINESS: (keyof RegisterFormInput)[] = [
  "companyName",
  "phone",
  "city",
  "website",
];

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
      birthDate: "",
      skillLevel: undefined,
      preferredTimes: [],
      companyName: "",
      website: "",
      acceptaTermenii: false as unknown as true,
      marketingOptIn: false,
    },
  });

  function campuriPasului(index: number): (keyof RegisterFormInput)[] {
    if (index === 0) return ["role"];
    if (index === 1) return ["name", "email", "password", "confirmPassword"];
    if (index === 2) {
      return form.getValues("role") === "BUSINESS" ? CAMPURI_BUSINESS : CAMPURI_PERSONAL;
    }
    return ["acceptaTermenii"];
  }

  /**
   * Verificările pe care zod le pune la nivel de obiect, nu pe câmp.
   *
   * `trigger` cu o listă de câmpuri nu le ridică: întreabă schema, dar apoi
   * copiază doar erorile găsite exact pe numele cerute, iar potrivirea
   * parolelor și denumirea firmei sunt legate de tot formularul. Fără linia
   * asta, se trecea la pasul următor cu două parole diferite.
   */
  function verificariIntreCampuri(index: number): boolean {
    const valori = form.getValues();

    if (index === 1 && valori.password !== valori.confirmPassword) {
      form.setError("confirmPassword", { message: "Parolele nu coincid." });
      return false;
    }

    if (index === 2 && valori.role === "BUSINESS" && (valori.companyName ?? "").trim().length < 2) {
      form.setError("companyName", { message: "Denumirea firmei este obligatorie." });
      return false;
    }

    return true;
  }

  async function inainte() {
    const valid = await form.trigger(campuriPasului(pas));
    if (!valid || !verificariIntreCampuri(pas)) return;
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
          setPas(1);
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
            {pas === 0 && <PasTipCont form={form} />}
            {pas === 1 && <PasDate form={form} />}
            {pas === 2 && <PasProfil form={form} />}
            {pas === 3 && <PasRezumat form={form} />}
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

// MARK: - Pasul 1: tipul contului

function PasTipCont({ form }: { form: FormularInregistrare }) {
  return (
    <FormField
      control={form.control}
      name="role"
      render={({ field }) => (
        <FormItem>
          <div className="space-y-2.5">
            <OptiuneCont
              activ={field.value === "PERSONAL"}
              titlu="Vreau să joc"
              descriere="Cauți terenuri libere, rezervi și îți ții rezervările la un loc."
              detalii={["Căutare pe oraș, sport și oră", "Rezervi în câteva secunde", "Terenuri favorite și recenzii"]}
              Icon={User}
              onClick={() => field.onChange("PERSONAL")}
            />
            <OptiuneCont
              activ={field.value === "BUSINESS"}
              titlu="Am terenuri de închiriat"
              descriere="Îți publici terenurile și primești rezervări direct în calendar."
              detalii={["Calendar și orar pe fiecare teren", "Aprobi sau muți cererile", "Rezervări luate la telefon, la un loc"]}
              Icon={Building2}
              onClick={() => field.onChange("BUSINESS")}
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function OptiuneCont({
  activ,
  titlu,
  descriere,
  detalii,
  Icon,
  onClick,
}: {
  activ: boolean;
  titlu: string;
  descriere: string;
  detalii: string[];
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
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        activ ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          activ ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{titlu}</span>
          {activ && <Check className="h-4 w-4 text-primary" />}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{descriere}</span>
        <span className="mt-2 block space-y-1">
          {detalii.map((detaliu) => (
            <span key={detaliu} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              {detaliu}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

// MARK: - Pasul 2: datele de bază

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
            {/* Cât scrii, fără să aștepți butonul „Continuă”. */}
            {String(field.value ?? "").length > 0 && field.value !== parola ? (
              <p className="text-[13px] text-destructive">Parolele nu coincid.</p>
            ) : (
              <FormMessage />
            )}
          </FormItem>
        )}
      />
    </>
  );
}

// MARK: - Pasul 3: profilul, diferit pe fiecare tip de cont

const NIVELURI: { valoare: (typeof nivelValues)[number]; eticheta: string; detaliu: string }[] = [
  { valoare: "INCEPATOR", eticheta: "Începător", detaliu: "Joc din când în când, de plăcere." },
  { valoare: "MEDIU", eticheta: "Mediu", detaliu: "Joc regulat, cu aceiași prieteni." },
  { valoare: "AVANSAT", eticheta: "Avansat", detaliu: "Joc des și țin la nivelul partenerilor." },
  { valoare: "COMPETITIV", eticheta: "Competitiv", detaliu: "Joc în ligi sau competiții." },
];

const INTERVALE: { valoare: (typeof intervalValues)[number]; eticheta: string }[] = [
  { valoare: "DIMINEATA", eticheta: "Dimineața" },
  { valoare: "PRANZ", eticheta: "La prânz" },
  { valoare: "DUPA_AMIAZA", eticheta: "După-amiaza" },
  { valoare: "SEARA", eticheta: "Seara" },
  { valoare: "WEEKEND", eticheta: "În weekend" },
];

function PasProfil({ form }: { form: FormularInregistrare }) {
  return form.watch("role") === "BUSINESS" ? (
    <ProfilBusiness form={form} />
  ) : (
    <ProfilPersonal form={form} />
  );
}

function CampOras({ form }: { form: FormularInregistrare }) {
  const esteBusiness = form.watch("role") === "BUSINESS";
  return (
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
            {esteBusiness
              ? "Orașul în care ai terenurile."
              : "Îl folosim ca să îți arătăm terenurile din apropiere."}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CampTelefon({ form }: { form: FormularInregistrare }) {
  const esteBusiness = form.watch("role") === "BUSINESS";
  return (
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
            {esteBusiness
              ? "Apare pe paginile terenurilor tale, ca să te poată suna clienții."
              : "Proprietarul terenului te sună dacă apare o schimbare la rezervare."}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ProfilPersonal({ form }: { form: FormularInregistrare }) {
  const sporturi = form.watch("sports") ?? [];
  const intervale = form.watch("preferredTimes") ?? [];

  function comuta<T extends string>(
    camp: "sports" | "preferredTimes",
    curente: T[],
    valoare: T
  ) {
    // Citim din formular, nu din randare: două apăsări înainte de următoarea
    // randare ar porni amândouă de la aceeași listă veche.
    const acum = (form.getValues(camp) ?? []) as T[];
    const urmatoare = acum.includes(valoare)
      ? acum.filter((element) => element !== valoare)
      : [...acum, valoare];
    form.setValue(camp, urmatoare as never, { shouldDirty: true });
  }

  return (
    <>
      <CampTelefon form={form} />
      <CampOras form={form} />

      <FormField
        control={form.control}
        name="birthDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Data nașterii</FormLabel>
            <FormControl>
              <Input type="date" max={ziuaDeAzi()} {...field} />
            </FormControl>
            <FormDescription>
              Ne asigurăm că ai vârsta minimă și îți putem arăta competițiile potrivite.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="skillLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nivelul tău</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {NIVELURI.map((nivel) => (
                <button
                  key={nivel.valoare}
                  type="button"
                  aria-pressed={field.value === nivel.valoare}
                  aria-label={nivel.eticheta}
                  onClick={() =>
                    field.onChange(field.value === nivel.valoare ? undefined : nivel.valoare)
                  }
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition-colors",
                    field.value === nivel.valoare
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <span className="block text-sm font-medium">{nivel.eticheta}</span>
                  <span className="block text-xs text-muted-foreground">{nivel.detaliu}</span>
                </button>
              ))}
            </div>
            <FormDescription>Opțional. Îl poți schimba oricând.</FormDescription>
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>Sporturi preferate</FormLabel>
        <div className="flex flex-wrap gap-2">
          {sportOptions.map((sport) => (
            <Chip
              key={sport.value}
              eticheta={sport.label}
              activ={sporturi.includes(sport.value)}
              onClick={() => comuta("sports", sporturi, sport.value)}
            />
          ))}
        </div>
      </FormItem>

      <FormItem>
        <FormLabel>Când joci de obicei</FormLabel>
        <div className="flex flex-wrap gap-2">
          {INTERVALE.map((interval) => (
            <Chip
              key={interval.valoare}
              eticheta={interval.eticheta}
              activ={intervale.includes(interval.valoare)}
              onClick={() => comuta("preferredTimes", intervale, interval.valoare)}
            />
          ))}
        </div>
        <FormDescription>
          Opțional. Ne ajută să îți arătăm întâi orele în care chiar ai timp.
        </FormDescription>
      </FormItem>
    </>
  );
}

function ProfilBusiness({ form }: { form: FormularInregistrare }) {
  const sporturi = form.watch("sports") ?? [];

  function comutaSport(sport: SportType) {
    const acum = form.getValues("sports") ?? [];
    form.setValue(
      "sports",
      acum.includes(sport) ? acum.filter((s) => s !== sport) : [...acum, sport],
      { shouldDirty: true }
    );
  }

  return (
    <>
      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Denumirea firmei</FormLabel>
            <FormControl>
              <Input placeholder="Sport Arena SRL" autoComplete="organization" {...field} />
            </FormControl>
            <FormDescription>Apare pe paginile terenurilor tale.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <CampTelefon form={form} />
      <CampOras form={form} />

      <FormItem>
        <FormLabel>Ce sporturi se joacă pe terenurile tale</FormLabel>
        <div className="flex flex-wrap gap-2">
          {sportOptions.map((sport) => (
            <Chip
              key={sport.value}
              eticheta={sport.label}
              activ={sporturi.includes(sport.value)}
              onClick={() => comutaSport(sport.value)}
            />
          ))}
        </div>
        <FormDescription>Opțional. Terenurile se adaugă în detaliu după înregistrare.</FormDescription>
      </FormItem>

      {/* Ultimul, fiindcă e singurul câmp la care mulți nu au ce răspunde. */}
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site (opțional)</FormLabel>
            <FormControl>
              <Input placeholder="terenulmeu.ro" inputMode="url" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function Chip({
  eticheta,
  activ,
  onClick,
}: {
  eticheta: string;
  activ: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activ}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        activ
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {activ && <Check className="h-3.5 w-3.5" />}
      {eticheta}
    </button>
  );
}

/** Limita de sus pentru câmpul de dată — nu te poți naște mâine. */
function ziuaDeAzi(): string {
  return new Date().toISOString().slice(0, 10);
}

// MARK: - Pasul 3

function PasRezumat({ form }: { form: FormularInregistrare }) {
  const valori = form.watch();
  const sporturi = valori.sports ?? [];
  // Bifa e goală la intrarea în pas, deci validarea are deja o eroare pentru
  // ea. Nu o arătăm până nu o atinge cineva — altfel pasul se deschide direct
  // cu un mesaj roșu pentru ceva ce nu ai apucat să faci.
  const [atinsaBifa, setAtinsaBifa] = useState(false);

  const esteBusiness = valori.role === "BUSINESS";
  const intervale = valori.preferredTimes ?? [];

  return (
    <>
      <dl className="divide-y rounded-xl border">
        <Rand eticheta="Tip cont" valoare={esteBusiness ? "Business" : "Personal"} />
        <Rand eticheta="Nume" valoare={valori.name} />
        <Rand eticheta="Email" valoare={valori.email} />
        {valori.phone ? <Rand eticheta="Telefon" valoare={valori.phone} /> : null}
        {valori.city ? <Rand eticheta="Oraș" valoare={valori.city} /> : null}

        {esteBusiness ? (
          <>
            {valori.companyName ? <Rand eticheta="Firmă" valoare={valori.companyName} /> : null}
            {valori.website ? <Rand eticheta="Site" valoare={valori.website} /> : null}
          </>
        ) : (
          <>
            {valori.birthDate ? (
              <Rand eticheta="Data nașterii" valoare={dataRomaneste(valori.birthDate)} />
            ) : null}
            {valori.skillLevel ? (
              <Rand
                eticheta="Nivel"
                valoare={
                  NIVELURI.find((nivel) => nivel.valoare === valori.skillLevel)?.eticheta ?? ""
                }
              />
            ) : null}
            {intervale.length > 0 ? (
              <Rand
                eticheta="Când joacă"
                valoare={intervale
                  .map((valoare) => INTERVALE.find((i) => i.valoare === valoare)?.eticheta)
                  .filter(Boolean)
                  .join(", ")}
              />
            ) : null}
          </>
        )}

        {sporturi.length > 0 ? (
          <Rand
            eticheta={esteBusiness ? "Sporturi oferite" : "Sporturi"}
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

      <FormField
        control={form.control}
        name="marketingOptIn"
        render={({ field }) => (
          <FormItem>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-muted-foreground">
                Vreau să primesc pe email terenuri noi și oferte. Consimțământul e separat de
                termeni și îl poți retrage oricând.
              </span>
            </label>
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

/** „2001-04-19” → „19 aprilie 2001”, ca rezumatul să se citească firesc. */
function dataRomaneste(valoare: string): string {
  const data = new Date(`${valoare}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) return valoare;
  return data.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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
