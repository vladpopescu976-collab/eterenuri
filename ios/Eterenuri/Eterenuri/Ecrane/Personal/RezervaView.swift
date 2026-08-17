import SwiftUI

/// Alegerea zilei și a intervalului. Ideea de bază: ziua se vede întreagă, cu
/// orele libere și cele ocupate una lângă alta, ca să nu trebuiască încercat
/// „la ghici” ce e disponibil.
struct RezervaView: View {
    let teren: Teren
    /// Prezent când mutăm o rezervare — o excludem din orele ocupate.
    var rezervareExistenta: Rezervare?
    /// Ziua pe care se deschide ecranul; implicit, azi.
    var ziInitiala: Date?
    /// Ora preselectată — folosită doar de verificările automate.
    var oraInitiala: Int?
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
    private var ore: [Int] { Array(teren.oraDeschidere..<teren.oraInchidere) }

    private var oreLibere: Int { ore.filter { !esteOcupata($0) }.count }

    var body: some View {
        ZStack(alignment: .bottom) {
            Tema.fundal.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 14) {
                    selectorZile
                    rezumatZi
                    grilaOre
                    if !esteMutare { campObservatii }
                    if let eroare { casetaEroare(eroare) }
                    Color.clear.frame(height: 130)
                }
                .padding(.horizontal, Tema.spatiu)
                .padding(.top, 8)
            }

            bataieDeSubsol
        }
        .navigationTitle(esteMutare ? "Modifică rezervarea" : "Rezervă")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Închide") { inchide() } }
        }
        .task {
            if let existenta = rezervareExistenta {
                zi = existenta.inceput
            } else if let ziInitiala {
                zi = ziInitiala
            }
            await incarcaOre()
            if let oraInitiala {
                oraStart = oraInitiala
                oraSfarsit = oraInitiala + 1
            }
        }
    }

    // MARK: - Zile

    /// Următoarele două săptămâni, ca schimbarea zilei să fie un singur tap.
    private var zileApropiate: [Date] {
        let calendar = Calendar.current
        let azi = calendar.startOfDay(for: Date())
        return (0..<14).compactMap { calendar.date(byAdding: .day, value: $0, to: azi) }
    }

    private var selectorZile: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(zileApropiate, id: \.self) { data in
                    let aleasa = Calendar.current.isDate(data, inSameDayAs: zi)
                    Button {
                        withAnimation(.snappy) {
                            zi = data
                            oraStart = nil
                            oraSfarsit = nil
                            eroare = nil
                        }
                        Task { await incarcaOre() }
                    } label: {
                        VStack(spacing: 3) {
                            Text(data.zileiPrescurtat)
                                .font(.caption2.weight(.medium))
                                .textCase(.uppercase)
                            Text(data.numarZi)
                                .font(.title3.weight(.semibold))
                            if Calendar.current.isDateInToday(data) {
                                Circle().frame(width: 4, height: 4)
                            } else {
                                Color.clear.frame(width: 4, height: 4)
                            }
                        }
                        .frame(width: 52, height: 68)
                        .background {
                            if aleasa {
                                Tema.gradientAccent
                            } else {
                                Tema.fisa
                            }
                        }
                        .foregroundStyle(aleasa ? .white : .primary)
                        .clipShape(.rect(cornerRadius: 14, style: .continuous))
                    }
                    .apasabil()
                }
            }
            .padding(.vertical, 2)
        }
    }

    // MARK: - Rezumatul zilei

    private var rezumatZi: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(zi.ziLunga.capitalized).font(.subheadline.weight(.semibold))
                if seIncarcaOre {
                    Text("Se verifică disponibilitatea…")
                        .font(.caption).foregroundStyle(.secondary)
                } else if oreLibere == 0 {
                    Text("Nicio oră liberă în această zi")
                        .font(.caption).foregroundStyle(Tema.ocupat)
                } else {
                    Text("\(oreLibere) din \(ore.count) ore libere")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()

            // Bara arată dintr-o privire cât de plină e ziua.
            if !seIncarcaOre {
                HStack(spacing: 2) {
                    ForEach(ore, id: \.self) { ora in
                        Capsule()
                            .fill(esteOcupata(ora) ? Tema.ocupat.opacity(0.75) : Tema.accent.opacity(0.35))
                            .frame(width: 3, height: 22)
                    }
                }
            }
        }
        .fisa()
    }

    // MARK: - Orele

    private var grilaOre: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(indicatie).font(.subheadline.weight(.medium))
                Spacer()
                if oraStart != nil {
                    Button("Șterge") {
                        withAnimation(.snappy) {
                            oraStart = nil
                            oraSfarsit = nil
                            eroare = nil
                        }
                    }
                    .font(.caption.weight(.medium))
                }
            }

            if seIncarcaOre {
                LazyVGrid(columns: [.init(.adaptive(minimum: 74), spacing: 8)], spacing: 8) {
                    ForEach(ore, id: \.self) { _ in ScheletFisa(inaltime: 46) }
                }
            } else {
                LazyVGrid(columns: [.init(.adaptive(minimum: 74), spacing: 8)], spacing: 8) {
                    ForEach(ore, id: \.self) { ora in
                        CelulaOra(eticheta: format(ora), stare: stareOra(ora)) { alegeOra(ora) }
                    }
                }
            }

            if let start = oraStart {
                selectorDurata(start)
            }

            legenda
        }
        .fisa()
    }

    /// După ce s-a ales începutul, durata e mai ușor de gândit decât o a doua
    /// oră căutată în grilă. Apar doar duratele care chiar încap.
    private func selectorDurata(_ start: Int) -> some View {
        let maxim = maximOreLibere(de: start)
        return VStack(alignment: .leading, spacing: 8) {
            Divider()
            Text("Cât durează?").font(.subheadline.weight(.medium))

            HStack(spacing: 8) {
                ForEach(1...min(maxim, 4), id: \.self) { ore in
                    let ales = oraSfarsit == start + ore
                    Button {
                        withAnimation(.snappy) {
                            eroare = nil
                            oraSfarsit = start + ore
                        }
                    } label: {
                        VStack(spacing: 1) {
                            Text("\(ore)").font(.subheadline.weight(.semibold))
                            Text(ore == 1 ? "oră" : "ore").font(.system(size: 9))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(ales ? Tema.gradientAccent : nil)
                        .background(ales ? nil : Tema.fundal)
                        .foregroundStyle(ales ? .white : .primary)
                        .clipShape(.rect(cornerRadius: 10, style: .continuous))
                    }
                    .apasabil()
                }
            }

            if maxim == 1 {
                Text("După \(format(start + 1)) urmează un interval ocupat.")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
    }

    /// Câte ore la rând sunt libere începând cu ora dată.
    private func maximOreLibere(de start: Int) -> Int {
        var total = 0
        var ora = start
        while ora < teren.oraInchidere, !esteOcupata(ora) {
            total += 1
            ora += 1
        }
        return max(1, total)
    }

    private var indicatie: String {
        oraStart == nil ? "Alege ora de început" : "Intervalul ales"
    }

    private var legenda: some View {
        HStack(spacing: 14) {
            eticheta(culoare: Tema.fisa, contur: true, text: "Liber")
            eticheta(culoare: Tema.ocupat.opacity(0.16), contur: false, text: "Ocupat")
            eticheta(culoare: Tema.accent, contur: false, text: "Ales")
            Spacer()
        }
        .padding(.top, 2)
    }

    private func eticheta(culoare: Color, contur: Bool, text: String) -> some View {
        HStack(spacing: 5) {
            RoundedRectangle(cornerRadius: 4)
                .fill(culoare)
                .frame(width: 14, height: 14)
                .overlay {
                    if contur {
                        RoundedRectangle(cornerRadius: 4).stroke(.secondary.opacity(0.3))
                    }
                }
            Text(text).font(.caption2).foregroundStyle(.secondary)
        }
    }

    private var campObservatii: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Observații (opțional)").font(.subheadline.weight(.medium))
            TextField("Ex. avem nevoie de mingi.", text: $observatii, axis: .vertical)
                .lineLimit(2...4)
                .padding(10)
                .background(Tema.fundal, in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
        }
        .fisa()
    }

    private func casetaEroare(_ mesaj: String) -> some View {
        Label(mesaj, systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(Tema.ocupat)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Tema.ocupat.opacity(0.10), in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
    }

    // MARK: - Subsolul cu totalul

    private var bataieDeSubsol: some View {
        VStack(spacing: 10) {
            if let start = oraStart, let sfarsit = oraSfarsit {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(format(start)) – \(format(sfarsit))")
                            .font(.subheadline.weight(.semibold))
                        Text("\(sfarsit - start) \(sfarsit - start == 1 ? "oră" : "ore") · \(zi.ziScurta)")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text("\(Int(teren.pretPeOra) * (sfarsit - start)) RON")
                        .font(.title3.weight(.bold))
                }
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            ButonPrincipal(
                titlu: esteMutare ? "Salvează modificarea" : "Trimite cererea",
                simbol: esteMutare ? "checkmark" : "paperplane.fill",
                seIncarca: seTrimite,
                activ: oraStart != nil && oraSfarsit != nil,
                actiune: trimite
            )
        }
        .padding(Tema.spatiu)
        .background(.regularMaterial)
        .animation(.snappy, value: oraSfarsit)
    }

    // MARK: - Stări ore

    enum StareOra { case libera, ocupata, inceput, sfarsit, inInterval }

    private func stareOra(_ ora: Int) -> StareOra {
        if ora == oraStart { return .inceput }
        if let sfarsit = oraSfarsit, ora == sfarsit - 1 { return .sfarsit }
        if let start = oraStart, let sfarsit = oraSfarsit, ora > start, ora < sfarsit {
            return .inInterval
        }
        return esteOcupata(ora) ? .ocupata : .libera
    }

    private func esteOcupata(_ ora: Int) -> Bool {
        let calendar = Calendar.current
        guard
            let inceput = calendar.date(bySettingHour: ora, minute: 0, second: 0, of: zi),
            let sfarsit = calendar.date(byAdding: .hour, value: 1, to: inceput)
        else { return false }

        // Orele deja trecute din ziua curentă nu mai pot fi rezervate.
        if sfarsit <= Date() { return true }

        return ocupate.contains { $0.inceput < sfarsit && $0.sfarsit > inceput }
    }

    private func alegeOra(_ ora: Int) {
        if esteOcupata(ora) {
            let trecut = Calendar.current.isDateInToday(zi)
                && (Calendar.current.date(bySettingHour: ora, minute: 59, second: 0, of: zi) ?? .distantPast) < Date()
            eroare = trecut
                ? "Ora \(format(ora)) a trecut deja."
                : "Intervalul \(format(ora))–\(format(ora + 1)) este deja ocupat. Alege altă oră."
            return
        }

        withAnimation(.snappy) {
            eroare = nil
            // Apăsarea alege mereu ora de început; durata se alege dedesubt.
            oraStart = ora
            oraSfarsit = ora + 1
        }
    }

    private func format(_ ora: Int) -> String { String(format: "%02d:00", ora) }

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
            let miezul = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: zi),
            let final = calendar.date(byAdding: .hour, value: sfarsit, to: miezul)
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
                        "rezervari/\(existenta.id)", metoda: "PATCH",
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
                        "rezervari", metoda: "POST",
                        corp: Corp(
                            terenId: teren.id, inceput: inceput, sfarsit: final,
                            observatii: observatii.isEmpty ? nil : observatii
                        )
                    )
                }
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
                // Cineva poate fi luat intervalul între timp, deci reîmprospătăm.
                await incarcaOre()
                withAnimation { oraStart = nil; oraSfarsit = nil }
            }
        }
    }
}

private struct CelulaOra: View {
    let eticheta: String
    let stare: RezervaView.StareOra
    let apasa: () -> Void

    var body: some View {
        Button(action: apasa) {
            VStack(spacing: 2) {
                Text(eticheta).font(.subheadline.weight(.semibold))
                if stare == .ocupata {
                    Text("ocupat").font(.system(size: 9, weight: .medium))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 46)
            .background(fundal)
            .foregroundStyle(culoareText)
            .clipShape(.rect(cornerRadius: Tema.razaMica, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Tema.razaMica, style: .continuous)
                    .stroke(contur, lineWidth: 1)
            }
        }
        .apasabil()
    }

    @ViewBuilder
    private var fundal: some View {
        switch stare {
        case .inceput, .sfarsit: Tema.gradientAccent
        case .inInterval: Tema.accent.opacity(0.18)
        case .ocupata: Tema.ocupat.opacity(0.10)
        case .libera: Tema.fundal
        }
    }

    private var culoareText: Color {
        switch stare {
        case .inceput, .sfarsit: .white
        case .inInterval: Tema.accent
        case .ocupata: Tema.ocupat.opacity(0.85)
        case .libera: .primary
        }
    }

    private var contur: Color {
        switch stare {
        case .ocupata: Tema.ocupat.opacity(0.25)
        case .libera: .secondary.opacity(0.18)
        default: .clear
        }
    }
}
