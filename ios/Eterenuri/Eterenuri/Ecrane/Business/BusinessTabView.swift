import SwiftUI

struct BusinessTabView: View {
    @State private var tabAles = Self.tabInitial

    /// În build-urile de dezvoltare, ecranul de start poate fi ales din mediu,
    /// pentru verificări automate.
    private static var tabInitial: String {
        #if DEBUG
        ProcessInfo.processInfo.environment["ETERENURI_TAB"] ?? "ansamblu"
        #else
        "ansamblu"
        #endif
    }

    var body: some View {
        TabView(selection: $tabAles) {
            Tab("Ansamblu", systemImage: "chart.bar", value: "ansamblu") {
                NavigationStack { AnsambluView() }
            }
            Tab("Calendar", systemImage: "calendar", value: "calendar") {
                NavigationStack { CalendarView() }
            }
            Tab("Rezervări", systemImage: "list.clipboard", value: "rezervari") {
                NavigationStack { RezervariBusinessView() }
            }
            Tab("Terenuri", systemImage: "sportscourt", value: "terenuri") {
                NavigationStack { TerenuriBusinessView() }
            }
            Tab("Recenzii", systemImage: "star", value: "recenzii") {
                NavigationStack { RecenziiBusinessView() }
            }
            Tab("Cont", systemImage: "person", value: "cont") {
                NavigationStack { ContView() }
            }
        }
    }
}

struct AnsambluView: View {
    @State private var statistici: Statistici?
    @State private var seIncarca = true

    var body: some View {
        ZStack {
        Tema.fundal.ignoresSafeArea()
        ScrollView {
            if seIncarca {
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in ScheletFisa(inaltime: 90) }
                }
                .padding()
            } else if let s = statistici {
                VStack(spacing: 16) {
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                        Kpi(titlu: "Venit luna aceasta", valoare: "\(s.venitLunaCurenta) RON", simbol: "banknote")
                        Kpi(titlu: "Grad de ocupare", valoare: "\(s.gradOcupare)%", simbol: "chart.pie")
                        Kpi(titlu: "Rezervări", valoare: "\(s.totalRezervari)", simbol: "calendar")
                        Kpi(titlu: "În așteptare", valoare: "\(s.inAsteptare)", simbol: "clock.badge.exclamationmark")
                    }

                    if !s.oreDeVarf.isEmpty {
                        Sectiune("Cele mai cerute ore") {
                            VStack(spacing: 8) {
                                ForEach(s.oreDeVarf) { ora in
                                    HStack {
                                        Text(String(format: "%02d:00", ora.ora))
                                            .font(.subheadline.monospaced())
                                        GeometryReader { geo in
                                            let maxim = s.oreDeVarf.map(\.rezervari).max() ?? 1
                                            Capsule()
                                                .fill(Tema.accent.opacity(0.7))
                                                .frame(
                                                    width: geo.size.width
                                                        * CGFloat(ora.rezervari) / CGFloat(maxim)
                                                )
                                        }
                                        .frame(height: 10)
                                        Text("\(ora.rezervari)")
                                            .font(.caption).foregroundStyle(.secondary)
                                            .frame(width: 22, alignment: .trailing)
                                    }
                                }
                            }
                        }
                    }

                    if !s.terenuri.isEmpty {
                        Sectiune("Terenurile tale") {
                            VStack(spacing: 8) {
                                ForEach(s.terenuri) { teren in
                                    HStack {
                                        Circle()
                                            .fill(teren.activ ? Color.green : Color.secondary)
                                            .frame(width: 7, height: 7)
                                        Text(teren.nume).font(.subheadline)
                                        Spacer()
                                        Text("\(teren.rezervari) rezervări")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        }
        .navigationTitle("Privire de ansamblu")
        .refreshable { await incarca() }
        .task { await incarca() }
    }

    private func incarca() async {
        statistici = try? await ApiClient.shared.cere("business/statistici", ca: Statistici.self)
        seIncarca = false
    }
}

struct Kpi: View {
    let titlu: String
    let valoare: String
    let simbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(titlu).font(.caption).foregroundStyle(.secondary)
                Spacer()
                Image(systemName: simbol).font(.caption).foregroundStyle(Tema.accent)
            }
            Text(valoare).font(.title3.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

struct Sectiune<Continut: View>: View {
    let titlu: String
    @ViewBuilder let continut: Continut

    init(_ titlu: String, @ViewBuilder continut: () -> Continut) {
        self.titlu = titlu
        self.continut = continut()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(titlu).font(.headline)
            continut
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Tema.fisa, in: .rect(cornerRadius: Tema.razaFisa, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}
