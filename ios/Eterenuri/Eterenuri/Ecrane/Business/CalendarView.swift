import SwiftUI

/// Săptămâna la un loc, ca într-un calendar de desktop: zilele pe coloane,
/// orele pe rânduri. O rezervare de trei ore e un singur bloc înalt cât trei
/// ore, nu trei celule identice una sub alta.
struct CalendarView: View {
    @State private var terenuri: [Teren] = []
    @State private var rezervari: [Rezervare] = []
    @State private var blocari: [Blocare] = []
    @State private var seIncarca = true

    @State private var terenAles: Teren?
    @State private var inceputSaptamana = CalendarView.startulSaptamanii(Date())
    @State private var evenimentAles: Eveniment?
    @State private var celulaLibera: CelulaLibera?

    private let latimeOre: CGFloat = 34
    private let inaltimeOra: CGFloat = 54

    private var zile: [Date] {
        (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: inceputSaptamana) }
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
                    if terenuri.count > 1 { selectorTeren }
                    navigatorSaptamana
                    antetZile
                    grila
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.inline)
        .task { await incarca() }
        .sheet(item: $evenimentAles) { eveniment in
            NavigationStack {
                DetaliuEveniment(eveniment: eveniment, reincarca: { Task { await incarca() } })
            }
            .presentationDetents([.height(300)])
        }
        .sheet(item: $celulaLibera) { celula in
            NavigationStack {
                IntervalNou(
                    teren: terenAles,
                    zi: celula.zi,
                    ora: celula.ora,
                    maximOre: maximOreLibere(celula.zi, de: celula.ora),
                    reincarca: { Task { await incarca() } }
                )
            }
            .presentationDetents([.height(400), .large])
        }
    }

    // MARK: - Antet

    private var selectorTeren: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(terenuri) { teren in
                    PastilaFiltru(text: teren.nume, activ: terenAles?.id == teren.id) {
                        withAnimation(.snappy) { terenAles = teren }
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 10)
        }
    }

    private var navigatorSaptamana: some View {
        HStack(spacing: 4) {
            Button { muta(-1) } label: {
                Image(systemName: "chevron.left").frame(width: 32, height: 30)
            }
            Spacer()
            VStack(spacing: 0) {
                Text(intervalSaptamana).font(.subheadline.weight(.semibold))
                if !esteSaptamanaCurenta {
                    Button("Săptămâna curentă") {
                        withAnimation(.snappy) { inceputSaptamana = Self.startulSaptamanii(Date()) }
                    }
                    .font(.caption2)
                }
            }
            Spacer()
            Button { muta(1) } label: {
                Image(systemName: "chevron.right").frame(width: 32, height: 30)
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
    }

    private var antetZile: some View {
        HStack(spacing: 3) {
            Color.clear.frame(width: latimeOre, height: 1)
            ForEach(zile, id: \.self) { zi in
                let azi = Calendar.current.isDateInToday(zi)
                VStack(spacing: 1) {
                    Text(zi.zileiPrescurtat.prefix(2).uppercased())
                        .font(.system(size: 9, weight: .semibold))
                    Text(zi.numarZi)
                        .font(.footnote.weight(azi ? .bold : .medium))
                }
                .foregroundStyle(azi ? .white : .secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
                .background(azi ? Tema.accent : .clear, in: .rect(cornerRadius: 7, style: .continuous))
            }
        }
        .padding(.horizontal, 10)
        .padding(.bottom, 6)
    }

    // MARK: - Grila

    private var grila: some View {
        ScrollView(.vertical, showsIndicators: false) {
            HStack(alignment: .top, spacing: 3) {
                coloanaOre
                ForEach(zile, id: \.self) { zi in
                    coloanaZi(zi)
                }
            }
            .padding(.horizontal, 10)
            .padding(.top, 6)
            .padding(.bottom, 100)
        }
    }

    private var coloanaOre: some View {
        VStack(spacing: 0) {
            ForEach(ore, id: \.self) { ora in
                Text(String(format: "%02d", ora))
                    .font(.system(size: 10, weight: .medium).monospacedDigit())
                    .foregroundStyle(.secondary)
                    .frame(width: latimeOre, height: inaltimeOra, alignment: .top)
                    .offset(y: -5)
            }
        }
    }

    private func coloanaZi(_ zi: Date) -> some View {
        // Fundalul: o casetă goală pe fiecare oră, apăsabilă dacă e liberă.
        // Peste el, evenimentele desenate ca blocuri continue.
        VStack(spacing: 0) {
            ForEach(ore, id: \.self) { ora in
                Button {
                    celulaLibera = CelulaLibera(zi: zi, ora: ora)
                } label: {
                    Rectangle()
                        .fill(Tema.fisa)
                        .frame(height: inaltimeOra - 2)
                        .overlay(alignment: .top) {
                            Rectangle().fill(.secondary.opacity(0.10)).frame(height: 1)
                        }
                }
                .buttonStyle(.plain)
                .padding(.bottom, 2)
            }
        }
        .clipShape(.rect(cornerRadius: 10, style: .continuous))
        .overlay(alignment: .top) { blocuri(zi) }
        .overlay(alignment: .top) { liniaAcum(zi) }
        .frame(maxWidth: .infinity)
    }

    /// Fiecare rezervare sau blocare, ca un singur dreptunghi înalt cât durata ei.
    ///
    /// ZStack-ul explicit e obligatoriu: un `ForEach` pus direct într-un
    /// `overlay` formează un grup care își centrează copiii pe verticală, iar
    /// `alignment: .top` se aplică grupului, nu fiecărui bloc. Într-o zi cu
    /// două rezervări de lungimi diferite, cea mai scurtă era coborâtă cu
    /// jumătate din diferența de înălțime și apărea peste alte ore.
    private func blocuri(_ zi: Date) -> some View {
        ZStack(alignment: .top) {
            ForEach(evenimente(zi)) { eveniment in
                let sus = CGFloat(eveniment.oraStart - (ore.first ?? 0)) * inaltimeOra
                let inaltime = max(CGFloat(eveniment.durataOre) * inaltimeOra - 4, 22)

                Button {
                    evenimentAles = eveniment
                } label: {
                    VStack(alignment: .leading, spacing: 1) {
                        Image(systemName: eveniment.simbol)
                            .font(.system(size: 9, weight: .bold))
                        if inaltime > 40 {
                            Text(eveniment.titlu)
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(inaltime > 90 ? 3 : 2)
                                .multilineTextAlignment(.leading)
                                .minimumScaleFactor(0.85)
                        }
                        if inaltime > 76 {
                            Spacer(minLength: 0)
                            Text(eveniment.intervalScurt)
                                .font(.system(size: 8, weight: .medium).monospacedDigit())
                                .opacity(0.9)
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(height: inaltime, alignment: .top)
                    .background(eveniment.culoare, in: .rect(cornerRadius: 8, style: .continuous))
                    .foregroundStyle(.white)
                    .overlay(alignment: .leading) {
                        // Muchia mai închisă face blocul să se citească ca un tot.
                        Rectangle().fill(.white.opacity(0.35)).frame(width: 2)
                            .clipShape(.rect(cornerRadius: 1))
                            .padding(.vertical, 4)
                            .padding(.leading, 1)
                    }
                }
                .buttonStyle(.plain)
                .offset(y: sus)
            }
        }
        // Grupul trebuie să ocupe toată înălțimea coloanei, altfel se
        // dimensionează după blocuri și se recentrează.
        .frame(height: CGFloat(ore.count) * inaltimeOra, alignment: .top)
    }

    /// Linia roșie cu ora curentă, ca în calendarele obișnuite.
    @ViewBuilder
    private func liniaAcum(_ zi: Date) -> some View {
        let acum = Date()
        if Calendar.current.isDate(zi, inSameDayAs: acum),
           let prima = ore.first, let ultima = ore.last {
            let oraAcum = Double(Calendar.current.component(.hour, from: acum))
                + Double(Calendar.current.component(.minute, from: acum)) / 60
            if oraAcum >= Double(prima) && oraAcum <= Double(ultima + 1) {
                Rectangle()
                    .fill(.red)
                    .frame(height: 1.5)
                    .overlay(alignment: .leading) {
                        Circle().fill(.red).frame(width: 5, height: 5).offset(x: -2)
                    }
                    .offset(y: CGFloat(oraAcum - Double(prima)) * inaltimeOra)
            }
        }
    }

    // MARK: - Evenimente

    struct Eveniment: Identifiable {
        let id: String
        let titlu: String
        let subtitlu: String?
        let oraStart: Int
        let durataOre: Int
        let fel: Fel

        enum Fel {
            case confirmata, inAsteptare, telefonica, blocare
        }

        var culoare: Color {
            switch fel {
            case .confirmata: Tema.accent
            case .inAsteptare: Tema.asteptare
            case .telefonica: Color(red: 0.36, green: 0.45, blue: 0.72)
            case .blocare: Color.secondary
            }
        }

        var simbol: String {
            switch fel {
            case .confirmata: "checkmark"
            case .inAsteptare: "clock"
            case .telefonica: "phone.fill"
            case .blocare: "lock.fill"
            }
        }

        var etichetaFel: String {
            switch fel {
            case .confirmata: "Rezervare confirmată"
            case .inAsteptare: "Rezervare în așteptare"
            case .telefonica: "Rezervare la telefon"
            case .blocare: "Interval blocat"
            }
        }

        var titluScurt: String {
            titlu.split(separator: " ").first.map(String.init) ?? titlu
        }

        var intervalScurt: String {
            String(format: "%02d–%02d", oraStart, oraStart + durataOre)
        }
    }

    private func evenimente(_ zi: Date) -> [Eveniment] {
        guard let teren = terenAles else { return [] }
        let calendar = Calendar.current
        var rezultat: [Eveniment] = []

        func ceasuri(_ inceput: Date, _ sfarsit: Date) -> (Int, Int)? {
            guard calendar.isDate(inceput, inSameDayAs: zi) else { return nil }
            let start = calendar.component(.hour, from: inceput)
            let ore = max(1, Int((sfarsit.timeIntervalSince(inceput) / 3600).rounded()))
            return (start, ore)
        }

        for rezervare in rezervari where rezervare.teren.id == teren.id {
            guard rezervare.status == .confirmata || rezervare.status == .inAsteptare,
                  let (start, durata) = ceasuri(rezervare.inceput, rezervare.sfarsit)
            else { continue }
            rezultat.append(
                Eveniment(
                    id: rezervare.id,
                    titlu: rezervare.client?.nume ?? "Client",
                    subtitlu: rezervare.client?.telefon,
                    oraStart: start,
                    durataOre: durata,
                    fel: rezervare.status == .confirmata ? .confirmata : .inAsteptare
                )
            )
        }

        for blocare in blocari where blocare.terenId == teren.id {
            guard let (start, durata) = ceasuri(blocare.inceput, blocare.sfarsit) else { continue }
            rezultat.append(
                Eveniment(
                    id: blocare.id,
                    titlu: blocare.clientNume ?? blocare.motiv ?? "Blocat",
                    subtitlu: blocare.clientTelefon ?? blocare.motiv,
                    oraStart: start,
                    durataOre: durata,
                    fel: blocare.clientNume == nil ? .blocare : .telefonica
                )
            )
        }

        return rezultat
    }

    struct CelulaLibera: Identifiable {
        let zi: Date
        let ora: Int
        var id: String { "\(zi.timeIntervalSince1970)-\(ora)" }
    }

    /// Câte ore la rând sunt libere de la ora aleasă — limita pentru durată.
    private func maximOreLibere(_ zi: Date, de la: Int) -> Int {
        let ocupate = Set(evenimente(zi).flatMap { $0.oraStart..<($0.oraStart + $0.durataOre) })
        var total = 0
        var ora = la
        while ora < (ore.last.map { $0 + 1 } ?? la), !ocupate.contains(ora) {
            total += 1
            ora += 1
        }
        return max(1, total)
    }

    // MARK: - Săptămâna

    private var intervalSaptamana: String {
        guard let ultima = zile.last else { return "" }
        return "\(inceputSaptamana.ziScurta) – \(ultima.ziScurta)"
    }

    private var esteSaptamanaCurenta: Bool {
        Calendar.current.isDate(inceputSaptamana, inSameDayAs: Self.startulSaptamanii(Date()))
    }

    private func muta(_ saptamani: Int) {
        withAnimation(.snappy) {
            inceputSaptamana = Calendar.current.date(
                byAdding: .weekOfYear, value: saptamani, to: inceputSaptamana
            ) ?? inceputSaptamana
        }
    }

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

        if let id = terenAles?.id, let actualizat = terenuri.first(where: { $0.id == id }) {
            terenAles = actualizat
        } else {
            terenAles = terenuri.first
        }
        seIncarca = false
    }
}

// MARK: - Ce e într-un bloc

private struct DetaliuEveniment: View {
    let eveniment: CalendarView.Eveniment
    let reincarca: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var seSterge = false
    @State private var eroare: String?

    private var esteBlocare: Bool {
        switch eveniment.fel {
        case .blocare, .telefonica: true
        default: false
        }
    }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 10) {
                    Image(systemName: eveniment.simbol)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(eveniment.culoare, in: .circle)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(eveniment.titlu).font(.headline)
                        Text(eveniment.etichetaFel).font(.caption).foregroundStyle(.secondary)
                    }
                }
                LabeledContent("Ora", value: eveniment.intervalScurt.replacingOccurrences(of: "–", with: ":00 – ") + ":00")
                if let subtitlu = eveniment.subtitlu, !subtitlu.isEmpty {
                    LabeledContent("Detalii", value: subtitlu)
                }
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                if esteBlocare {
                    Button(role: .destructive) {
                        sterge()
                    } label: {
                        HStack {
                            Text(eveniment.fel == .telefonica ? "Anulează rezervarea" : "Deblochează ora")
                            Spacer()
                            if seSterge { ProgressView() }
                        }
                    }
                    .disabled(seSterge)
                } else {
                    Text("Rezervările clienților se gestionează din secțiunea Rezervări.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Interval")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Închide") { inchide() } }
        }
    }

    private func sterge() {
        seSterge = true
        Task {
            defer { seSterge = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "business/blocari/\(eveniment.id)", metoda: "DELETE"
                )
                reincarca()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}

// MARK: - Interval liber

private struct IntervalNou: View {
    let teren: Teren?
    let zi: Date
    let ora: Int
    let maximOre: Int
    let reincarca: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var mod = Mod.rezervare
    @State private var durata = 1
    @State private var clientNume = ""
    @State private var clientTelefon = ""
    @State private var motiv = ""
    @State private var eroare: String?
    @State private var seTrimite = false

    private enum Mod: String, CaseIterable {
        case rezervare = "Rezervare"
        case blocare = "Blocare"
    }

    private var gata: Bool {
        mod == .blocare || !clientNume.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        Form {
            Section {
                LabeledContent("Ziua", value: zi.ziLunga.capitalized)
                LabeledContent(
                    "Ora",
                    value: String(format: "%02d:00 – %02d:00", ora, ora + durata)
                )
                if let teren { LabeledContent("Teren", value: teren.nume) }
            }

            Section {
                Picker("Tip", selection: $mod.animation()) {
                    ForEach(Mod.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                Stepper("Durată: \(durata) \(durata == 1 ? "oră" : "ore")", value: $durata, in: 1...maximOre)
            } footer: {
                Text(mod == .rezervare
                     ? "Pentru cererile primite la telefon."
                     : "Pentru mentenanță sau evenimente proprii.")
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
                            Text(mod == .rezervare ? "Salvează rezervarea" : "Blochează")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite || !gata)
                .listRowBackground(gata ? Tema.accent : Color.gray.opacity(0.35))
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Interval liber")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func trimite() {
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
                    "business/blocari", metoda: "POST",
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
