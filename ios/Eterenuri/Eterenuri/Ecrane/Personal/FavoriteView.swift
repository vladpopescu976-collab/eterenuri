import SwiftUI

struct FavoriteView: View {
    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true

    var body: some View {
        List {
            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "heart",
                    titlu: "Niciun teren salvat",
                    detaliu: "Apasă pe inimă pe pagina unui teren ca să îl găsești mai repede."
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(terenuri) { teren in
                    NavigationLink(value: teren.id) { RandTeren(teren: teren) }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Favorite")
        .navigationDestination(for: String.self) { id in
            DetaliuTerenView(terenId: id)
        }
        .refreshable { await incarca() }
        .task { await incarca() }
    }

    private func incarca() async {
        terenuri = (try? await ApiClient.shared.cere("favorite", ca: [Teren].self)) ?? []
        seIncarca = false
    }
}
