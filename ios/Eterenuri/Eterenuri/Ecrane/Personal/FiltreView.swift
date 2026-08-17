import SwiftUI

/// Ce se caută: sport, oraș, zi, interval orar, preț. Nimic nu se scrie de
/// mână — orașele vin de la server, ca să nu poți nimeri unul inexistent.
struct FiltreView: View {
    @Binding var oras: String
    @Binding var sportAles: Sport?
    @Binding var pretMax: Double
    @Binding var ziAleasa: Date?
    @Binding var oraDeLa: Int?
    @Binding var durataOre: Int
    let aplica: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var orase: [OrasDisponibil] = []
    @State private var areZi = false
    @State private var zi = Date()

    private let oreposibile = Array(6..<23)

    var body: some View {
        Form {
            sectiuneSport
            sectiuneOras
            sectiuneCand
            sectiunePret
        }
        .navigationTitle("Caută")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Șterge tot", action: stergeTot)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Arată terenurile") {
                    ziAleasa = areZi ? zi : nil
                    if !areZi { oraDeLa = nil }
                    aplica()
                    inchide()
                }
                .fontWeight(.semibold)
            }
        }
        .task {
            orase = (try? await ApiClient.shared.cere("orase", ca: [OrasDisponibil].self)) ?? []
            if let ziAleasa { areZi = true; zi = ziAleasa }
        }
    }

    // MARK: - Sport

    private var sectiuneSport: some View {
        Section("Sport") {
            LazyVGrid(columns: [.init(.adaptive(minimum: 96), spacing: 8)], spacing: 8) {
                CelulaAlegere(
                    simbol: "square.grid.2x2", text: "Toate", activ: sportAles == nil
                ) { sportAles = nil }

                ForEach(Sport.allCases, id: \.self) { sport in
                    CelulaAlegere(
                        simbol: sport.simbol, text: sport.eticheta, activ: sportAles == sport
                    ) {
                        sportAles = sportAles == sport ? nil : sport
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: - Oraș

    private var sectiuneOras: some View {
        Section {
            if orase.isEmpty {
                HStack {
                    Text("Se încarcă orașele…").foregroundStyle(.secondary)
                    Spacer()
                    ProgressView()
                }
                .font(.subheadline)
            } else {
                Picker("Oraș", selection: $oras) {
                    Text("Toate orașele").tag("")
                    ForEach(orase) { item in
                        Text("\(item.oras) (\(item.terenuri))").tag(item.oras)
                    }
                }
            }
        } header: {
            Text("Unde")
        } footer: {
            Text("Doar orașele în care există terenuri publicate.")
        }
    }

    // MARK: - Când

    private var sectiuneCand: some View {
        Section {
            Toggle("O anumită zi", isOn: $areZi.animation())

            if areZi {
                DatePicker("Ziua", selection: $zi, in: Date()..., displayedComponents: .date)

                Toggle("Un anumit interval", isOn: Binding(
                    get: { oraDeLa != nil },
                    set: { pornit in
                        withAnimation { oraDeLa = pornit ? 18 : nil }
                    }
                ))

                if let deLa = oraDeLa {
                    Picker("De la ora", selection: Binding(
                        get: { deLa },
                        set: { oraDeLa = $0 }
                    )) {
                        ForEach(oreposibile, id: \.self) { ora in
                            Text(String(format: "%02d:00", ora)).tag(ora)
                        }
                    }

                    // Durata, nu ora de final: e mai ușor de gândit „două ore”
                    // decât de calculat ora de sfârșit.
                    Picker("Durată", selection: $durataOre) {
                        ForEach(1...4, id: \.self) { ore in
                            Text("\(ore) \(ore == 1 ? "oră" : "ore")").tag(ore)
                        }
                    }
                    .pickerStyle(.segmented)

                    LabeledContent("Interval") {
                        Text(String(format: "%02d:00 – %02d:00", deLa, deLa + durataOre))
                            .font(.subheadline.weight(.medium).monospacedDigit())
                    }
                }
            }
        } header: {
            Text("Când")
        } footer: {
            if oraDeLa != nil {
                Text("Rămân doar terenurile libere pe tot intervalul.")
            }
        }
    }

    // MARK: - Preț

    private var sectiunePret: some View {
        Section("Preț maxim pe oră") {
            VStack(alignment: .leading, spacing: 6) {
                Text(pretMax > 0 ? "Până la \(Int(pretMax)) RON" : "Fără limită")
                    .font(.subheadline.weight(.medium))
                Slider(value: $pretMax, in: 0...500, step: 10)
            }
        }
    }

    private func stergeTot() {
        withAnimation {
            oras = ""
            sportAles = nil
            pretMax = 0
            areZi = false
            ziAleasa = nil
            oraDeLa = nil
            durataOre = 1
        }
    }
}

private struct CelulaAlegere: View {
    let simbol: String
    let text: String
    let activ: Bool
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            VStack(spacing: 4) {
                Image(systemName: simbol).font(.callout)
                Text(text).font(.caption2.weight(.medium)).lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(activ ? Tema.accent : Tema.fundal,
                        in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
            .foregroundStyle(activ ? .white : .primary)
        }
        .buttonStyle(.plain)
    }
}
