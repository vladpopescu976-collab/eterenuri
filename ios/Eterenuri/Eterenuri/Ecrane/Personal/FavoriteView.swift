import SwiftUI

struct FavoriteView: View {
    @Environment(Sesiune.self) private var sesiune

    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true

    var body: some View {
        ZStack {
            Tema.fundal.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    if !sesiune.esteConectat {
                        CereCont(
                            simbol: "heart",
                            titlu: "Salvează terenurile preferate",
                            detaliu: "Cu un cont Personal poți păstra terenurile care îți plac și le găsești aici."
                        )
                        .fisa()
                    } else if seIncarca {
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
        .refreshable { if sesiune.esteConectat { await incarca() } }
        .task { if sesiune.esteConectat { await incarca() } }
    }

    private func incarca() async {
        terenuri = (try? await ApiClient.shared.cere("favorite", ca: [Teren].self)) ?? []
        seIncarca = false
    }
}
