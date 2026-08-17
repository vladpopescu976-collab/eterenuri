import SwiftUI

/// Un singur loc pentru culori, spațieri și forme, ca ecranele să arate ca o
/// familie, nu ca niște pagini făcute separat.
enum Tema {
    // MARK: Culori

    static let accent = Color(red: 0.09, green: 0.52, blue: 0.29)
    static let accentDeschis = Color(red: 0.36, green: 0.75, blue: 0.48)

    /// Fundalul general — puțin mai cald decât albul pur, ca fișele să iasă în față.
    static let fundal = Color(.systemGroupedBackground)
    static let fisa = Color(.secondarySystemGroupedBackground)

    static let ocupat = Color(red: 0.85, green: 0.30, blue: 0.29)
    static let asteptare = Color(red: 0.93, green: 0.62, blue: 0.14)

    static let gradientAccent = LinearGradient(
        colors: [accent, accentDeschis],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Folosit acolo unde nu există poză, ca locul să nu arate gol.
    static let gradientLoc = LinearGradient(
        colors: [accent.opacity(0.22), accentDeschis.opacity(0.10)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: Forme și spațiere

    static let razaFisa: CGFloat = 18
    static let razaMica: CGFloat = 12
    static let spatiu: CGFloat = 16
}

// MARK: - Fișă

/// Suprafața standard pe care stă conținutul.
struct Fisa: ViewModifier {
    var padding: CGFloat = Tema.spatiu

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

extension View {
    func fisa(padding: CGFloat = Tema.spatiu) -> some View {
        modifier(Fisa(padding: padding))
    }

    /// Micșorare scurtă la apăsare — dă senzația că butonul „răspunde”.
    func apasabil() -> some View {
        buttonStyle(ApasabilStyle())
    }
}

struct ApasabilStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

// MARK: - Butonul principal

struct ButonPrincipal: View {
    let titlu: String
    var simbol: String?
    var seIncarca = false
    var activ = true
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            HStack(spacing: 8) {
                if seIncarca {
                    ProgressView().tint(.white)
                } else if let simbol {
                    Image(systemName: simbol)
                }
                Text(titlu).fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background {
                if activ && !seIncarca {
                    Tema.gradientAccent
                } else {
                    Color.gray.opacity(0.35)
                }
            }
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 14, style: .continuous))
            .shadow(
                color: activ && !seIncarca ? Tema.accent.opacity(0.28) : .clear,
                radius: 12, x: 0, y: 6
            )
        }
        .disabled(!activ || seIncarca)
        .apasabil()
    }
}

// MARK: - Eticheta de status

struct Pastila: View {
    let text: String
    var culoare: Color = Tema.accent
    var simbol: String?

    var body: some View {
        HStack(spacing: 4) {
            if let simbol { Image(systemName: simbol).font(.system(size: 10, weight: .semibold)) }
            Text(text).font(.caption2.weight(.semibold))
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(culoare.opacity(0.14), in: .capsule)
        .foregroundStyle(culoare)
    }
}

extension StatusRezervare {
    var culoare: Color {
        switch self {
        case .confirmata: Tema.accent
        case .inAsteptare: Tema.asteptare
        case .respinsa: Tema.ocupat
        case .mutarePropusa: .blue
        case .anulata: .secondary
        }
    }

    var simbol: String {
        switch self {
        case .confirmata: "checkmark.circle.fill"
        case .inAsteptare: "clock.fill"
        case .respinsa: "xmark.circle.fill"
        case .mutarePropusa: "arrow.triangle.2.circlepath"
        case .anulata: "slash.circle.fill"
        }
    }
}

// MARK: - Stări

/// Ce se vede cât timp se încarcă o listă — mai bun decât o rotiță pe ecran gol.
struct ScheletFisa: View {
    var inaltime: CGFloat = 120

    @State private var animeaza = false

    var body: some View {
        RoundedRectangle(cornerRadius: Tema.razaFisa, style: .continuous)
            .fill(Color.secondary.opacity(animeaza ? 0.10 : 0.18))
            .frame(height: inaltime)
            .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: animeaza)
            .onAppear { animeaza = true }
    }
}

struct StareGoala: View {
    let simbol: String
    let titlu: String
    let detaliu: String
    var titluActiune: String?
    var actiune: (() -> Void)?

    var body: some View {
        VStack(spacing: 10) {
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

            if let titluActiune, let actiune {
                Button(titluActiune, action: actiune)
                    .font(.subheadline.weight(.medium))
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 44)
        .padding(.horizontal, 24)
    }
}

// MARK: - Formatări

extension Locale {
    /// Aplicația e în română, indiferent de limba telefonului. Fără asta,
    /// zilele apar în engleză pe un telefon setat pe altă limbă.
    static let aplicatie = Locale(identifier: "ro_RO")
}

extension Date {
    var ziScurta: String {
        formatted(.dateTime.day().month(.abbreviated).locale(.aplicatie))
    }
    var ziLunga: String {
        formatted(.dateTime.weekday(.wide).day().month(.wide).locale(.aplicatie))
    }
    var oraScurta: String {
        formatted(.dateTime.hour().minute().locale(.aplicatie))
    }
    var zileiPrescurtat: String {
        formatted(.dateTime.weekday(.abbreviated).locale(.aplicatie))
    }
    var numarZi: String {
        formatted(.dateTime.day().locale(.aplicatie))
    }
}

enum ZiApi {
    /// „2026-08-20” în fusul telefonului — exact ziua pe care o vede utilizatorul.
    static func text(_ data: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: data)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}


/// Pastilă simplă de filtru, cu stare activă.
struct PastilaFiltru: View {
    let text: String
    let activ: Bool
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            Text(text)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(activ ? Tema.accent : Tema.fisa, in: .capsule)
                .foregroundStyle(activ ? .white : .secondary)
        }
        .apasabil()
    }
}
