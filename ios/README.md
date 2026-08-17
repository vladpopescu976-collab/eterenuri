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

Telefonul nu vede loopback-ul Mac-ului. Schimbă `EterenuriApiURL` din
`ios/Eterenuri/Info.plist` cu adresa Mac-ului în rețea (o vezi la pornirea lui
`next dev`, ex. `http://192.168.1.130:3000`) sau cu adresa de producție.

Pentru producție folosește **https**, iar excepția `NSAllowsLocalNetworking`
din Info.plist poate fi scoasă.

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
