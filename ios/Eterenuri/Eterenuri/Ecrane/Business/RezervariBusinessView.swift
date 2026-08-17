import SwiftUI

struct RezervariBusinessView: View {
    @State private var rezervari: [Rezervare] = []
    @State private var seIncarca = true
    @State private var filtru: StatusRezervare?
    @State private var eroare: String?
    @State private var dePropus: Rezervare?

    private var vizibile: [Rezervare] {
        guard let filtru else { return rezervari }
        return rezervari.filter { $0.status == filtru }
    }

    var body: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        PastilaFiltru(text: "Toate", activ: filtru == nil) { filtru = nil }
                        ForEach(
                            [StatusRezervare.inAsteptare, .confirmata, .mutarePropusa, .respinsa, .anulata],
                            id: \.self
                        ) { status in
                            PastilaFiltru(text: status.eticheta, activ: filtru == status) {
                                filtru = filtru == status ? nil : status
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowInsets(.init(top: 0, leading: 16, bottom: 0, trailing: 0))
                .listRowBackground(Color.clear)
            }

            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if vizibile.isEmpty {
                StareGoala(
                    simbol: "tray",
                    titlu: "Nicio rezervare",
                    detaliu: "Aici apar cererile primite pe terenurile tale."
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(vizibile) { rezervare in
                    CardRezervareBusiness(
                        rezervare: rezervare,
                        aproba: { Task { await actiune(rezervare, "aproba") } },
                        respinge: { Task { await actiune(rezervare, "respinge") } },
                        propune: { dePropus = rezervare }
                    )
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Rezervări")
        .refreshable { await incarca() }
        .task { await incarca() }
        .sheet(item: $dePropus) { rezervare in
            NavigationStack {
                PropuneMutareView(rezervare: rezervare) { Task { await incarca() } }
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

struct CardRezervareBusiness: View {
    let rezervare: Rezervare
    let aproba: () -> Void
    let respinge: () -> Void
    let propune: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(rezervare.client?.nume ?? "Client").font(.headline)
                    Text(rezervare.teren.nume).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                EticheutaStatus(status: rezervare.status)
            }

            Text("\(rezervare.inceput.ziScurta) · \(rezervare.inceput.oraScurta)–\(rezervare.sfarsit.oraScurta)")
                .font(.subheadline)

            HStack {
                Text("\(Int(rezervare.pretTotal)) RON")
                    .font(.footnote.monospaced()).foregroundStyle(.secondary)
                if let telefon = rezervare.client?.telefon, !telefon.isEmpty {
                    Spacer()
                    Link(destination: URL(string: "tel:\(telefon)")!) {
                        Label(telefon, systemImage: "phone").font(.caption)
                    }
                }
            }

            if let observatii = rezervare.observatii, !observatii.isEmpty {
                Text(observatii).font(.caption).foregroundStyle(.secondary)
            }

            if rezervare.status == .inAsteptare {
                HStack {
                    Button("Aprobă", systemImage: "checkmark", action: aproba)
                        .buttonStyle(.borderedProminent).controlSize(.small).tint(.green)
                    Button("Respinge", systemImage: "xmark", action: respinge)
                        .buttonStyle(.bordered).controlSize(.small).tint(.red)
                    Button("Mută", systemImage: "clock.arrow.trianglehead.2.counterclockwise.rotate.90", action: propune)
                        .buttonStyle(.bordered).controlSize(.small)
                }
                .font(.footnote)
            } else if rezervare.status == .confirmata {
                Button("Propune altă oră", systemImage: "clock", action: propune)
                    .buttonStyle(.bordered).controlSize(.small).font(.footnote)
            }
        }
        .padding(.vertical, 6)
    }
}

struct PropuneMutareView: View {
    let rezervare: Rezervare
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var zi: Date
    @State private var start: Date
    @State private var sfarsit: Date
    @State private var nota = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    init(rezervare: Rezervare, laFinal: @escaping () -> Void) {
        self.rezervare = rezervare
        self.laFinal = laFinal
        _zi = State(initialValue: rezervare.inceput)
        _start = State(initialValue: rezervare.inceput)
        _sfarsit = State(initialValue: rezervare.sfarsit)
    }

    var body: some View {
        Form {
            Section("Noua oră") {
                DatePicker("Ziua", selection: $zi, displayedComponents: .date)
                DatePicker("Start", selection: $start, displayedComponents: .hourAndMinute)
                DatePicker("Sfârșit", selection: $sfarsit, displayedComponents: .hourAndMinute)
            }
            Section("Mesaj (opțional)") {
                TextField("Ex. avem mentenanță la ora aceea.", text: $nota, axis: .vertical)
                    .lineLimit(2...4)
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button {
                    trimite()
                } label: {
                    HStack { Spacer(); Text("Trimite propunerea").fontWeight(.semibold); Spacer() }
                }
                .disabled(seTrimite)
                .listRowBackground(Color.verdeEterenuri)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Propune o nouă oră")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func trimite() {
        // Ziua vine din primul selector, ora din celelalte două.
        let calendar = Calendar.current
        let componenteZi = calendar.dateComponents([.year, .month, .day], from: zi)
        func combina(_ ora: Date) -> Date? {
            var c = componenteZi
            let o = calendar.dateComponents([.hour, .minute], from: ora)
            c.hour = o.hour
            c.minute = o.minute
            return calendar.date(from: c)
        }
        guard let inceput = combina(start), let final = combina(sfarsit) else { return }

        struct Corp: Encodable {
            let actiune = "propune-mutare"
            let inceput: Date
            let sfarsit: Date
            let nota: String?
        }

        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "rezervari/\(rezervare.id)",
                    metoda: "PATCH",
                    corp: Corp(inceput: inceput, sfarsit: final, nota: nota.isEmpty ? nil : nota)
                )
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
