import SwiftUI

struct TerenuriBusinessView: View {
    @State private var terenuri: [Teren] = []
    @State private var blocari: [Blocare] = []
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var deBlocatPeTeren: Teren?
    @State private var deEditat: Teren?
    @State private var adaugaTeren = false

    var body: some View {
        List {
            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "sportscourt",
                    titlu: "Niciun teren adăugat",
                    detaliu: "Adaugă primul teren cu butonul din dreapta sus.",
                    titluActiune: "Adaugă un teren",
                    actiune: { adaugaTeren = true }
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(terenuri) { teren in
                    Section {
                        HStack(spacing: 12) {
                            PozaTeren(cale: teren.poze.first, sport: teren.sport)
                                .frame(width: 54, height: 54)
                                .clipShape(.rect(cornerRadius: 10))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(teren.nume).font(.headline)
                                Text("\(teren.sport.eticheta) · \(teren.oras)")
                                    .font(.caption).foregroundStyle(.secondary)
                                Text("\(Int(teren.pretPeOra)) RON / oră · \(String(format: "%02d", teren.oraDeschidere)):00–\(String(format: "%02d", teren.oraInchidere)):00")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if !teren.activ {
                                Text("Inactiv")
                                    .font(.caption2)
                                    .padding(.horizontal, 7).padding(.vertical, 3)
                                    .background(Color.secondary.opacity(0.15), in: .capsule)
                            }
                        }

                        Button("Modifică terenul", systemImage: "pencil") {
                            deEditat = teren
                        }
                        .font(.footnote)

                        Button("Blochează ore", systemImage: "lock") {
                            deBlocatPeTeren = teren
                        }
                        .font(.footnote)

                        ForEach(blocari.filter { $0.terenId == teren.id }) { blocare in
                            HStack {
                                VStack(alignment: .leading, spacing: 1) {
                                    Label(
                                        blocare.clientNume ?? blocare.motiv ?? "Blocat",
                                        systemImage: blocare.clientNume == nil ? "lock.fill" : "phone.fill"
                                    )
                                    .font(.subheadline)
                                    Text("\(blocare.inceput.ziScurta) · \(blocare.inceput.oraScurta)–\(blocare.sfarsit.oraScurta)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    Task { await deblocheaza(blocare) }
                                } label: {
                                    Image(systemName: "trash").font(.caption)
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Terenurile mele")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Adaugă teren", systemImage: "plus") { adaugaTeren = true }
            }
        }
        .refreshable { await incarca() }
        .task { await incarca() }
        .sheet(isPresented: $adaugaTeren) {
            NavigationStack {
                FormularTerenView { Task { await incarca() } }
            }
        }
        .sheet(item: $deEditat) { teren in
            NavigationStack {
                FormularTerenView(teren: teren) { Task { await incarca() } }
            }
        }
        .sheet(item: $deBlocatPeTeren) { teren in
            NavigationStack {
                BlocheazaOreView(teren: teren) { Task { await incarca() } }
            }
        }
        .alert("Eroare", isPresented: .init(get: { eroare != nil }, set: { if !$0 { eroare = nil } })) {
            Button("OK", role: .cancel) { eroare = nil }
        } message: {
            Text(eroare ?? "")
        }
    }

    private func incarca() async {
        async let t: [Teren]? = try? await ApiClient.shared.cere("business/terenuri", ca: [Teren].self)
        async let b: [Blocare]? = try? await ApiClient.shared.cere("business/blocari", ca: [Blocare].self)
        terenuri = await t ?? []
        blocari = await b ?? []
        seIncarca = false
    }

    private func deblocheaza(_ blocare: Blocare) async {
        do {
            try await ApiClient.shared.cereFaraRaspuns(
                "business/blocari/\(blocare.id)", metoda: "DELETE"
            )
            await incarca()
        } catch {
            eroare = error.localizedDescription
        }
    }
}

struct BlocheazaOreView: View {
    let teren: Teren
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var zi = Date()
    @State private var oraStart = 8
    @State private var oraSfarsit = 10
    @State private var motiv = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    /// Repetarea e oprită implicit: cele mai multe blocări sunt pentru o zi.
    @State private var seRepeta = false
    @State private var zileAlese: Set<Int> = []
    @State private var saptamani = 8
    @State private var rezumat: String?

    private let sugestii = ["Mentenanță", "Rezervare telefonică", "Eveniment privat"]

    // ISO: 1 = luni … 7 = duminică.
    private let zileSaptamanii: [(numar: Int, scurt: String, lung: String)] = [
        (1, "L", "luni"), (2, "Ma", "marți"), (3, "Mi", "miercuri"), (4, "J", "joi"),
        (5, "V", "vineri"), (6, "S", "sâmbătă"), (7, "D", "duminică"),
    ]

    /// Ziua din calendar intră mereu în serie, chiar dacă nu e bifată explicit.
    private var zileFinale: [Int] {
        zileAlese.isEmpty ? [ziuaIso(zi)] : zileAlese.sorted()
    }

    private var cateIntervale: Int { zileFinale.count * saptamani }

    var body: some View {
        Form {
            Section {
                DatePicker("Ziua", selection: $zi, in: Date()..., displayedComponents: .date)
                Picker("De la", selection: $oraStart) {
                    ForEach(teren.oraDeschidere..<teren.oraInchidere, id: \.self) { ora in
                        Text(String(format: "%02d:00", ora)).tag(ora)
                    }
                }
                Picker("Până la", selection: $oraSfarsit) {
                    ForEach((oraStart + 1)...teren.oraInchidere, id: \.self) { ora in
                        Text(String(format: "%02d:00", ora)).tag(ora)
                    }
                }
            } footer: {
                Text("Orele blocate nu mai pot fi rezervate de clienți.")
            }

            Section {
                Toggle("Se repetă săptămânal", isOn: $seRepeta.animation(.snappy))

                if seRepeta {
                    // Zilele ca butoane, nu ca listă: sunt șapte și se aleg des
                    // mai multe odată.
                    HStack(spacing: 6) {
                        ForEach(zileSaptamanii, id: \.numar) { zi in
                            let activ = zileFinale.contains(zi.numar)
                            Button {
                                comutaZi(zi.numar)
                            } label: {
                                Text(zi.scurt)
                                    .font(.footnote.weight(.medium))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 36)
                                    .background(activ ? Tema.accent : Color.secondary.opacity(0.14),
                                                in: .rect(cornerRadius: 9, style: .continuous))
                                    .foregroundStyle(activ ? .white : .primary)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(zi.lung)
                        }
                    }
                    .listRowInsets(.init(top: 8, leading: 16, bottom: 8, trailing: 16))

                    Picker("Câte săptămâni", selection: $saptamani) {
                        ForEach([4, 8, 12, 26, 52], id: \.self) { Text("\($0)").tag($0) }
                    }
                }
            } footer: {
                if seRepeta {
                    Text("Aceeași oră în fiecare săptămână, începând cu ziua aleasă. Orele deja rezervate sau blocate sunt sărite, nu se scriu de două ori.")
                }
            }

            Section("Motiv (opțional)") {
                TextField("Ex. mentenanță gazon", text: $motiv)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(sugestii, id: \.self) { s in
                            PastilaFiltru(text: s, activ: motiv == s) { motiv = s }
                        }
                    }
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            if let rezumat {
                Section { Text(rezumat).font(.footnote).foregroundStyle(Tema.accent) }
            }

            Section {
                Button {
                    trimite()
                } label: {
                    HStack {
                        Spacer()
                        if seTrimite {
                            ProgressView().tint(.white)
                        } else {
                            Text(seRepeta ? "Blochează \(cateIntervale) intervale" : "Blochează")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite || oraSfarsit <= oraStart)
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Blochează ore")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
        .onChange(of: oraStart) { _, nou in
            if oraSfarsit <= nou { oraSfarsit = min(nou + 1, teren.oraInchidere) }
        }
    }

    private func comutaZi(_ numar: Int) {
        var urmatoare = zileAlese.isEmpty ? Set([ziuaIso(zi)]) : zileAlese
        if urmatoare.contains(numar) { urmatoare.remove(numar) } else { urmatoare.insert(numar) }
        zileAlese = urmatoare
    }

    /// Ziua săptămânii după ISO, nu după numerotarea Calendar (1 = duminică).
    private func ziuaIso(_ data: Date) -> Int {
        let zi = Calendar.current.component(.weekday, from: data)
        return zi == 1 ? 7 : zi - 1
    }

    private func trimiteSeria() {
        struct Corp: Encodable {
            let terenId: String
            let zile: [Int]
            let oraStart: Int
            let oraSfarsit: Int
            let dataInceput: String
            let saptamani: Int
            let motiv: String?
        }
        struct Raspuns: Decodable {
            let create: Int
            let rezervate: Int
            let blocate: Int
        }

        eroare = nil
        rezumat = nil
        seTrimite = true

        Task {
            defer { seTrimite = false }
            do {
                let raspuns: Raspuns = try await ApiClient.shared.cere(
                    "business/blocari",
                    metoda: "PUT",
                    corp: Corp(
                        terenId: teren.id,
                        zile: zileFinale,
                        oraStart: oraStart,
                        oraSfarsit: oraSfarsit,
                        dataInceput: ZiApi.text(zi),
                        saptamani: saptamani,
                        motiv: motiv.isEmpty ? nil : motiv
                    ),
                    ca: Raspuns.self
                )

                guard raspuns.create > 0 else {
                    eroare = raspuns.rezervate > 0
                        ? "Toate orele din serie sunt deja rezervate sau blocate."
                        : "Orele erau deja blocate — nu s-a adăugat nimic."
                    return
                }

                // Spunem și ce n-a intrat: altfel proprietarul crede că are
                // terenul blocat în zile în care de fapt are un client.
                var text = "\(raspuns.create) \(raspuns.create == 1 ? "interval blocat" : "intervale blocate")."
                if raspuns.rezervate > 0 { text += " \(raspuns.rezervate) sărite, au deja rezervare." }
                if raspuns.blocate > 0 { text += " \(raspuns.blocate) erau deja blocate." }
                rezumat = text

                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func trimite() {
        if seRepeta {
            trimiteSeria()
            return
        }

        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: oraStart, minute: 0, second: 0, of: zi),
            let miezul = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: zi),
            let final = calendar.date(byAdding: .hour, value: oraSfarsit, to: miezul)
        else { return }

        struct Corp: Encodable {
            let terenId: String
            let inceput: Date
            let sfarsit: Date
            let motiv: String?
        }

        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "business/blocari",
                    metoda: "POST",
                    corp: Corp(
                        terenId: teren.id,
                        inceput: inceput,
                        sfarsit: final,
                        motiv: motiv.isEmpty ? nil : motiv
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
