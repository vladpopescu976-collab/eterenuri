import SwiftUI

@main
struct EterenuriApp: App {
    @State private var sesiune = Sesiune()

    var body: some Scene {
        WindowGroup {
            RadacinaView()
                .environment(sesiune)
                .task { await sesiune.porneste() }
                .tint(Tema.accent)
                .environment(\.locale, .aplicatie)
        }
    }
}

struct RadacinaView: View {
    @Environment(Sesiune.self) private var sesiune

    var body: some View {
        Group {
            if sesiune.seIncarca {
                ProgressView().controlSize(.large)
            } else if !sesiune.esteConectat {
                AutentificareView()
            } else if sesiune.esteBusiness {
                // Rolurile sunt complet separate, ca pe web: un cont Business
                // nu vede niciodată ecranele de jucător.
                BusinessTabView()
            } else {
                PersonalTabView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: sesiune.esteConectat)
    }
}
