import SwiftUI

struct CautaTerenuriView: View {
    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true
    @State private var eroare: String?

    @State private var oras = ""
    @State private var sportAles: Sport?
    @State private var pretMax: Double = 0
    @State private var ziAleasa: Date?
    @State private var arataFiltre = false

    private var filtreActive: Int {
        [sportAles != nil, !oras.isEmpty, pretMax > 0, ziAleasa != nil].filter { $0 }.count
    }

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            continut
        }
        .navigationTitle("Terenuri")
        .navigationDestination(for: String.self) { DetaliuTerenView(terenId: $0) }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    arataFiltre = true
                } label: {
                    Image(systemName: filtreActive > 0
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "line.3.horizontal.decrease.circle")
                }
            }
        }
        .sheet(isPresented: $arataFiltre) {
            NavigationStack {
                FiltreView(
                    oras: $oras, sportAles: $sportAles, pretMax: $pretMax, ziAleasa: $ziAleasa
                ) { Task { await incarca() } }
            }
            .presentationDetents([.medium, .large])
        }
        .refreshable { await incarca() }
        .task { await incarca() }
    }

    private var continut: some View {
        ScrollView {
            VStack(spacing: 14) {
                banda
                lista
            }
            .padding(.horizontal, Tema.spatiu)
            .padding(.vertical, 8)
        }
    }

    // Împărțit în bucăți mici: într-un singur `if/else` mare, verificarea de
    // tipuri din Swift se împotmolea și compilarea eșua.
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
        ForEach(0..<3, id: \.self) { _ in ScheletFisa(inaltime: 232) }
    }

    private func stareEroare(_ mesaj: String) -> some View {
        StareGoala(
            simbol: "wifi.exclamationmark",
            titlu: "Nu am putut încărca",
            detaliu: mesaj,
            titluActiune: "Încearcă din nou",
            actiune: { Task { await incarca() } }
        )
        .fisa()
    }

    private var stareFaraRezultate: some View {
        // Tipurile sunt scrise explicit: cu ternare pe closure opțional,
        // verificarea de tipuri se blochează.
        let areFiltre: Bool = filtreActive > 0
        let detaliu: String = areFiltre
            ? "Încearcă să scoți câteva filtre."
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
        .fisa()
    }

    private var rezultate: some View {
        ForEach(terenuri) { teren in
            NavigationLink(value: teren.id) { CardTeren(teren: teren) }
                .buttonStyle(.plain)
        }
    }

    /// Rezumatul filtrelor, ca să se vadă mereu ce se caută.
    private var banda: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button { arataFiltre = true } label: {
                    Label("Filtre", systemImage: "slider.horizontal.3")
                        .font(.footnote.weight(.medium))
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Tema.fisa, in: .capsule)
                }
                .apasabil()

                if let sportAles {
                    ChipFiltru(text: sportAles.eticheta, simbol: sportAles.simbol) {
                        self.sportAles = nil; Task { await incarca() }
                    }
                }
                if !oras.isEmpty {
                    ChipFiltru(text: oras, simbol: "mappin") {
                        oras = ""; Task { await incarca() }
                    }
                }
                if pretMax > 0 {
                    ChipFiltru(text: "sub \(Int(pretMax)) RON", simbol: "tag") {
                        pretMax = 0; Task { await incarca() }
                    }
                }
                if let ziAleasa {
                    ChipFiltru(text: ziAleasa.ziScurta, simbol: "calendar") {
                        self.ziAleasa = nil; Task { await incarca() }
                    }
                }
            }
        }
    }

    private func stergeFiltrele() {
        oras = ""; sportAles = nil; pretMax = 0; ziAleasa = nil
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

        do {
            terenuri = try await ApiClient.shared.cere("terenuri", parametri: parametri, ca: [Teren].self)
        } catch {
            eroare = error.localizedDescription
        }
        seIncarca = false
    }
}

struct ChipFiltru: View {
    let text: String
    var simbol: String?
    let sterge: () -> Void

    var body: some View {
        HStack(spacing: 5) {
            if let simbol { Image(systemName: simbol).font(.system(size: 10)) }
            Text(text).font(.footnote.weight(.medium))
            Button(action: sterge) {
                Image(systemName: "xmark").font(.system(size: 9, weight: .bold))
            }
        }
        .padding(.horizontal, 11).padding(.vertical, 8)
        .background(Tema.accent.opacity(0.12), in: .capsule)
        .foregroundStyle(Tema.accent)
    }
}

/// Cardul cu poză mare — terenul se alege cu ochii, nu citind un rând de listă.
struct CardTeren: View {
    let teren: Teren

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                PozaTeren(cale: teren.poze.first, sport: teren.sport)
                    .frame(height: 160)
                    .frame(maxWidth: .infinity)
                    .clipped()

                HStack {
                    // Text în culoarea de sistem peste material: rămâne lizibil
                    // și pe poze deschise, și pe cele întunecate.
                    HStack(spacing: 4) {
                        Image(systemName: teren.sport.simbol)
                            .font(.system(size: 10, weight: .semibold))
                        Text(teren.sport.eticheta).font(.caption2.weight(.semibold))
                    }
                    .padding(.horizontal, 9).padding(.vertical, 5)
                    .background(.regularMaterial, in: .capsule)
                    Spacer()
                    if teren.favorit {
                        Image(systemName: "heart.fill")
                            .font(.caption)
                            .foregroundStyle(.pink)
                            .padding(7)
                            .background(.ultraThinMaterial, in: .circle)
                    }
                }
                .padding(10)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(teren.nume).font(.headline).lineLimit(1)
                    Spacer()
                    if let nota = teren.notaMedie {
                        HStack(spacing: 3) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10)).foregroundStyle(.yellow)
                            Text(String(format: "%.1f", nota)).font(.caption.weight(.semibold))
                            Text("(\(teren.numarRecenzii))")
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }

                Label(teren.oras, systemImage: "mappin.and.ellipse")
                    .font(.caption).foregroundStyle(.secondary)

                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(Int(teren.pretPeOra))").font(.title3.weight(.bold))
                    Text("RON / oră").font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Text("\(String(format: "%02d", teren.oraDeschidere)):00–\(String(format: "%02d", teren.oraInchidere)):00")
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            .padding(14)
        }
        .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .clipShape(.rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 5)
    }
}

struct FiltreView: View {
    @Binding var oras: String
    @Binding var sportAles: Sport?
    @Binding var pretMax: Double
    @Binding var ziAleasa: Date?
    let aplica: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var areZi = false
    @State private var zi = Date()

    var body: some View {
        Form {
            Section("Sport") {
                LazyVGrid(columns: [.init(.adaptive(minimum: 96), spacing: 8)], spacing: 8) {
                    ForEach(Sport.allCases, id: \.self) { sport in
                        let ales = sportAles == sport
                        Button {
                            sportAles = ales ? nil : sport
                        } label: {
                            VStack(spacing: 4) {
                                Image(systemName: sport.simbol).font(.callout)
                                Text(sport.eticheta).font(.caption2.weight(.medium))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(ales ? Tema.accent : Tema.fundal,
                                        in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
                            .foregroundStyle(ales ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
            }

            Section("Oraș") {
                TextField("ex. Cluj-Napoca", text: $oras)
                    .textInputAutocapitalization(.words)
            }

            Section("Preț maxim pe oră") {
                VStack(alignment: .leading) {
                    Text(pretMax > 0 ? "Până la \(Int(pretMax)) RON" : "Fără limită")
                        .font(.subheadline.weight(.medium))
                    Slider(value: $pretMax, in: 0...500, step: 10)
                }
            }

            Section("Disponibil în ziua") {
                Toggle("Filtrează după zi", isOn: $areZi.animation())
                if areZi {
                    DatePicker("Ziua", selection: $zi, in: Date()..., displayedComponents: .date)
                }
            }
        }
        .navigationTitle("Filtre")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Șterge tot") {
                    oras = ""; sportAles = nil; pretMax = 0; areZi = false; ziAleasa = nil
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Arată") {
                    ziAleasa = areZi ? zi : nil
                    aplica()
                    inchide()
                }
                .fontWeight(.semibold)
            }
        }
        .onAppear {
            if let ziAleasa { areZi = true; zi = ziAleasa }
        }
    }
}
