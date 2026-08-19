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
    @State private var mod = Mod.zi
    @State private var ziAleasa = Calendar.current.startOfDay(for: Date())
    @State private var inceputSaptamana = CalendarView.startulSaptamanii(Date())
    @State private var evenimentAles: Eveniment?
    @State private var celulaLibera: CelulaLibera?

    /// Săptămâna întreagă are șapte coloane de ~45pt pe un telefon, în care
    /// o rezervare de o oră încape doar ca o iconiță. Pe zi, același bloc are
    /// toată lățimea ecranului și poate scrie clar de la cât până la cât ține.
    enum Mod: String, CaseIterable {
        case zi = "Zi"
        case saptamana = "Săptămână"
    }

    private let latimeOre: CGFloat = 34
    private let inaltimeOra: CGFloat = 54
    private let inaltimeOraZi: CGFloat = 62

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
                    comutatorMod
                    if mod == .zi {
                        selectorZile
                        agendaZilei
                    } else {
                        navigatorSaptamana
                        antetZile
                        grila
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await incarca()
            #if DEBUG
            // Deschide o anumită zi („2026-08-19”), pentru verificări automate.
            if let text = ProcessInfo.processInfo.environment["ETERENURI_ZI"],
               let data = Self.dinText(text) {
                ziAleasa = data
                inceputSaptamana = Self.startulSaptamanii(data)
            }
            if ProcessInfo.processInfo.environment["ETERENURI_MOD"] == "saptamana" {
                mod = .saptamana
            }
            #endif
        }
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

    private var comutatorMod: some View {
        Picker("Mod", selection: $mod.animation(.snappy)) {
            ForEach(Mod.allCases, id: \.self) { Text($0.rawValue).tag($0) }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
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
            ForEach(evenimenteVizibile(zi), id: \.eveniment.id) { eveniment, start, durata in
                let sus = CGFloat(start - (ore.first ?? 0)) * inaltimeOra
                let inaltime = max(CGFloat(durata) * inaltimeOra - 4, 22)

                Button {
                    evenimentAles = eveniment
                } label: {
                    VStack(alignment: .leading, spacing: 1) {
                        HStack(spacing: 2) {
                            Image(systemName: eveniment.simbol)
                                .font(.system(size: 8, weight: .bold))
                            Spacer(minLength: 0)
                        }
                        // Ora e primul lucru scris: într-o coloană de 45pt,
                        // numele clientului oricum nu încape întreg, dar
                        // intervalul da.
                        Text(eveniment.intervalScurt)
                            .font(.system(size: 9, weight: .bold).monospacedDigit())
                            .minimumScaleFactor(0.8)
                            .lineLimit(1)
                        if inaltime > 62 {
                            Text(eveniment.titlu)
                                .font(.system(size: 8, weight: .medium))
                                .lineLimit(inaltime > 100 ? 3 : 2)
                                .multilineTextAlignment(.leading)
                                .minimumScaleFactor(0.85)
                        }
                        Spacer(minLength: 0)
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

    // MARK: - Ziua

    /// Două săptămâni înainte, cu un semn pentru zilele care au deja ceva.
    private var zileApropiate: [Date] {
        let calendar = Calendar.current
        let azi = calendar.startOfDay(for: Date())
        return (0..<14).compactMap { calendar.date(byAdding: .day, value: $0, to: azi) }
    }

    private var selectorZile: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(zileApropiate, id: \.self) { zi in
                    let aleasa = Calendar.current.isDate(zi, inSameDayAs: ziAleasa)
                    let cate = evenimenteVizibile(zi).count
                    Button {
                        withAnimation(.snappy) { ziAleasa = zi }
                    } label: {
                        VStack(spacing: 2) {
                            Text(zi.zileiPrescurtat.prefix(3).uppercased())
                                .font(.system(size: 9, weight: .semibold))
                            Text(zi.numarZi)
                                .font(.title3.weight(.semibold))
                            // Un punct pentru fiecare interval ocupat, până la
                            // trei — arată dintr-o privire cât de plină e ziua.
                            HStack(spacing: 2) {
                                ForEach(0..<3, id: \.self) { index in
                                    Circle()
                                        .fill(index < cate ? (aleasa ? Color.white : Tema.accent) : .clear)
                                        .frame(width: 4, height: 4)
                                }
                            }
                        }
                        .frame(width: 54, height: 70)
                        .background {
                            if aleasa { Tema.gradientAccent } else { Tema.fisa }
                        }
                        .foregroundStyle(aleasa ? .white : .primary)
                        .clipShape(.rect(cornerRadius: 14, style: .continuous))
                    }
                    .apasabil()
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 4)
        }
    }

    private var agendaZilei: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 10) {
                rezumatZi

                ZStack(alignment: .topLeading) {
                    randuriLibere
                    blocuriZi
                }
                .overlay(alignment: .top) { liniaAcumZi }
            }
            .padding(.horizontal, 14)
            .padding(.top, 8)
            .padding(.bottom, 110)
        }
    }

    private var rezumatZi: some View {
        let deAzi = evenimenteVizibile(ziAleasa)
        let oreOcupate = deAzi.reduce(0) { $0 + $1.durata }
        return HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(ziAleasa.ziLunga.capitalized)
                    .font(.subheadline.weight(.semibold))
                Text(deAzi.isEmpty
                     ? "Nimic programat — ziua e liberă"
                     : "\(deAzi.count) \(deAzi.count == 1 ? "interval ocupat" : "intervale ocupate") · \(oreOcupate) \(oreOcupate == 1 ? "oră" : "ore")")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if !ore.isEmpty {
                HStack(spacing: 2) {
                    let ocupate = Set(deAzi.flatMap { $0.start..<($0.start + $0.durata) })
                    ForEach(ore, id: \.self) { ora in
                        Capsule()
                            .fill(ocupate.contains(ora) ? Tema.ocupat.opacity(0.75) : Tema.accent.opacity(0.30))
                            .frame(width: 3, height: 22)
                    }
                }
            }
        }
        .fisa(padding: 12)
    }

    /// Fundalul: câte un rând gol pe oră, apăsabil ca să adaugi ceva acolo.
    private var randuriLibere: some View {
        VStack(spacing: 0) {
            ForEach(ore, id: \.self) { ora in
                Button {
                    celulaLibera = CelulaLibera(zi: ziAleasa, ora: ora)
                } label: {
                    HStack(spacing: 10) {
                        Text(String(format: "%02d:00", ora))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 44, alignment: .leading)

                        HStack {
                            Text("Liber")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                            Spacer()
                            Image(systemName: "plus")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.horizontal, 12)
                        .frame(maxWidth: .infinity)
                        .frame(height: inaltimeOraZi - 6)
                        .background(Tema.fisa, in: .rect(cornerRadius: 12, style: .continuous))
                    }
                    .frame(height: inaltimeOraZi)
                }
                .buttonStyle(.plain)
            }
        }
    }

    /// Blocurile ocupate, desenate peste rânduri: unul singur, înalt cât
    /// durata lui, cu ora de început și cea de final scrise pe el.
    private var blocuriZi: some View {
        ZStack(alignment: .topLeading) {
            ForEach(evenimenteVizibile(ziAleasa), id: \.eveniment.id) { eveniment, start, durata in
                let sus = CGFloat(start - (ore.first ?? 0)) * inaltimeOraZi
                let inaltime = CGFloat(durata) * inaltimeOraZi - 6

                Button {
                    evenimentAles = eveniment
                } label: {
                    HStack(spacing: 0) {
                        // Lăsăm loc pentru coloana cu ore, ca blocul să înceapă
                        // exact în dreptul orei lui.
                        Color.clear.frame(width: 54, height: 1)
                        BlocZi(eveniment: eveniment, inaltime: inaltime)
                    }
                    .frame(height: inaltime)
                }
                .buttonStyle(.plain)
                .offset(y: sus)
            }
        }
        // Fără înălțimea întreagă, grupul se strânge pe blocuri și le mută.
        .frame(height: CGFloat(ore.count) * inaltimeOraZi, alignment: .top)
    }

    @ViewBuilder
    private var liniaAcumZi: some View {
        let acum = Date()
        if Calendar.current.isDate(ziAleasa, inSameDayAs: acum),
           let prima = ore.first, let ultima = ore.last {
            let oraAcum = Double(Calendar.current.component(.hour, from: acum))
                + Double(Calendar.current.component(.minute, from: acum)) / 60
            if oraAcum >= Double(prima) && oraAcum <= Double(ultima + 1) {
                HStack(spacing: 0) {
                    Color.clear.frame(width: 48, height: 1)
                    Rectangle().fill(.red).frame(height: 1.5)
                        .overlay(alignment: .leading) {
                            Circle().fill(.red).frame(width: 6, height: 6).offset(x: -3)
                        }
                }
                .offset(y: CGFloat(oraAcum - Double(prima)) * inaltimeOraZi)
                .allowsHitTesting(false)
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
        /// Prezent când intervalul face parte dintr-o serie săptămânală.
        var serieId: String?

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

        /// Prescurtat, pentru coloanele înguste din vizualizarea pe săptămână.
        var intervalScurt: String {
            String(format: "%02d–%02d", oraStart, oraStart + durataOre)
        }

        /// Întreg, pentru orice loc în care încape: „09:00 – 11:00”.
        var interval: String {
            String(format: "%02d:00 – %02d:00", oraStart, oraStart + durataOre)
        }

        var durataText: String {
            "\(durataOre) \(durataOre == 1 ? "oră" : "ore")"
        }
    }

    /// Evenimentele zilei, cu poziția tăiată la marginile programului afișat.
    ///
    /// Programul unui teren se poate schimba după ce s-au făcut rezervări, iar
    /// o rezervare rămasă dinainte de ora de deschidere primea un decalaj
    /// negativ: se desena deasupra grilei, peste rezumatul zilei. Textul rămâne
    /// intervalul adevărat; doar dreptunghiul e tăiat.
    private func evenimenteVizibile(_ zi: Date) -> [(eveniment: Eveniment, start: Int, durata: Int)] {
        guard let prima = ore.first, let ultima = ore.last else { return [] }
        let inchidere = ultima + 1
        return evenimente(zi).compactMap { eveniment in
            let start = max(eveniment.oraStart, prima)
            let final = min(eveniment.oraStart + eveniment.durataOre, inchidere)
            guard final > start else { return nil }
            return (eveniment, start, final - start)
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
                    fel: blocare.clientNume == nil ? .blocare : .telefonica,
                    serieId: blocare.serieId
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
        let ocupate = Set(evenimenteVizibile(zi).flatMap { $0.start..<($0.start + $0.durata) })
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

    #if DEBUG
    private static func dinText(_ text: String) -> Date? {
        let bucati = text.split(separator: "-").compactMap { Int($0) }
        guard bucati.count == 3 else { return nil }
        return Calendar.current.date(
            from: DateComponents(year: bucati[0], month: bucati[1], day: bucati[2])
        )
    }
    #endif

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
    @State private var stergeSeria = false
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
                LabeledContent("Ora", value: eveniment.interval)
                LabeledContent("Durată", value: eveniment.durataText)
                if eveniment.serieId != nil {
                    LabeledContent("Se repetă", value: "Săptămânal")
                }
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
                            if seSterge && !stergeSeria { ProgressView() }
                        }
                    }
                    .disabled(seSterge)

                    if let serieId = eveniment.serieId {
                        Button(role: .destructive) {
                            stergeToataSeria(serieId)
                        } label: {
                            HStack {
                                Text("Șterge toată seria")
                                Spacer()
                                if seSterge && stergeSeria { ProgressView() }
                            }
                        }
                        .disabled(seSterge)
                    }
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

    /// Șterge toate aparițiile viitoare, nu doar cea apăsată: o serie de un an
    /// s-ar dezactiva altfel apăsând de cincizeci de ori.
    private func stergeToataSeria(_ serieId: String) {
        struct Corp: Encodable { let serieId: String }
        struct Raspuns: Decodable { let sterse: Int }

        eroare = nil
        stergeSeria = true
        seSterge = true
        Task {
            defer { seSterge = false; stergeSeria = false }
            do {
                let _: Raspuns = try await ApiClient.shared.cere(
                    "business/blocari", metoda: "DELETE", corp: Corp(serieId: serieId), ca: Raspuns.self
                )
                reincarca()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
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

// MARK: - Blocul de timp din agenda zilei

/// Un interval ocupat, desenat ca un bloc plin de la ora de început până la
/// cea de final. Culoarea spune felul, iar textul spune orele — fără să fie
/// nevoie să numeri rânduri ca să afli până când e ocupat terenul.
private struct BlocZi: View {
    let eveniment: CalendarView.Eveniment
    let inaltime: CGFloat

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            // Muchia plină leagă vizual toate orele blocului.
            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                .fill(eveniment.culoare)
                .frame(width: 5)
                .padding(.vertical, 8)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(eveniment.interval)
                        .font(.subheadline.weight(.bold).monospacedDigit())
                        .foregroundStyle(eveniment.culoare)
                    Text(eveniment.durataText)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(eveniment.culoare.opacity(0.16), in: .capsule)
                        .foregroundStyle(eveniment.culoare)
                }

                Text(eveniment.titlu)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                // Sub 90pt (o oră) rândurile de mai jos nu mai încap fără să
                // se înghesuie, așa că le arătăm doar la blocurile mai lungi.
                if inaltime > 90 {
                    Label(eveniment.etichetaFel, systemImage: eveniment.simbol)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                if inaltime > 130, let subtitlu = eveniment.subtitlu, !subtitlu.isEmpty {
                    Text(subtitlu)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, 8)

            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.tertiary)
                .padding(.top, 12)
                .padding(.trailing, 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: inaltime, alignment: .top)
        // Blocul stă peste rândurile goale ale orelor, deci fundalul trebuie
        // să fie opac. Doar cu tenta colorată, prin el se citeau „Liber” și
        // butonul de adăugare ale orelor de dedesubt.
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Tema.fisa)
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(eveniment.culoare.opacity(0.15))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(eveniment.culoare.opacity(0.35), lineWidth: 1)
        }
    }
}
