/**
 * Paginile informative și legale.
 *
 * Textele descriu ce face efectiv aplicația azi — ce date sunt colectate, cine
 * le vede, ce se întâmplă la o rezervare. Nu sunt scrise de un jurist: înainte
 * de lansare trebuie verificate de cineva care se pricepe, mai ales partea de
 * date personale și cea de răspundere.
 */
export type Sectiune = {
  titlu: string;
  paragrafe: string[];
  lista?: string[];
};

export type Pagina = {
  titlu: string;
  actualizat?: string;
  sectiuni: Sectiune[];
};

const ACTUALIZAT = "18 august 2026";

export const PAGINI: Record<string, Pagina> = {
  "despre-noi": {
    titlu: "Despre noi",
    sectiuni: [
      {
        titlu: "Ce este Eterenuri",
        paragrafe: [
          "Eterenuri este o platformă prin care găsești terenuri sportive libere și le rezervi direct, fără telefoane și mesaje.",
          "Proprietarii de baze sportive își publică terenurile, își văd orarul într-un singur loc și răspund cererilor de rezervare.",
        ],
      },
      {
        titlu: "Cum funcționează",
        paragrafe: ["Pentru jucători, în trei pași:"],
        lista: [
          "Cauți după sport, oraș, zi și interval orar.",
          "Vezi ce ore sunt libere pe terenul ales și trimiți o cerere.",
          "Proprietarul confirmă, iar rezervarea apare în contul tău.",
        ],
      },
      {
        titlu: "Pentru proprietari",
        paragrafe: [
          "Îți publici terenurile cu poze, program și preț, primești cereri și le confirmi dintr-un calendar săptămânal.",
          "Poți bloca ore pentru mentenanță și poți nota rezervările primite la telefon, ca să nu apară suprapuneri.",
        ],
      },
    ],
  },

  contact: {
    titlu: "Contact",
    sectiuni: [
      {
        titlu: "Scrie-ne",
        paragrafe: [
          "Pentru întrebări, probleme tehnice sau propuneri, scrie la contact@eterenuri.ro. Răspundem în cel mult două zile lucrătoare.",
        ],
      },
      {
        titlu: "Ai un teren și vrei să îl publici",
        paragrafe: [
          "Îți poți crea singur un cont Business din pagina de autentificare și îți adaugi terenurile imediat. Dacă ai mai multe baze sportive și vrei ajutor la configurare, scrie-ne.",
        ],
      },
      {
        titlu: "Probleme cu o rezervare",
        paragrafe: [
          "Rezervările se fac direct între tine și proprietarul terenului. Datele de contact ale terenului sunt pe pagina lui, iar pentru situații pe care nu le puteți rezolva între voi ne poți scrie.",
        ],
      },
    ],
  },

  "termeni-si-conditii": {
    titlu: "Termeni și condiții",
    actualizat: ACTUALIZAT,
    sectiuni: [
      {
        titlu: "1. Ce este acest serviciu",
        paragrafe: [
          "Eterenuri este o platformă care pune în legătură persoane care caută terenuri sportive cu proprietarii acestora.",
          "Eterenuri nu deține și nu administrează terenurile publicate. Contractul de închiriere se încheie între tine și proprietarul terenului.",
        ],
      },
      {
        titlu: "2. Conturi",
        paragrafe: [
          "Pentru a rezerva ai nevoie de un cont Personal. Pentru a publica terenuri ai nevoie de un cont Business.",
          "Ești responsabil pentru datele pe care le introduci și pentru păstrarea parolei. Ne poți anunța oricând dacă bănuiești că altcineva ți-a folosit contul.",
        ],
      },
      {
        titlu: "3. Rezervări",
        paragrafe: [
          "O cerere de rezervare nu este confirmată automat: devine fermă doar după ce proprietarul o acceptă.",
          "Poți anula sau modifica o rezervare din contul tău, cât timp nu s-a consumat. Proprietarul îți poate propune o altă oră, pe care o poți accepta sau refuza.",
          "Plata se face direct la teren. Platforma nu procesează plăți.",
        ],
      },
      {
        titlu: "4. Obligațiile proprietarilor",
        paragrafe: ["Dacă publici terenuri, te angajezi să:"],
        lista: [
          "publici informații corecte despre teren, program și preț;",
          "răspunzi cererilor de rezervare într-un timp rezonabil;",
          "respecți rezervările confirmate;",
          "anunți din timp dacă terenul devine indisponibil.",
        ],
      },
      {
        titlu: "5. Conținut publicat",
        paragrafe: [
          "Pozele, descrierile și recenziile rămân ale celor care le publică. Prin publicare ne dai dreptul să le afișăm în cadrul platformei.",
          "Putem elimina conținut care încalcă legea, care induce în eroare sau care este ofensator.",
        ],
      },
      {
        titlu: "6. Recenzii",
        paragrafe: [
          "O recenzie poate fi lăsată doar pentru o rezervare confirmată și încheiată, ca notele să vină de la oameni care chiar au jucat acolo.",
          "Proprietarul poate răspunde public la recenzii.",
        ],
      },
      {
        titlu: "7. Răspundere",
        paragrafe: [
          "Nu răspundem pentru starea terenurilor, pentru accidentări sau pentru neînțelegeri între jucători și proprietari.",
          "Facem tot ce ține de noi ca platforma să fie disponibilă, dar nu putem garanta funcționarea neîntreruptă.",
        ],
      },
      {
        titlu: "8. Modificări",
        paragrafe: [
          "Putem actualiza acești termeni. Modificările importante vor fi anunțate în aplicație înainte să intre în vigoare.",
        ],
      },
    ],
  },

  "politica-de-confidentialitate": {
    titlu: "Politica de confidențialitate",
    actualizat: ACTUALIZAT,
    sectiuni: [
      {
        titlu: "Ce date colectăm",
        paragrafe: ["Colectăm doar datele de care avem nevoie ca platforma să funcționeze:"],
        lista: [
          "la crearea contului: nume, adresă de email, parolă (păstrată doar criptată) și, opțional, număr de telefon;",
          "la publicarea unui teren: numele terenului, adresa, orașul, programul, prețul, pozele și un telefon de contact;",
          "la o rezervare: terenul, data, intervalul orar și eventualele observații scrise de tine;",
          "la autentificările eșuate: adresa IP, păstrată cel mult 15 minute, ca să oprim încercările repetate de ghicire a parolei.",
        ],
      },
      {
        titlu: "Cine vede datele tale",
        paragrafe: [
          "Când trimiți o cerere de rezervare, proprietarul terenului îți vede numele și, dacă l-ai completat, numărul de telefon — are nevoie de ele ca să te poată contacta.",
          "Recenziile sunt publice și apar cu numele tău pe pagina terenului.",
          "Nu vindem datele nimănui și nu le folosim pentru publicitate.",
        ],
      },
      {
        titlu: "Unde sunt păstrate",
        paragrafe: [
          "Datele stau într-o bază de date găzduită în Uniunea Europeană. Pozele terenurilor sunt păstrate separat, într-un spațiu de stocare privat, și se servesc prin platformă.",
        ],
      },
      {
        titlu: "Cât timp le păstrăm",
        paragrafe: [
          "Datele contului se păstrează cât timp contul există. Rezervările rămân în istoric ca ambele părți să le poată consulta.",
          "Când îți ștergi contul, se șterg odată cu el rezervările, favoritele și recenziile tale.",
        ],
      },
      {
        titlu: "Drepturile tale",
        paragrafe: [
          "Poți cere oricând să vezi ce date avem despre tine, să le corectezi sau să le ștergem. Scrie la contact@eterenuri.ro.",
          "Ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal.",
        ],
      },
    ],
  },

  "politica-cookie-uri": {
    titlu: "Politica cookie-uri",
    actualizat: ACTUALIZAT,
    sectiuni: [
      {
        titlu: "Ce folosim",
        paragrafe: [
          "Folosim un singur cookie, cel care ține minte că ești conectat. Fără el ar trebui să introduci parola la fiecare pagină.",
          "Nu folosim cookie-uri de publicitate și nu urmărim ce faci pe alte site-uri.",
        ],
      },
      {
        titlu: "Analiză",
        paragrafe: [
          "În acest moment nu folosim niciun instrument de analiză a traficului. Dacă vom adăuga unul, vom actualiza această pagină și vom cere acordul tău înainte.",
        ],
      },
      {
        titlu: "Cum le controlezi",
        paragrafe: [
          "Poți șterge cookie-urile din setările browserului. Dacă ștergi cookie-ul de autentificare, vei fi deconectat.",
        ],
      },
    ],
  },
};

export function listaPagini(): string[] {
  return Object.keys(PAGINI);
}
