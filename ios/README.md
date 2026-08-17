# Eterenuri — aplicația iOS

Aplicație nativă SwiftUI care folosește același backend ca site-ul, prin API-ul
JSON de sub `/api/mobil`.

## Cum o pornești

1. Pornește backendul: `npm run dev` în rădăcina proiectului.
2. Deschide `ios/Eterenuri/Eterenuri.xcodeproj` în Xcode.
3. Alege un simulator de iPhone și rulează (⌘R).

Adresa implicită este `http://127.0.0.1:3000` și merge direct în simulator.

**Nu folosi `localhost`.** Se rezolvă întâi la `::1`, iar în simulator asta
înseamnă loopback-ul dispozitivului simulat, nu al Mac-ului: cererile expiră
pur și simplu, fără vreun mesaj care să spună de ce.

## Pe un iPhone real

Pe telefon, `127.0.0.1` înseamnă telefonul însuși, nu calculatorul.

Adresa se schimbă **din aplicație**, fără recompilare: butonul **Server** din
colțul din dreapta sus al ecranului de autentificare. Pune acolo adresa
calculatorului în rețea — cea afișată de `npm run dev` la „Network” — și apasă
„Testează conexiunea”.

Adresa se schimbă la fiecare rețea nouă, de aceea e o setare și nu o constantă.
Valoarea implicită vine din `EterenuriApiURL` în `ios/Eterenuri/Info.plist`.

La prima conectare, iOS cere permisiunea „Rețea locală” — trebuie acceptată,
altfel cererile sunt blocate în tăcere. Calculatorul și telefonul trebuie să fie
în aceeași rețea.

Pentru producție folosește **https**, iar excepția `NSAllowsLocalNetworking`
din Info.plist poate fi scoasă.

## Testare

Build-urile de dezvoltare acceptă variabila `ETERENURI_TOKEN`, care pornește
aplicația deja conectată — utilă pentru verificări automate, fără a trece prin
tastatură. Nu există în build-ul final.

```bash
SIMCTL_CHILD_ETERENURI_TOKEN="<token>" xcrun simctl launch booted ro.eterenuri.app
```

Alte variabile, tot doar în dezvoltare:

| Variabilă | Ce face |
|---|---|
| `ETERENURI_TOKEN` | pornește aplicația conectată |
| `ETERENURI_TAB` | ecranul de start pentru Business (`calendar`, `rezervari`, …) |
| `ETERENURI_FILTRE=1` | deschide panoul de filtre |
| `ETERENURI_REZERVA=<id teren>` | deschide direct ecranul de rezervare |
| `ETERENURI_ORA=<oră>` | preselectează ora de început |

## Structura

```
Eterenuri/
  Config.swift          adresa backendului
  Retea/
    Modele.swift        structurile întoarse de API
    ApiClient.swift     un singur loc pentru cereri, token și erori
  Stare/
    Sesiune.swift       cine e conectat; tokenul stă în Keychain
  Ecrane/
    Autentificare/      alegerea rolului, login și înregistrare
    Personal/           căutare, detaliu teren, rezervare, favorite, recenzii
    Business/           statistici, rezervări, terenuri, blocări, recenzii
  Componente/           bucăți de interfață folosite în mai multe ecrane
```

Proiectul folosește un *synchronized folder group*, deci fișierele Swift noi
puse în `Eterenuri/` intră automat în build — nu trebuie adăugate manual.

## Autentificarea

Site-ul folosește cookie de sesiune NextAuth, care nu e potrivit pentru o
aplicație nativă. API-ul mobil emite în schimb un JWT semnat cu același
`AUTH_SECRET`, trimis ca `Authorization: Bearer …` și păstrat în Keychain.

## Ce acoperă

**Personal:** căutare cu filtre pe sport și oraș, detaliul terenului cu recenzii,
rezervare cu orele ocupate marcate, favorite, rezervările proprii cu anulare,
modificare și recenzie după meci.

**Business:** privire de ansamblu cu venit, grad de ocupare și orele cele mai
cerute, rezervările primite cu aprobare/respingere/propunere de altă oră,
terenurile proprii cu blocarea manuală a orelor, recenzii cu răspuns.

**Neacoperit încă:** adăugarea și editarea completă a unui teren (inclusiv
pozele) se fac deocamdată din aplicația web.
