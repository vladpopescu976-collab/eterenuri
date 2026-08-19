import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { trimiteEmail, urlAplicatie } from "@/lib/email";
import { sablon, type Rand } from "@/lib/emailuri/sablon";
import { APP_TIME_ZONE } from "@/lib/datetime";

/**
 * Anunțurile despre rezervări.
 *
 * Regula peste tot aici: un email care nu pleacă nu trebuie să strice acțiunea
 * care l-a declanșat. O rezervare confirmată rămâne confirmată chiar dacă
 * serverul de email e picat, așa că totul e prins în try/catch și trimis prin
 * `after`, adică după ce răspunsul a plecat deja spre utilizator.
 */
export type EvenimentRezervare =
  | "cerere-noua"
  | "aprobata"
  | "respinsa"
  | "anulata-de-client"
  | "mutata-de-client"
  | "mutare-propusa"
  | "mutare-acceptata"
  | "mutare-refuzata";

const formatData = new Intl.DateTimeFormat("ro-RO", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const formatOra = new Intl.DateTimeFormat("ro-RO", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function interval(inceput: Date, sfarsit: Date): string {
  return `${formatOra.format(inceput)} – ${formatOra.format(sfarsit)}`;
}

function ziua(data: Date): string {
  const text = formatData.format(data);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Trimite anunțul potrivit evenimentului, după ce răspunsul a plecat.
 * Nu aruncă niciodată.
 */
export function anuntaRezervare(bookingId: string, eveniment: EvenimentRezervare): void {
  after(async () => {
    try {
      await trimiteAnuntul(bookingId, eveniment);
    } catch (eroare) {
      console.error(`[email:rezervare:${eveniment}] ${bookingId}`, eroare);
    }
  });
}

/**
 * Aceleași mesaje, dar trimise pe loc.
 *
 * E nevoie de varianta asta când rezervarea urmează să dispară: după ștergerea
 * unui cont, `after` ar rula când rândurile nu mai există și n-ar mai avea ce
 * citi. Tot nu aruncă — un email eșuat nu trebuie să oprească ștergerea.
 */
export async function anuntaRezervareAcum(
  bookingId: string,
  eveniment: EvenimentRezervare
): Promise<void> {
  try {
    await trimiteAnuntul(bookingId, eveniment);
  } catch (eroare) {
    console.error(`[email:rezervare:${eveniment}] ${bookingId}`, eroare);
  }
}

async function trimiteAnuntul(bookingId: string, eveniment: EvenimentRezervare) {
  const rezervare = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      field: {
        select: {
          name: true,
          city: true,
          address: true,
          contactPhone: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!rezervare) return;

  const baza = urlAplicatie();
  const { customer, field } = rezervare;

  // Intervalul propus contează doar la mesajul despre propunere; în rest
  // vorbim mereu despre ora din rezervare.
  const arataPropunerea = eveniment === "mutare-propusa" && rezervare.proposedStartTime && rezervare.proposedEndTime;

  const inceput = arataPropunerea ? rezervare.proposedStartTime! : rezervare.startTime;
  const sfarsit = arataPropunerea ? rezervare.proposedEndTime! : rezervare.endTime;

  const detalii: Rand[] = [
    { eticheta: "Teren", valoare: field.name },
    { eticheta: "Ziua", valoare: ziua(inceput) },
    { eticheta: "Ora", valoare: interval(inceput, sfarsit) },
    { eticheta: "Locul", valoare: `${field.address}, ${field.city}` },
  ];

  const catreProprietar = {
    catre: field.owner.email,
    salut: field.owner.name,
    link: `${baza}/dashboard/business/rezervari`,
    textLink: "Vezi rezervările",
  };
  const catreClient = {
    catre: customer.email,
    salut: customer.name,
    link: `${baza}/rezervarile-mele`,
    textLink: "Vezi rezervarea",
  };

  const mesaje: Record<
    EvenimentRezervare,
    {
      destinatar: typeof catreClient;
      subiect: string;
      titlu: string;
      paragrafe: string[];
      randuri: Rand[];
      incheiere?: string;
    }
  > = {
    "cerere-noua": {
      destinatar: catreProprietar,
      subiect: `Cerere nouă de rezervare — ${field.name}`,
      titlu: "Ai o cerere nouă de rezervare",
      paragrafe: [
        `${customer.name} vrea să rezerve ${field.name}. Cererea așteaptă răspunsul tău.`,
        ...(rezervare.notes ? [`Mesajul clientului: „${rezervare.notes}”`] : []),
      ],
      randuri: [
        ...detalii,
        { eticheta: "Client", valoare: customer.name },
        ...(customer.phone ? [{ eticheta: "Telefon", valoare: customer.phone }] : []),
        { eticheta: "Total", valoare: `${Number(rezervare.totalPrice)} RON` },
      ],
      incheiere: "Până nu o aprobi, intervalul rămâne blocat pentru alți clienți.",
    },
    aprobata: {
      destinatar: catreClient,
      subiect: `Rezervarea ta la ${field.name} a fost confirmată`,
      titlu: "Rezervarea ta este confirmată",
      paragrafe: [`${field.owner.name} ți-a confirmat rezervarea. Ne vedem pe teren.`],
      randuri: [
        ...detalii,
        ...(field.contactPhone ? [{ eticheta: "Telefon teren", valoare: field.contactPhone }] : []),
        { eticheta: "Total", valoare: `${Number(rezervare.totalPrice)} RON` },
      ],
    },
    respinsa: {
      destinatar: catreClient,
      subiect: `Rezervarea ta la ${field.name} a fost respinsă`,
      titlu: "Rezervarea nu a putut fi acceptată",
      paragrafe: [
        `${field.owner.name} nu a putut accepta rezervarea pentru intervalul cerut. Nu ți se reține nimic.`,
        "Poți încerca alt interval — orele libere se văd în pagina terenului.",
      ],
      randuri: detalii,
    },
    "anulata-de-client": {
      destinatar: catreProprietar,
      subiect: `Rezervare anulată — ${field.name}`,
      titlu: "O rezervare a fost anulată",
      paragrafe: [`${customer.name} și-a anulat rezervarea. Intervalul este din nou liber.`],
      randuri: [...detalii, { eticheta: "Client", valoare: customer.name }],
    },
    "mutata-de-client": {
      destinatar: catreProprietar,
      subiect: `Rezervare mutată — ${field.name}`,
      titlu: "O rezervare a fost mutată",
      paragrafe: [`${customer.name} și-a mutat rezervarea. Mai jos e intervalul nou.`],
      randuri: [...detalii, { eticheta: "Client", valoare: customer.name }],
    },
    "mutare-propusa": {
      destinatar: catreClient,
      subiect: `Propunere de alt interval — ${field.name}`,
      titlu: "Ți se propune alt interval",
      paragrafe: [
        `${field.owner.name} nu are liber la ora cerută și îți propune intervalul de mai jos.`,
        ...(rezervare.rescheduleNote ? [`Mesaj: „${rezervare.rescheduleNote}”`] : []),
        "Intră în cont ca să accepți sau să refuzi propunerea.",
      ],
      randuri: detalii,
    },
    "mutare-acceptata": {
      destinatar: catreProprietar,
      subiect: `Propunerea a fost acceptată — ${field.name}`,
      titlu: "Clientul a acceptat noul interval",
      paragrafe: [`${customer.name} a acceptat intervalul propus. Rezervarea este confirmată.`],
      randuri: [...detalii, { eticheta: "Client", valoare: customer.name }],
    },
    "mutare-refuzata": {
      destinatar: catreProprietar,
      subiect: `Propunerea a fost refuzată — ${field.name}`,
      titlu: "Clientul a refuzat noul interval",
      paragrafe: [
        `${customer.name} a refuzat intervalul propus, iar rezervarea a fost anulată.`,
      ],
      randuri: [...detalii, { eticheta: "Client", valoare: customer.name }],
    },
  };

  const mesaj = mesaje[eveniment];
  const { html, text } = sablon({
    titlu: mesaj.titlu,
    salut: mesaj.destinatar.salut,
    paragrafe: mesaj.paragrafe,
    randuri: mesaj.randuri,
    actiune: { text: mesaj.destinatar.textLink, link: mesaj.destinatar.link },
    incheiere: mesaj.incheiere,
  });

  await trimiteEmail({
    catre: mesaj.destinatar.catre,
    subiect: mesaj.subiect,
    html,
    text,
  });
}
