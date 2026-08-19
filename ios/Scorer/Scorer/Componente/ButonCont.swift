import SwiftUI

/// Iconița de cont din colțul din dreapta sus. Fără cont, deschide
/// autentificarea; conectat, arată inițialele și opțiunile contului.
struct ButonCont: View {
    @Environment(Sesiune.self) private var sesiune
    @State private var arataFoaia = false

    var body: some View {
        Button {
            arataFoaia = true
        } label: {
            if let utilizator = sesiune.utilizator {
                Text(initiale(utilizator.nume))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(Tema.gradientAccent, in: .circle)
            } else {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(.secondary)
                    .frame(width: 38, height: 38)
                    .background(Tema.fisa, in: .circle)
            }
        }
        .buttonStyle(.plain)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 3)
        .sheet(isPresented: $arataFoaia) {
            if sesiune.esteConectat {
                NavigationStack { ContView() }
                    .presentationDetents([.medium])
            } else {
                AutentificareView()
            }
        }
    }

    private func initiale(_ nume: String) -> String {
        nume.split(separator: " ").prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }
}

/// Ce se vede în locul conținutului când e nevoie de cont.
struct CereCont: View {
    let simbol: String
    let titlu: String
    let detaliu: String

    @State private var arataAutentificarea = false

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: simbol)
                .font(.system(size: 30, weight: .light))
                .foregroundStyle(Tema.accent)
                .frame(width: 68, height: 68)
                .background(Tema.accent.opacity(0.10), in: .circle)

            Text(titlu).font(.headline)
            Text(detaliu)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            ButonPrincipal(titlu: "Conectează-te", simbol: "person.crop.circle") {
                arataAutentificarea = true
            }
            .padding(.top, 6)
            .padding(.horizontal, 30)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 24)
        .sheet(isPresented: $arataAutentificarea) { AutentificareView() }
    }
}
