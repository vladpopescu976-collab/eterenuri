import SwiftUI

struct PersonalTabView: View {
    #if DEBUG
    /// Deschide direct rezervarea unui teren, pentru verificări automate.
    @State private var terenDebug: String? =
        ProcessInfo.processInfo.environment["SCORER_REZERVA"]
    @State private var terenIncarcat: Teren?
    /// Deschide direct foaia de autentificare, pentru verificări automate.
    @State private var arataAutentificarea =
        ProcessInfo.processInfo.environment["SCORER_AUTENTIFICARE"] == "1"
    #endif

    var body: some View {
        TabView {
            Tab("Caută", systemImage: "magnifyingglass") {
                NavigationStack { CautaTerenuriView() }
            }
            Tab("Favorite", systemImage: "heart") {
                NavigationStack { FavoriteView() }
            }
            Tab("Rezervări", systemImage: "calendar") {
                NavigationStack { RezervarileMeleView() }
            }
            Tab("Cont", systemImage: "person") {
                NavigationStack { ContView() }
            }
        }
        #if DEBUG
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
        .sheet(item: Binding(
            get: { terenIncarcat },
            set: { _ in terenIncarcat = nil }
        )) { teren in
            NavigationStack {
                RezervaView(
                    teren: teren,
                    ziInitiala: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
                    oraInitiala: ProcessInfo.processInfo.environment["SCORER_ORA"].flatMap(Int.init)
                ) {}
            }
        }
        .task {
            guard let id = terenDebug else { return }
            let detaliu: DetaliuTeren? = try? await ApiClient.shared.cere(
                "terenuri/\(id)", ca: DetaliuTeren.self
            )
            terenIncarcat = detaliu?.teren
        }
        #endif
    }
}

struct ContView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var arataStergerea = false

    var body: some View {
        List {
            if sesiune.utilizator == nil {
                CereCont(
                    simbol: "person.crop.circle",
                    titlu: "Nu ești conectat",
                    detaliu: "Poți răsfoi terenurile liber. Pentru rezervări și favorite ai nevoie de un cont Personal, iar dacă ai terenuri, de unul Business."
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }

            if let utilizator = sesiune.utilizator {
                Section {
                    LabeledContent("Nume", value: utilizator.nume)
                    LabeledContent("Email", value: utilizator.email)
                    LabeledContent("Tip cont", value: utilizator.rol == .business ? "Business" : "Personal")
                    if let firma = utilizator.numeFirma, !firma.isEmpty {
                        LabeledContent("Firmă", value: firma)
                    }
                    if let telefon = utilizator.telefon, !telefon.isEmpty {
                        LabeledContent("Telefon", value: telefon)
                    }
                    if let oras = utilizator.oras, !oras.isEmpty {
                        LabeledContent("Oraș", value: oras)
                    }
                    if let sporturi = utilizator.sporturi, !sporturi.isEmpty {
                        LabeledContent(
                            "Sporturi",
                            value: sporturi.map(\.eticheta).joined(separator: ", ")
                        )
                    }
                    if let din = utilizator.membruDin {
                        LabeledContent(
                            "Membru din",
                            value: din.formatted(.dateTime.month(.wide).year().locale(.aplicatie))
                        )
                    }
                }
            }

            if sesiune.esteConectat {
                Section {
                    Button("Deconectare", role: .destructive) {
                        Task { await sesiune.deconecteaza() }
                        inchide()
                    }
                }

                Section {
                    Button("Șterge contul", role: .destructive) { arataStergerea = true }
                } header: {
                    Text("Zonă periculoasă")
                } footer: {
                    Text(sesiune.esteBusiness
                         ? "Se șterg definitiv contul, terenurile publicate și istoricul rezervărilor."
                         : "Se șterg definitiv contul, rezervările, favoritele și recenziile tale.")
                }
            }
        }
        .navigationTitle("Contul meu")
        .sheet(isPresented: $arataStergerea) {
            NavigationStack { StergeContulView() }
                .presentationDetents([.height(380)])
        }
    }
}

/// Ștergerea contului cere parola din nou: nu se poate desface, iar un telefon
/// lăsat deblocat pe masă n-ar trebui să fie de ajuns.
private struct StergeContulView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var parola = ""
    @State private var confirmare = ""
    @State private var eroare: String?
    @State private var seSterge = false

    private let cuvant = "STERGE"

    private var gata: Bool {
        !parola.isEmpty && confirmare.trimmingCharacters(in: .whitespaces).uppercased() == cuvant
    }

    var body: some View {
        Form {
            Section {
                SecureField("Parola contului", text: $parola)
                    .textContentType(.password)
                TextField("Scrie \(cuvant)", text: $confirmare)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            } footer: {
                Text("Operațiunea nu poate fi anulată, iar datele nu pot fi recuperate.")
            }

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            Section {
                Button(role: .destructive) {
                    sterge()
                } label: {
                    HStack {
                        Spacer()
                        if seSterge { ProgressView() } else { Text("Șterge definitiv").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .disabled(!gata || seSterge)
            }
        }
        .navigationTitle("Ștergi contul?")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func sterge() {
        eroare = nil
        seSterge = true
        Task {
            defer { seSterge = false }
            do {
                try await sesiune.stergeContul(parola: parola)
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
