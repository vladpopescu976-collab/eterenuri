import SwiftUI

struct RezervarileMeleView: View {
    @Environment(Sesiune.self) private var sesiune

    @State private var rezervari: [Rezervare] = []
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var deMutat: Rezervare?
    @State private var deRecenzat: Rezervare?

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    if !sesiune.esteConectat {
                        CereCont(
                            simbol: "calendar.badge.plus",
                            titlu: "Rezervările tale, într-un loc",
                            detaliu: "Conectează-te ca să rezervi terenuri și să îți urmărești cererile."
                        )
                        .fisa()
                    } else if seIncarca {
                        ForEach(0..<2, id: \.self) { _ in ScheletFisa(inaltime: 150) }
                    } else if rezervari.isEmpty {
                        StareGoala(
                            simbol: "calendar.badge.plus",
                            titlu: "Nicio rezervare încă",
                            detaliu: "Caută un teren și trimite prima cerere."
                        )
                        .fisa()
                    } else {
                        ForEach(rezervari) { rezervare in
                            CardRezervarePersonal(
                                rezervare: rezervare,
                                muta: { deMutat = rezervare },
                                anuleaza: { Task { await actiune(rezervare, "anuleaza") } },
                                accepta: { Task { await actiune(rezervare, "accepta-mutarea") } },
                                refuza: { Task { await actiune(rezervare, "refuza-mutarea") } },
                                recenzeaza: { deRecenzat = rezervare }
                            )
                            .fisa()
                        }
                    }
                }
                .padding(.horizontal, Tema.spatiu)
                .padding(.vertical, 8)
            }
        }
        .navigationTitle("Rezervările mele")
        .refreshable { if sesiune.esteConectat { await incarca() } }
        .task { if sesiune.esteConectat { await incarca() } }
        .sheet(item: $deMutat) { rezervare in
            NavigationStack {
                MutaRezervareView(rezervare: rezervare) { Task { await incarca() } }
            }
        }
        .sheet(item: $deRecenzat) { rezervare in
            NavigationStack {
                LasaRecenzieView(rezervare: rezervare) { Task { await incarca() } }
            }
        }
        .alert("Eroare", isPresented: .init(get: { eroare != nil }, set: { if !$0 { eroare = nil } })) {
            Button("OK", role: .cancel) { eroare = nil }
        } message: {
            Text(eroare ?? "")
        }
    }

    private func incarca() async {
        do {
            rezervari = try await ApiClient.shared.cere("rezervari", ca: [Rezervare].self)
        } catch {
            eroare = error.localizedDescription
        }
        seIncarca = false
    }

    private func actiune(_ rezervare: Rezervare, _ nume: String) async {
        struct Corp: Encodable { let actiune: String }
        do {
            try await ApiClient.shared.cereFaraRaspuns(
                "rezervari/\(rezervare.id)", metoda: "PATCH", corp: Corp(actiune: nume)
            )
            await incarca()
        } catch {
            eroare = error.localizedDescription
        }
    }
}

/// Ecran-adaptor: încarcă terenul, apoi refolosește exact formularul de rezervare.
struct MutaRezervareView: View {
    let rezervare: Rezervare
    let laFinal: () -> Void

    @State private var teren: Teren?

    var body: some View {
        Group {
            if let teren {
                RezervaView(teren: teren, rezervareExistenta: rezervare, laFinal: laFinal)
            } else {
                ProgressView()
            }
        }
        .task {
            let detaliu: DetaliuTeren? = try? await ApiClient.shared.cere(
                "terenuri/\(rezervare.teren.id)", ca: DetaliuTeren.self
            )
            teren = detaliu?.teren
        }
    }
}

struct CardRezervarePersonal: View {
    let rezervare: Rezervare
    let muta: () -> Void
    let anuleaza: () -> Void
    let accepta: () -> Void
    let refuza: () -> Void
    let recenzeaza: () -> Void

    private var incheiata: Bool { rezervare.sfarsit < Date() }
    private var poateGestiona: Bool {
        !incheiata && rezervare.status != .anulata && rezervare.status != .respinsa
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(rezervare.teren.nume).font(.headline)
                    Label(rezervare.teren.oras, systemImage: "mappin.and.ellipse")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Pastila(text: rezervare.status.eticheta, culoare: rezervare.status.culoare, simbol: rezervare.status.simbol)
            }

            Text("\(rezervare.inceput.ziScurta) · \(rezervare.inceput.oraScurta)–\(rezervare.sfarsit.oraScurta)")
                .font(.subheadline)
            Text("\(Int(rezervare.pretTotal)) RON")
                .font(.footnote.monospaced()).foregroundStyle(.secondary)

            if rezervare.status == .mutarePropusa,
               let start = rezervare.inceputPropus, let sfarsit = rezervare.sfarsitPropus {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Proprietarul a propus o nouă oră")
                        .font(.caption.weight(.medium)).foregroundStyle(.blue)
                    Text("\(start.ziScurta) · \(start.oraScurta)–\(sfarsit.oraScurta)")
                        .font(.subheadline)
                    if let nota = rezervare.notaMutare, !nota.isEmpty {
                        Text(nota).font(.caption).foregroundStyle(.secondary)
                    }
                    HStack {
                        Button("Acceptă", action: accepta)
                            .buttonStyle(.borderedProminent).controlSize(.small)
                        Button("Refuză", action: refuza)
                            .buttonStyle(.bordered).controlSize(.small)
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.blue.opacity(0.08), in: .rect(cornerRadius: 10))
            }

            if let recenzie = rezervare.recenzie {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Stelute(nota: Double(recenzie.nota))
                        Text("Recenzia ta").font(.caption).foregroundStyle(.secondary)
                    }
                    if let comentariu = recenzie.comentariu, !comentariu.isEmpty {
                        Text(comentariu).font(.caption).foregroundStyle(.secondary)
                    }
                    if let raspuns = recenzie.raspunsProprietar, !raspuns.isEmpty {
                        Text("Răspuns: \(raspuns)").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Tema.fundal, in: .rect(cornerRadius: 10))
            } else if incheiata && rezervare.status == .confirmata {
                Button("Lasă o recenzie", systemImage: "star", action: recenzeaza)
                    .font(.footnote).buttonStyle(.bordered).controlSize(.small)
            }

            if poateGestiona {
                HStack {
                    Button("Modifică", systemImage: "calendar.badge.clock", action: muta)
                        .buttonStyle(.bordered).controlSize(.small)
                    Button("Anulează", systemImage: "xmark.circle", role: .destructive, action: anuleaza)
                        .buttonStyle(.bordered).controlSize(.small)
                }
                .font(.footnote)
            }
        }
            }
}

struct LasaRecenzieView: View {
    let rezervare: Rezervare
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var nota = 0
    @State private var comentariu = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    var body: some View {
        Form {
            Section("Cum a fost la \(rezervare.teren.nume)?") {
                HStack(spacing: 6) {
                    ForEach(1...5, id: \.self) { i in
                        Button {
                            nota = i
                        } label: {
                            Image(systemName: i <= nota ? "star.fill" : "star")
                                .font(.title2)
                                .foregroundStyle(i <= nota ? .yellow : .secondary.opacity(0.4))
                        }
                        .buttonStyle(.plain)
                    }
                }
                TextField("Comentariu (opțional)", text: $comentariu, axis: .vertical)
                    .lineLimit(2...5)
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                Button {
                    trimite()
                } label: {
                    HStack { Spacer(); Text("Trimite recenzia").fontWeight(.semibold); Spacer() }
                }
                .disabled(nota < 1 || seTrimite)
                .listRowBackground(nota < 1 ? Color.gray.opacity(0.3) : Tema.accent)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Recenzie")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func trimite() {
        struct Corp: Encodable {
            let rezervareId: String
            let nota: Int
            let comentariu: String?
        }
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "recenzii",
                    metoda: "POST",
                    corp: Corp(
                        rezervareId: rezervare.id,
                        nota: nota,
                        comentariu: comentariu.isEmpty ? nil : comentariu
                    )
                )
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
