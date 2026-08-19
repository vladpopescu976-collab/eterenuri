import { Resend } from "resend";

const cheie = process.env.RESEND_API_KEY?.trim();

/** Fără cheie aplicația funcționează, dar emailurile nu pleacă nicăieri. */
export const emailConfigurat = Boolean(cheie);

const resend = cheie ? new Resend(cheie) : null;

// Cu „onboarding@resend.dev” Resend livrează doar către adresa contului.
// Pentru utilizatori reali e nevoie de un domeniu verificat în Resend.
const expeditor = process.env.EMAIL_FROM?.trim() || "Scorer <onboarding@resend.dev>";

// Id-ul vine de la Resend și e singurul fir prin care se poate urmări un
// mesaj mai târziu („chiar a plecat?”), deci îl păstrăm în jurnal.
export type RezultatEmail = { trimis: true; id?: string } | { trimis: false; motiv: string };

/**
 * Nu aruncă niciodată. Un email care nu pleacă nu trebuie să șteargă contul
 * abia creat — apelantul decide ce îi spune utilizatorului, iar acesta poate
 * cere retrimiterea.
 */
export async function trimiteEmail(mesaj: {
  catre: string;
  subiect: string;
  html: string;
  text: string;
}): Promise<RezultatEmail> {
  if (!resend) {
    // În dezvoltare linkul apare în consola serverului, ca fluxul să poată fi
    // parcurs până la capăt fără cheie de Resend.
    console.warn(`[email] RESEND_API_KEY lipsește. Mesaj netrimis către ${mesaj.catre}:\n${mesaj.text}`);
    return { trimis: false, motiv: "Trimiterea emailurilor nu este configurată pe server." };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: expeditor,
      to: mesaj.catre,
      subject: mesaj.subiect,
      html: mesaj.html,
      text: mesaj.text,
    });

    if (error) {
      console.error("[email] Resend a refuzat mesajul", error);
      return { trimis: false, motiv: error.message || "Serverul de email a refuzat mesajul." };
    }
    console.info(`[email] trimis către ${mesaj.catre} (id ${data?.id ?? "necunoscut"})`);
    return { trimis: true, id: data?.id };
  } catch (eroare) {
    console.error("[email] trimitere eșuată", eroare);
    return { trimis: false, motiv: "Nu am putut contacta serverul de email." };
  }
}

/** Adresa publică a aplicației, pentru linkurile din emailuri. */
export function urlAplicatie(): string {
  const explicit = process.env.NEXTAUTH_URL?.trim() || process.env.AUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
