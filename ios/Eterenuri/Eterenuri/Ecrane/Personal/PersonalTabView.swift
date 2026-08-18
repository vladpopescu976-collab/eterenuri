import SwiftUI

struct PersonalTabView: View {
    #if DEBUG
    /// Deschide direct rezervarea unui teren, pentru verificări automate.
    @State private var terenDebug: String? =
        ProcessInfo.processInfo.environment["ETERENURI_REZERVA"]
    @State private var terenIncarcat: Teren?
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
        .sheet(item: Binding(
            get: { terenIncarcat },
            set: { _ in terenIncarcat = nil }
        )) { teren in
            NavigationStack {
                RezervaView(
                    teren: teren,
                    ziInitiala: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
                    oraInitiala: ProcessInfo.processInfo.environment["ETERENURI_ORA"].flatMap(Int.init)
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
                    if let telefon = utilizator.telefon, !telefon.isEmpty {
                        LabeledContent("Telefon", value: telefon)
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
            }
        }
        .navigationTitle("Contul meu")
    }
}
