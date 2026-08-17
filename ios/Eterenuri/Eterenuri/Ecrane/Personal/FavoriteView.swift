import SwiftUI

struct FavoriteView: View {
    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    if seIncarca {
                        ForEach(0..<2, id: \.self) { _ in ScheletFisa(inaltime: 232) }
                    } else if terenuri.isEmpty {
                        StareGoala(
                            simbol: "heart",
                            titlu: "Niciun teren salvat",
                            detaliu: "Apasă pe inimă pe pagina unui teren și îl găsești aici."
                        )
                        .fisa()
                    } else {
                        ForEach(terenuri) { teren in
                            NavigationLink(value: teren.id) { CardTeren(teren: teren) }
                                .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, Tema.spatiu)
                .padding(.vertical, 8)
            }
        }
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
