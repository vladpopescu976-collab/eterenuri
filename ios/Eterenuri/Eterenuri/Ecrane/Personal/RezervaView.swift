import SwiftUI

/// Alegerea zilei și a intervalului, cu orele deja ocupate marcate ca atare.
/// Folosit și la rezervare nouă, și la mutarea uneia existente.
struct RezervaView: View {
    let teren: Teren
    /// Prezent când mutăm o rezervare — o excludem din orele ocupate.
    var rezervareExistenta: Rezervare?
    var laFinal: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var zi = Date()
    @State private var oraStart: Int?
    @State private var oraSfarsit: Int?
    @State private var observatii = ""
    @State private var ocupate: [Interval] = []
    @State private var seIncarcaOre = true
    @State private var seTrimite = false
    @State private var eroare: String?

    private var esteMutare: Bool { rezervareExistenta != nil }

    private var oreDisponibile: [Int] {
        Array(teren.oraDeschidere..<teren.oraInchidere)
    }

    var body: some View {
        Form {
            Section("Data") {
                DatePicker("Ziua", selection: $zi, in: Date()..., displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .onChange(of: zi) { _, _ in
                        oraStart = nil
                        oraSfarsit = nil
                        Task { await incarcaOre() }
                    }
            }

            Section {
                if seIncarcaOre {
                    HStack { Spacer(); ProgressView(); Spacer() }
                } else {
                    LazyVGrid(columns: [.init(.adaptive(minimum: 66), spacing: 8)], spacing: 8) {
                        ForEach(oreDisponibile, id: \.self) { ora in
                            ButonOra(
                                ora: ora,
                                stare: stareOra(ora),
                                apasa: { alegeOra(ora) }
                            )
                        }
                    }
                    .padding(.vertical, 4)
                }
            } header: {
                Text("Interval")
            } footer: {
                if !ocupate.isEmpty && !seIncarcaOre {
                    Text("Orele gri sunt deja rezervate sau blocate de proprietar.")
                } else if !seIncarcaOre {
                    Text("Toate orele sunt libere în această zi.")
                }
            }

            if let start = oraStart, let sfarsit = oraSfarsit {
                Section {
                    LabeledContent("Interval", value: "\(format(start)) – \(format(sfarsit))")
                    LabeledContent("Durată", value: "\(sfarsit - start) ore")
                    LabeledContent("Total", value: "\(Int(teren.pretPeOra) * (sfarsit - start)) RON")
                }
            }

            if !esteMutare {
                Section("Observații (opțional)") {
                    TextField("Ex. avem nevoie de mingi.", text: $observatii, axis: .vertical)
                        .lineLimit(2...4)
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite {
                            ProgressView().tint(.white)
                        } else {
                            Text(esteMutare ? "Salvează modificarea" : "Trimite cererea")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite || oraStart == nil || oraSfarsit == nil)
                .listRowBackground(
                    (oraStart == nil || oraSfarsit == nil) ? Color.gray.opacity(0.3) : Color.verdeEterenuri
                )
                .foregroundStyle(.white)
            }
        }
        .navigationTitle(esteMutare ? "Modifică rezervarea" : teren.nume)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Anulează") { inchide() }
            }
        }
        .task {
            if let existenta = rezervareExistenta { zi = existenta.inceput }
            await incarcaOre()
        }
    }

    // MARK: - Stare ore

    enum StareOra { case libera, ocupata, aleasa, inInterval }

    private func stareOra(_ ora: Int) -> StareOra {
        if let start = oraStart, let sfarsit = oraSfarsit, ora > start, ora < sfarsit {
            return .inInterval
        }
        if ora == oraStart { return .aleasa }
        if esteOcupata(ora) { return .ocupata }
        return .libera
    }

    private func esteOcupata(_ ora: Int) -> Bool {
        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: ora, minute: 0, second: 0, of: zi),
            let sfarsit = calendar.date(byAdding: .hour, value: 1, to: inceput)
        else { return false }
        return ocupate.contains { $0.inceput < sfarsit && $0.sfarsit > inceput }
    }

    private func alegeOra(_ ora: Int) {
        eroare = nil

        if esteOcupata(ora) {
            eroare = "Intervalul \(format(ora)) este deja rezervat. Alege altă oră."
            return
        }

        // Prima apăsare fixează startul, a doua sfârșitul.
        guard let start = oraStart, oraSfarsit == nil, ora > start else {
            oraStart = ora
            oraSfarsit = nil
            return
        }

        // Tot intervalul dintre start și ora aleasă trebuie să fie liber.
        if (start..<ora).contains(where: esteOcupata) {
            eroare = "Intervalul \(format(start)) – \(format(ora)) trece peste o rezervare existentă."
            return
        }
        oraSfarsit = ora
    }

    private func format(_ ora: Int) -> String {
        String(format: "%02d:00", ora)
    }

    // MARK: - Rețea

    private func incarcaOre() async {
        seIncarcaOre = true
        defer { seIncarcaOre = false }

        var parametri = ["zi": ZiApi.text(zi)]
        if let existenta = rezervareExistenta { parametri["exclude"] = existenta.id }

        do {
            let raspuns: Disponibilitate = try await ApiClient.shared.cere(
                "terenuri/\(teren.id)/disponibilitate",
                parametri: parametri,
                ca: Disponibilitate.self
            )
            ocupate = raspuns.ocupate
        } catch {
            ocupate = []
            eroare = error.localizedDescription
        }
    }

    private func trimite() {
        guard let start = oraStart, let sfarsit = oraSfarsit else { return }
        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: start, minute: 0, second: 0, of: zi),
            let final = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: zi)
                .flatMap({ calendar.date(byAdding: .hour, value: sfarsit, to: $0) })
        else { return }

        eroare = nil
        seTrimite = true

        Task {
            defer { seTrimite = false }
            do {
                if let existenta = rezervareExistenta {
                    struct Corp: Encodable {
                        let actiune = "muta"
                        let inceput: Date
                        let sfarsit: Date
                    }
                    try await ApiClient.shared.cereFaraRaspuns(
                        "rezervari/\(existenta.id)",
                        metoda: "PATCH",
                        corp: Corp(inceput: inceput, sfarsit: final)
                    )
                } else {
                    struct Corp: Encodable {
                        let terenId: String
                        let inceput: Date
                        let sfarsit: Date
                        let observatii: String?
                    }
                    try await ApiClient.shared.cereFaraRaspuns(
                        "rezervari",
                        metoda: "POST",
                        corp: Corp(
                            terenId: teren.id,
                            inceput: inceput,
                            sfarsit: final,
                            observatii: observatii.isEmpty ? nil : observatii
                        )
                    )
                }
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
                await incarcaOre()
            }
        }
    }
}

private struct ButonOra: View {
    let ora: Int
    let stare: RezervaView.StareOra
    let apasa: () -> Void

    var body: some View {
        Button(action: apasa) {
            Text(String(format: "%02d:00", ora))
                .font(.footnote.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(fundal, in: .rect(cornerRadius: 9))
                .foregroundStyle(text)
                .overlay {
                    if stare == .ocupata {
                        RoundedRectangle(cornerRadius: 9)
                            .stroke(.secondary.opacity(0.25), style: .init(lineWidth: 1, dash: [3, 3]))
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private var fundal: Color {
        switch stare {
        case .aleasa: Color.verdeEterenuri
        case .inInterval: Color.verdeEterenuri.opacity(0.25)
        case .ocupata: Color(.tertiarySystemFill)
        case .libera: Color(.secondarySystemBackground)
        }
    }

    private var text: Color {
        switch stare {
        case .aleasa: .white
        case .inInterval: .primary
        case .ocupata: .secondary.opacity(0.6)
        case .libera: .primary
        }
    }
}
