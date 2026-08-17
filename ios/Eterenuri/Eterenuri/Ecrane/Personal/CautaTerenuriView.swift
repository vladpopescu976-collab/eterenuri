import SwiftUI

struct CautaTerenuriView: View {
    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true
    @State private var eroare: String?

    @State private var oras = ""
    @State private var sportAles: Sport?
    @State private var pretMax: Double = 0
    @State private var ziAleasa: Date?
    @State private var oraDeLa: Int?
    @State private var durataOre = 1
    @State private var arataFiltre = false

    private var filtreActive: Int {
        [!oras.isEmpty, pretMax > 0, ziAleasa != nil, sportAles != nil, oraDeLa != nil]
            .filter { $0 }.count
    }

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            continut
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: String.self) { DetaliuTerenView(terenId: $0) }
        .sheet(isPresented: $arataFiltre) {
            NavigationStack {
                FiltreView(
                    oras: $oras,
                    sportAles: $sportAles,
                    pretMax: $pretMax,
                    ziAleasa: $ziAleasa,
                    oraDeLa: $oraDeLa,
                    durataOre: $durataOre
                ) { Task { await incarca() } }
            }
            .presentationDetents([.large])
        }
        .refreshable { await incarca() }
        .task {
            await incarca()
            #if DEBUG
            // Deschide panoul de filtre la pornire, pentru verificări automate.
            if ProcessInfo.processInfo.environment["ETERENURI_FILTRE"] == "1" {
                arataFiltre = true
            }
            #endif
        }
    }

    private var continut: some View {
        ScrollView {
            LazyVStack(spacing: 0, pinnedViews: .sectionHeaders) {
                Section {
                    lista
                        .padding(.horizontal, 20)
                        .padding(.top, 18)
                        .padding(.bottom, 20)
                } header: {
                    antet
                }
            }
        }
    }

    // MARK: - Antet: căutare + categorii

    private var antet: some View {
        VStack(spacing: 16) {
            baraDeCautare
            categorii
        }
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(.regularMaterial)
    }

    /// Un singur loc, evident, în care începe căutarea.
    private var baraDeCautare: some View {
        Button {
            arataFiltre = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tema.accent)

                VStack(alignment: .leading, spacing: 1) {
                    Text(oras.isEmpty ? "Caută un teren" : oras)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(subtitluCautare)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                ZStack(alignment: .topTrailing) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(width: 36, height: 36)
                        .background(Tema.fundal, in: .circle)
                    if filtreActive > 0 {
                        Circle()
                            .fill(Tema.accent)
                            .frame(width: 9, height: 9)
                            .offset(x: 1, y: -1)
                    }
                }
            }
            .padding(.vertical, 9)
            .padding(.leading, 18)
            .padding(.trailing, 9)
            .background(Tema.fisa, in: .capsule)
            .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 20)
    }

    private var subtitluCautare: String {
        var bucati: [String] = []
        if let sportAles { bucati.append(sportAles.eticheta) }
        if let ziAleasa { bucati.append(ziAleasa.ziScurta) }
        if let oraDeLa {
            bucati.append(String(format: "%02d–%02d", oraDeLa, oraDeLa + durataOre))
        }
        if pretMax > 0 { bucati.append("sub \(Int(pretMax)) RON") }
        return bucati.isEmpty ? "Oriunde · oricând" : bucati.joined(separator: " · ")
    }

    private var categorii: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 26) {
                Categorie(simbol: "square.grid.2x2", eticheta: "Toate", activ: sportAles == nil) {
                    sportAles = nil
                    Task { await incarca() }
                }
                ForEach(Sport.allCases, id: \.self) { sport in
                    Categorie(simbol: sport.simbol, eticheta: sport.eticheta, activ: sportAles == sport) {
                        sportAles = sportAles == sport ? nil : sport
                        Task { await incarca() }
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }

    // MARK: - Lista

    @ViewBuilder
    private var lista: some View {
        if seIncarca {
            schelete
        } else if let eroare {
            stareEroare(eroare)
        } else if terenuri.isEmpty {
            stareFaraRezultate
        } else {
            rezultate
        }
    }

    private var schelete: some View {
        VStack(spacing: 26) {
            ForEach(0..<3, id: \.self) { _ in ScheletFisa(inaltime: 300) }
        }
    }

    private func stareEroare(_ mesaj: String) -> some View {
        StareGoala(
            simbol: "wifi.exclamationmark",
            titlu: "Nu am putut încărca",
            detaliu: mesaj,
            titluActiune: "Încearcă din nou",
            actiune: { Task { await incarca() } }
        )
    }

    private var stareFaraRezultate: some View {
        let areFiltre: Bool = filtreActive > 0 || sportAles != nil
        let detaliu: String = areFiltre
            ? "Încearcă alt sport sau scoate câteva filtre."
            : "Deocamdată nu există terenuri publicate."
        let titluActiune: String? = areFiltre ? "Șterge filtrele" : nil
        let actiune: (() -> Void)? = areFiltre ? { self.stergeFiltrele() } : nil

        return StareGoala(
            simbol: "magnifyingglass",
            titlu: "Niciun teren găsit",
            detaliu: detaliu,
            titluActiune: titluActiune,
            actiune: actiune
        )
    }

    private var rezultate: some View {
        VStack(spacing: 28) {
            HStack {
                Text("\(terenuri.count) \(terenuri.count == 1 ? "teren disponibil" : "terenuri disponibile")")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            ForEach(terenuri) { teren in
                NavigationLink(value: teren.id) { CardTeren(teren: teren) }
                    .buttonStyle(.plain)
            }
        }
    }

    private func stergeFiltrele() {
        oras = ""; sportAles = nil; pretMax = 0; ziAleasa = nil; oraDeLa = nil; durataOre = 1
        Task { await incarca() }
    }

    private func incarca() async {
        if terenuri.isEmpty { seIncarca = true }
        eroare = nil

        var parametri: [String: String] = [:]
        if !oras.trimmingCharacters(in: .whitespaces).isEmpty { parametri["oras"] = oras }
        if let sportAles { parametri["sport"] = sportAles.rawValue }
        if pretMax > 0 { parametri["pretMax"] = String(Int(pretMax)) }
        if let ziAleasa { parametri["zi"] = ZiApi.text(ziAleasa) }
        if ziAleasa != nil, let oraDeLa {
            parametri["oraDeLa"] = String(oraDeLa)
            parametri["oraPanaLa"] = String(oraDeLa + durataOre)
        }

        do {
            terenuri = try await ApiClient.shared.cere("terenuri", parametri: parametri, ca: [Teren].self)
        } catch {
            eroare = error.localizedDescription
        }
        seIncarca = false
    }
}

private struct Categorie: View {
    let simbol: String
    let eticheta: String
    let activ: Bool
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            VStack(spacing: 7) {
                Image(systemName: simbol).font(.system(size: 19))
                Text(eticheta)
                    .font(.caption2.weight(activ ? .semibold : .regular))
                    .fixedSize()
                // Sublinierea marchează categoria activă, fără să adauge culoare.
                Rectangle()
                    .fill(activ ? Color.primary : .clear)
                    .frame(height: 2)
            }
            .foregroundStyle(activ ? .primary : .secondary)
        }
        .buttonStyle(.plain)
    }
}

/// Poză mare, informații pe rânduri clare, mult aer între carduri.
struct CardTeren: View {
    let teren: Teren

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack(alignment: .topTrailing) {
                PozaTeren(cale: teren.poze.first, sport: teren.sport)
                    .frame(height: 210)
                    .frame(maxWidth: .infinity)
                    .clipped()
                    .clipShape(.rect(cornerRadius: Tema.razaFisa, style: .continuous))

                if teren.favorit {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(.black.opacity(0.28), in: .circle)
                        .padding(12)
                }
            }
            .shadow(color: .black.opacity(0.10), radius: 14, x: 0, y: 6)

            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(teren.nume).font(.headline).lineLimit(1)
                    Spacer(minLength: 0)
                    if let nota = teren.notaMedie {
                        HStack(spacing: 3) {
                            Image(systemName: "star.fill").font(.system(size: 11))
                            Text(String(format: "%.1f", nota)).font(.subheadline.weight(.medium))
                        }
                    }
                }

                Text("\(teren.sport.eticheta) · \(teren.oras)")
                    .font(.subheadline).foregroundStyle(.secondary)

                Text("Deschis \(String(format: "%02d", teren.oraDeschidere)):00 – \(String(format: "%02d", teren.oraInchidere)):00")
                    .font(.subheadline).foregroundStyle(.secondary)

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(Int(teren.pretPeOra)) RON").font(.subheadline.weight(.semibold))
                    Text("/ oră").font(.subheadline).foregroundStyle(.secondary)
                }
                .padding(.top, 2)
            }
        }
    }
}
