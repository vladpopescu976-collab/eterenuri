import SwiftUI

/// Poza de copertă a unui teren, cu simbolul sportului când lipsește sau nu se încarcă.
struct PozaTeren: View {
    let cale: String?
    let sport: Sport

    var body: some View {
        ZStack {
            Color.verdeEterenuri.opacity(0.10)

            if let cale, let url = Config.urlPoza(cale) {
                AsyncImage(url: url) { faza in
                    switch faza {
                    case .success(let imagine):
                        imagine.resizable().scaledToFill()
                    case .failure:
                        simbol
                    default:
                        ProgressView()
                    }
                }
            } else {
                simbol
            }
        }
        .clipped()
    }

    private var simbol: some View {
        Image(systemName: sport.simbol)
            .font(.system(size: 32))
            .foregroundStyle(Color.verdeEterenuri.opacity(0.45))
    }
}

struct Stelute: View {
    let nota: Double
    var marime: CGFloat = 12

    var body: some View {
        HStack(spacing: 1) {
            ForEach(1...5, id: \.self) { i in
                Image(systemName: Double(i) <= nota.rounded() ? "star.fill" : "star")
                    .font(.system(size: marime))
                    .foregroundStyle(Double(i) <= nota.rounded() ? .yellow : .secondary.opacity(0.4))
            }
        }
    }
}

struct EticheutaStatus: View {
    let status: StatusRezervare

    private var culoare: Color {
        switch status {
        case .confirmata: .green
        case .inAsteptare: .orange
        case .respinsa: .red
        case .mutarePropusa: .blue
        case .anulata: .secondary
        }
    }

    var body: some View {
        Text(status.eticheta)
            .font(.caption2.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(culoare.opacity(0.15), in: .capsule)
            .foregroundStyle(culoare)
    }
}

struct StareGoala: View {
    let simbol: String
    let titlu: String
    let detaliu: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: simbol)
                .font(.system(size: 34))
                .foregroundStyle(.secondary)
            Text(titlu).font(.headline)
            Text(detaliu)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .padding(.horizontal)
    }
}

extension Date {
    var ziScurta: String {
        formatted(.dateTime.day().month(.abbreviated).year())
    }
    var oraScurta: String {
        formatted(.dateTime.hour().minute())
    }
}

enum ZiApi {
    /// „2026-08-20” în fusul telefonului — exact ziua pe care o vede utilizatorul.
    static func text(_ data: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: data)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}
