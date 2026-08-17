import SwiftUI

struct TerenuriBusinessView: View {
    @State private var terenuri: [Teren] = []
    @State private var blocari: [Blocare] = []
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var deBlocatPeTeren: Teren?

    var body: some View {
        List {
            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "sportscourt",
                    titlu: "Niciun teren adăugat",
                    detaliu: "Adaugă primul teren din aplicația web ca să apară aici."
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
        .refreshable { await incarca() }
        .task { await incarca() }
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

    private let sugestii = ["Mentenanță", "Rezervare telefonică", "Eveniment privat"]

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

            Section {
                Button {
                    trimite()
                } label: {
                    HStack { Spacer(); Text("Blochează").fontWeight(.semibold); Spacer() }
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

    private func trimite() {
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
