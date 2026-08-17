import SwiftUI

struct PersonalTabView: View {
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
    }
}

struct ContView: View {
    @Environment(Sesiune.self) private var sesiune

    var body: some View {
        List {
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

            Section {
                Button("Deconectare", role: .destructive) {
                    Task { await sesiune.deconecteaza() }
                }
            }
        }
        .navigationTitle("Contul meu")
    }
}
