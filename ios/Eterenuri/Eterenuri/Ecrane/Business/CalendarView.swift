import SwiftUI

/// Grila săptămânală, ca pe desktop: zilele pe coloane, orele pe rânduri.
/// Fiecare celulă e o oră pe un teren — se vede dintr-o privire ce e liber și
/// ce nu, iar apăsarea deschide acțiunile pentru intervalul respectiv.
struct CalendarView: View {
    @State private var terenuri: [Teren] = []
    @State private var rezervari: [Rezervare] = []
    @State private var blocari: [Blocare] = []
    @State private var seIncarca = true

    @State private var terenAles: Teren?
    @State private var inceputSaptamana = CalendarView.startulSaptamanii(Date())
    @State private var celulaAleasa: Celula?

    private let latimeOra: CGFloat = 46
    private let inaltimeRand: CGFloat = 46

    struct Celula: Identifiable {
        let zi: Date
        let ora: Int
        var id: String { "\(zi.timeIntervalSince1970)-\(ora)" }
    }

    private var zile: [Date] {
        (0..<7).compactMap {
            Calendar.current.date(byAdding: .day, value: $0, to: inceputSaptamana)
        }
    }

    private var ore: [Int] {
        guard let teren = terenAles else { return Array(8..<22) }
        return Array(teren.oraDeschidere..<teren.oraInchidere)
    }

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()

            if seIncarca {
                ProgressView().controlSize(.large)
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "sportscourt",
                    titlu: "Niciun teren",
                    detaliu: "Adaugă un teren ca să vezi calendarul."
                )
            } else {
                VStack(spacing: 0) {
                    selectorTeren
                    navigatorSaptamana
                    grila
                    legenda
                }
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.inline)
        .task { await incarca() }
        .sheet(item: $celulaAleasa) { celula in
            NavigationStack {
                ActiuniInterval(
                    teren: terenAles,
                    zi: celula.zi,
                    ora: celula.ora,
                    ocupare: ocupare(celula.zi, celula.ora),
                    reincarca: { Task { await incarca() } }
                )
            }
            .presentationDetents([.height(340), .medium])
        }
    }

    // MARK: - Antet

    private var selectorTeren: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(terenuri) { teren in
                    PastilaFiltru(text: teren.nume, activ: terenAles?.id == teren.id) {
                        terenAles = teren
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }

    private var navigatorSaptamana: some View {
        HStack {
            Button {
                muta(saptamani: -1)
            } label: {
                Image(systemName: "chevron.left").frame(width: 34, height: 30)
            }

            Spacer()

            VStack(spacing: 1) {
                Text(intervalSaptamana).font(.subheadline.weight(.semibold))
                if !esteSaptamanaCurenta {
                    Button("Înapoi la săptămâna curentă") {
                        withAnimation { inceputSaptamana = Self.startulSaptamanii(Date()) }
                    }
                    .font(.caption2)
                }
            }

            Spacer()

            Button {
                muta(saptamani: 1)
            } label: {
                Image(systemName: "chevron.right").frame(width: 34, height: 30)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    private var intervalSaptamana: String {
        guard let ultima = zile.last else { return "" }
        return "\(inceputSaptamana.ziScurta) – \(ultima.ziScurta)"
    }

    private var esteSaptamanaCurenta: Bool {
        Calendar.current.isDate(inceputSaptamana, inSameDayAs: Self.startulSaptamanii(Date()))
    }

    private func muta(saptamani: Int) {
        withAnimation(.snappy) {
            inceputSaptamana = Calendar.current.date(
                byAdding: .weekOfYear, value: saptamani, to: inceputSaptamana
            ) ?? inceputSaptamana
        }
    }

    // MARK: - Grila

    private var grila: some View {
        ScrollView([.horizontal, .vertical]) {
            Grid(horizontalSpacing: 2, verticalSpacing: 2) {
                GridRow {
                    Color.clear.frame(width: latimeOra, height: 34)
                    ForEach(zile, id: \.self) { zi in
                        capZi(zi)
                    }
                }

                ForEach(ore, id: \.self) { ora in
                    GridRow {
                        Text(String(format: "%02d", ora))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: latimeOra, height: inaltimeRand)

                        ForEach(zile, id: \.self) { zi in
                            celula(zi: zi, ora: ora)
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
    }

    private func capZi(_ zi: Date) -> some View {
        let azi = Calendar.current.isDateInToday(zi)
        return VStack(spacing: 1) {
            Text(zi.zileiPrescurtat.uppercased())
                .font(.system(size: 9, weight: .medium))
            Text(zi.numarZi)
                .font(.subheadline.weight(azi ? .bold : .regular))
        }
        .foregroundStyle(azi ? Tema.accent : .secondary)
        .frame(width: 62, height: 34)
        .background(azi ? Tema.accent.opacity(0.10) : .clear,
                    in: .rect(cornerRadius: 8, style: .continuous))
    }

    private func celula(zi: Date, ora: Int) -> some View {
        let stare = ocupare(zi, ora)
        return Button {
            celulaAleasa = Celula(zi: zi, ora: ora)
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(stare.culoareFundal)
                if let simbol = stare.simbol {
                    Image(systemName: simbol)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(stare.culoareText)
                }
            }
            .frame(width: 62, height: inaltimeRand)
            .overlay {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .stroke(.secondary.opacity(0.14), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private var legenda: some View {
        HStack(spacing: 16) {
            item(Ocupare.libera, "Liber")
            item(.rezervata(nume: ""), "Rezervat")
            item(.inAsteptare(nume: ""), "În așteptare")
            item(.blocata(motiv: nil, client: nil), "Blocat")
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(.regularMaterial)
    }

    private func item(_ stare: Ocupare, _ text: String) -> some View {
        HStack(spacing: 5) {
            RoundedRectangle(cornerRadius: 3)
                .fill(stare.culoareFundal)
                .frame(width: 12, height: 12)
                .overlay { RoundedRectangle(cornerRadius: 3).stroke(.secondary.opacity(0.2)) }
            Text(text)
        }
    }

    // MARK: - Starea unei ore

    enum Ocupare {
        case libera
        case rezervata(nume: String)
        case inAsteptare(nume: String)
        case blocata(motiv: String?, client: String?)

        var culoareFundal: Color {
            switch self {
            case .libera: Tema.fisa
            case .rezervata: Tema.accent.opacity(0.75)
            case .inAsteptare: Tema.asteptare.opacity(0.65)
            case .blocata: Color.secondary.opacity(0.32)
            }
        }

        var culoareText: Color {
            switch self {
            case .libera: .clear
            default: .white
            }
        }

        var simbol: String? {
            switch self {
            case .libera: nil
            case .rezervata: "checkmark"
            case .inAsteptare: "clock"
            case .blocata(_, let client): client == nil ? "lock.fill" : "phone.fill"
            }
        }
    }

    private func ocupare(_ zi: Date, _ ora: Int) -> Ocupare {
        guard let teren = terenAles else { return .libera }
        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: ora, minute: 0, second: 0, of: zi),
            let sfarsit = calendar.date(byAdding: .hour, value: 1, to: inceput)
        else { return .libera }

        if let rezervare = rezervari.first(where: {
            $0.teren.id == teren.id
                && ($0.status == .confirmata || $0.status == .inAsteptare)
                && $0.inceput < sfarsit && $0.sfarsit > inceput
        }) {
            let nume = rezervare.client?.nume ?? "Client"
            return rezervare.status == .confirmata ? .rezervata(nume: nume) : .inAsteptare(nume: nume)
        }

        if let blocare = blocari.first(where: {
            $0.terenId == teren.id && $0.inceput < sfarsit && $0.sfarsit > inceput
        }) {
            return .blocata(motiv: blocare.motiv, client: blocare.clientNume)
        }

        return .libera
    }

    // MARK: - Rețea

    private static func startulSaptamanii(_ data: Date) -> Date {
        var calendar = Calendar.current
        calendar.firstWeekday = 2 // luni
        let componente = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: data)
        return calendar.date(from: componente) ?? calendar.startOfDay(for: data)
    }

    private func incarca() async {
        async let t: [Teren]? = try? await ApiClient.shared.cere("business/terenuri", ca: [Teren].self)
        async let r: [Rezervare]? = try? await ApiClient.shared.cere("rezervari", ca: [Rezervare].self)
        async let b: [Blocare]? = try? await ApiClient.shared.cere("business/blocari", ca: [Blocare].self)

        terenuri = await t ?? []
        rezervari = await r ?? []
        blocari = await b ?? []

        if terenAles == nil || !terenuri.contains(where: { $0.id == terenAles?.id }) {
            terenAles = terenuri.first
        } else if let id = terenAles?.id {
            terenAles = terenuri.first { $0.id == id }
        }
        seIncarca = false
    }
}

// MARK: - Ce se poate face cu o oră

private struct ActiuniInterval: View {
    let teren: Teren?
    let zi: Date
    let ora: Int
    let ocupare: CalendarView.Ocupare
    let reincarca: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var mod: Mod?
    @State private var durata = 1
    @State private var clientNume = ""
    @State private var clientTelefon = ""
    @State private var motiv = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    private enum Mod { case rezervare, blocare }

    private var interval: String {
        "\(String(format: "%02d", ora)):00 – \(String(format: "%02d", ora + durata)):00"
    }

    var body: some View {
        Form {
            Section {
                LabeledContent("Ziua", value: zi.ziLunga.capitalized)
                LabeledContent("Ora", value: interval)
                if let teren { LabeledContent("Teren", value: teren.nume) }
            }

            switch ocupare {
            case .libera:
                if let mod {
                    formular(mod)
                } else {
                    Section {
                        Button {
                            withAnimation { self.mod = .rezervare }
                        } label: {
                            Label("Adaugă o rezervare", systemImage: "person.badge.plus")
                        }
                        Button {
                            withAnimation { self.mod = .blocare }
                        } label: {
                            Label("Blochează ora", systemImage: "lock")
                        }
                    } footer: {
                        Text("Rezervarea se folosește pentru cererile primite la telefon. Blocarea e pentru mentenanță sau evenimente proprii.")
                    }
                }

            case .rezervata(let nume), .inAsteptare(let nume):
                Section {
                    Label(nume, systemImage: "person.fill")
                } footer: {
                    Text("Rezervarea se gestionează din secțiunea Rezervări.")
                }

            case .blocata(let motivBlocare, let client):
                Section {
                    if let client {
                        Label(client, systemImage: "phone.fill")
                        Text("Rezervare notată manual").font(.caption).foregroundStyle(.secondary)
                    } else {
                        Label(motivBlocare ?? "Blocat", systemImage: "lock.fill")
                    }
                } footer: {
                    Text("Se elimină din secțiunea Terenuri.")
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
        }
        .navigationTitle("Interval")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Închide") { inchide() } }
        }
    }

    @ViewBuilder
    private func formular(_ mod: Mod) -> some View {
        Section("Durată") {
            Stepper("\(durata) \(durata == 1 ? "oră" : "ore")", value: $durata, in: 1...6)
        }

        if mod == .rezervare {
            Section("Client") {
                TextField("Nume", text: $clientNume)
                TextField("Telefon (opțional)", text: $clientTelefon)
                    .keyboardType(.phonePad)
            }
        } else {
            Section("Motiv (opțional)") {
                TextField("ex. mentenanță gazon", text: $motiv)
            }
        }

        Section {
            Button {
                trimite(mod)
            } label: {
                HStack {
                    Spacer()
                    if seTrimite {
                        ProgressView().tint(.white)
                    } else {
                        Text(mod == .rezervare ? "Salvează rezervarea" : "Blochează").fontWeight(.semibold)
                    }
                    Spacer()
                }
            }
            .disabled(seTrimite || (mod == .rezervare && clientNume.trimmingCharacters(in: .whitespaces).isEmpty))
            .listRowBackground(
                (mod == .rezervare && clientNume.trimmingCharacters(in: .whitespaces).isEmpty)
                    ? Color.gray.opacity(0.35) : Tema.accent
            )
            .foregroundStyle(.white)
        }
    }

    private func trimite(_ mod: Mod) {
        guard let teren else { return }
        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: ora, minute: 0, second: 0, of: zi),
            let sfarsit = calendar.date(byAdding: .hour, value: durata, to: inceput)
        else { return }

        struct Corp: Encodable {
            let terenId: String
            let inceput: Date
            let sfarsit: Date
            let motiv: String?
            let clientNume: String?
            let clientTelefon: String?
        }

        eroare = nil
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
                        sfarsit: sfarsit,
                        motiv: mod == .blocare ? (motiv.isEmpty ? nil : motiv) : "Rezervare telefonică",
                        clientNume: mod == .rezervare ? clientNume.trimmingCharacters(in: .whitespaces) : nil,
                        clientTelefon: mod == .rezervare && !clientTelefon.isEmpty ? clientTelefon : nil
                    )
                )
                reincarca()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
