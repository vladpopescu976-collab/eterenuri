/**
 * Orașele și municipiile din România, scrise corect, cu diacritice.
 *
 * Proprietarii scriu orașul cum vor („timisoara”, „TImisoara”), iar în listele
 * publice asta arată neîngrijit. Lista de aici e sursa de adevăr: orice scriere
 * e potrivită cu ea ignorând diacriticele și majusculele, apoi se afișează
 * varianta corectă.
 */
export const ORASE_ROMANIA: readonly string[] = [
  // Alba
  "Alba Iulia", "Aiud", "Blaj", "Sebeș", "Cugir", "Ocna Mureș", "Zlatna", "Câmpeni", "Abrud", "Baia de Arieș", "Teiuș",
  // Arad
  "Arad", "Ineu", "Lipova", "Chișineu-Criș", "Curtici", "Nădlac", "Pâncota", "Pecica", "Sântana", "Sebiș",
  // Argeș
  "Pitești", "Câmpulung", "Curtea de Argeș", "Mioveni", "Costești", "Ștefănești", "Topoloveni",
  // Bacău
  "Bacău", "Onești", "Moinești", "Comănești", "Buhuși", "Dărmănești", "Slănic-Moldova", "Târgu Ocna",
  // Bihor
  "Oradea", "Salonta", "Marghita", "Beiuș", "Aleșd", "Valea lui Mihai", "Ștei", "Nucet", "Vașcău", "Săcueni",
  // Bistrița-Năsăud
  "Bistrița", "Năsăud", "Beclean", "Sângeorz-Băi",
  // Botoșani
  "Botoșani", "Dorohoi", "Darabani", "Săveni", "Ștefănești", "Bucecea", "Flămânzi",
  // Brașov
  "Brașov", "Făgăraș", "Săcele", "Zărnești", "Codlea", "Râșnov", "Rupea", "Victoria", "Predeal", "Ghimbav",
  // Brăila
  "Brăila", "Ianca", "Însurăței", "Făurei",
  // București
  "București",
  // Buzău
  "Buzău", "Râmnicu Sărat", "Nehoiu", "Pogoanele", "Pătârlagele",
  // Caraș-Severin
  "Reșița", "Caransebeș", "Bocșa", "Oravița", "Moldova Nouă", "Oțelu Roșu", "Anina", "Băile Herculane",
  // Călărași
  "Călărași", "Oltenița", "Budești", "Lehliu Gară", "Fundulea",
  // Cluj
  "Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla", "Huedin",
  // Constanța
  "Constanța", "Medgidia", "Mangalia", "Năvodari", "Cernavodă", "Ovidiu", "Hârșova", "Eforie", "Techirghiol", "Murfatlar", "Basarabi", "Negru Vodă",
  // Covasna
  "Sfântu Gheorghe", "Târgu Secuiesc", "Covasna", "Baraolt", "Întorsura Buzăului",
  // Dâmbovița
  "Târgoviște", "Moreni", "Pucioasa", "Găești", "Titu", "Fieni", "Răcari",
  // Dolj
  "Craiova", "Băilești", "Calafat", "Filiași", "Segarcea", "Dăbuleni", "Bechet",
  // Galați
  "Galați", "Tecuci", "Târgu Bujor", "Berești",
  // Giurgiu
  "Giurgiu", "Bolintin-Vale", "Mihăilești",
  // Gorj
  "Târgu Jiu", "Motru", "Rovinari", "Târgu Cărbunești", "Novaci", "Bumbești-Jiu", "Turceni", "Țicleni",
  // Harghita
  "Miercurea Ciuc", "Odorheiu Secuiesc", "Gheorgheni", "Toplița", "Cristuru Secuiesc", "Bălan", "Băile Tușnad", "Borsec", "Vlăhița",
  // Hunedoara
  "Deva", "Hunedoara", "Petroșani", "Lupeni", "Vulcan", "Orăștie", "Brad", "Simeria", "Călan", "Hațeg", "Petrila", "Uricani", "Aninoasa", "Geoagiu",
  // Ialomița
  "Slobozia", "Fetești", "Urziceni", "Țăndărei", "Amara", "Căzănești", "Fierbinți-Târg",
  // Iași
  "Iași", "Pașcani", "Hârlău", "Târgu Frumos", "Podu Iloaiei",
  // Ilfov
  "Buftea", "Otopeni", "Voluntari", "Pantelimon", "Popești-Leordeni", "Bragadiru", "Chitila", "Măgurele",
  // Maramureș
  "Baia Mare", "Sighetu Marmației", "Borșa", "Baia Sprie", "Vișeu de Sus", "Târgu Lăpuș", "Seini", "Cavnic", "Ulmeni", "Dragomirești", "Săliștea de Sus", "Șomcuta Mare", "Tăuții-Măgherăuș",
  // Mehedinți
  "Drobeta-Turnu Severin", "Orșova", "Strehaia", "Vânju Mare", "Baia de Aramă",
  // Mureș
  "Târgu Mureș", "Reghin", "Sighișoara", "Târnăveni", "Luduș", "Iernut", "Sovata", "Sărmașu", "Miercurea Nirajului", "Ungheni",
  // Neamț
  "Piatra Neamț", "Roman", "Târgu Neamț", "Bicaz", "Roznov",
  // Olt
  "Slatina", "Caracal", "Balș", "Corabia", "Scornicești", "Drăgănești-Olt", "Piatra-Olt", "Potcoava",
  // Prahova
  "Ploiești", "Câmpina", "Băicoi", "Mizil", "Bușteni", "Sinaia", "Breaza", "Comarnic", "Vălenii de Munte", "Boldești-Scăeni", "Plopeni", "Slănic", "Urlați", "Azuga",
  // Satu Mare
  "Satu Mare", "Carei", "Negrești-Oaș", "Tășnad", "Livada", "Ardud",
  // Sălaj
  "Zalău", "Șimleu Silvaniei", "Jibou", "Cehu Silvaniei",
  // Sibiu
  "Sibiu", "Mediaș", "Cisnădie", "Agnita", "Avrig", "Dumbrăveni", "Copșa Mică", "Ocna Sibiului", "Săliște", "Tălmaciu", "Miercurea Sibiului",
  // Suceava
  "Suceava", "Fălticeni", "Rădăuți", "Câmpulung Moldovenesc", "Vatra Dornei", "Gura Humorului", "Siret", "Solca", "Vicovu de Sus", "Broșteni", "Cajvana", "Dolhasca", "Frasin", "Liteni", "Milișăuți", "Salcea",
  // Teleorman
  "Alexandria", "Roșiori de Vede", "Turnu Măgurele", "Zimnicea", "Videle",
  // Timiș
  "Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia", "Buziaș", "Deta", "Făget", "Recaș", "Ciacova", "Gătaia",
  // Tulcea
  "Tulcea", "Măcin", "Babadag", "Isaccea", "Sulina",
  // Vaslui
  "Vaslui", "Bârlad", "Huși", "Negrești", "Murgeni",
  // Vâlcea
  "Râmnicu Vâlcea", "Drăgășani", "Băbeni", "Băile Govora", "Băile Olănești", "Bălcești", "Berbești", "Brezoi", "Călimănești", "Horezu", "Ocnele Mari",
  // Vrancea
  "Focșani", "Adjud", "Mărășești", "Odobești", "Panciu",
];

/** Textul fără diacritice, cu litere mici — cheia după care potrivim scrierile. */
export function cheieOras(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // ș și ț sunt uneori scrise cu sedilă în loc de virgulă; le tratăm la fel.
    .replace(/[şŞ]/g, "s")
    .replace(/[ţŢ]/g, "t")
    .toLowerCase()
    .replace(/[\s\-']+/g, " ")
    .trim();
}

const dupaCheie = new Map(ORASE_ROMANIA.map((oras) => [cheieOras(oras), oras]));

/**
 * Varianta corectă a unui oraș scris oricum. Dacă nu e în listă (sat, comună,
 * greșeală de scriere), întoarce textul cu prima literă mare, ca măcar să arate
 * îngrijit.
 */
export function normalizeazaOras(text: string): string {
  const curatat = text.trim();
  if (!curatat) return curatat;

  const cunoscut = dupaCheie.get(cheieOras(curatat));
  if (cunoscut) return cunoscut;

  return curatat
    .split(/\s+/)
    .map((cuvant) =>
      cuvant.length <= 2 && cuvant.toLowerCase() === cuvant
        ? cuvant.toLowerCase()
        : cuvant.charAt(0).toLocaleUpperCase("ro-RO") + cuvant.slice(1).toLocaleLowerCase("ro-RO")
    )
    .join(" ");
}
