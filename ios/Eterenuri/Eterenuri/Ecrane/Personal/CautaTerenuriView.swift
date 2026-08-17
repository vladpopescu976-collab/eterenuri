import SwiftUI

struct CautaTerenuriView: View {
    @State private var terenuri: [Teren] = []
    @State private var seIncarca = true
    @State private var eroare: String?
    @State private var oras = ""
    @State private var sportAles: Sport?

    var body: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        PastilaFiltru(text: "Toate", activ: sportAles == nil) {
                            sportAles = nil
                            Task { await incarca() }
                        }
                        ForEach(Sport.allCases, id: \.self) { sport in
                            PastilaFiltru(text: sport.eticheta, activ: sportAles == sport) {
                                sportAles = sportAles == sport ? nil : sport
                                Task { await incarca() }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowInsets(.init(top: 0, leading: 16, bottom: 0, trailing: 0))
                .listRowBackground(Color.clear)
            }

            if seIncarca {
                Section { HStack { Spacer(); ProgressView(); Spacer() } }
            } else if let eroare {
                Section {
                    Text(eroare).font(.footnote).foregroundStyle(.red)
                    Button("Încearcă din nou") { Task { await incarca() } }
                }
            } else if terenuri.isEmpty {
                StareGoala(
                    simbol: "magnifyingglass",
                    titlu: "Niciun teren găsit",
                    detaliu: "Încearcă alt sport sau alt oraș."
                )
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            } else {
                ForEach(terenuri) { teren in
                    NavigationLink(value: teren.id) {
                        RandTeren(teren: teren)
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Caută terenuri")
        .navigationDestination(for: String.self) { id in
            DetaliuTerenView(terenId: id)
        }
        .searchable(text: $oras, prompt: "Oraș")
        .onSubmit(of: .search) { Task { await incarca() } }
        .refreshable { await incarca() }
        .task { await incarca() }
    }

    private func incarca() async {
        seIncarca = terenuri.isEmpty
        eroare = nil
        var parametri: [String: String] = [:]
        if !oras.trimmingCharacters(in: .whitespaces).isEmpty { parametri["oras"] = oras }
        if let sportAles { parametri["sport"] = sportAles.rawValue }

        do {
            terenuri = try await ApiClient.shared.cere(
                "terenuri", parametri: parametri, ca: [Teren].self
            )
        } catch {
            eroare = error.localizedDescription
        }
        seIncarca = false
    }
}

struct PastilaFiltru: View {
    let text: String
    let activ: Bool
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            Text(text)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(activ ? Color.primary : Color(.secondarySystemBackground), in: .capsule)
                .foregroundStyle(activ ? Color(.systemBackground) : .secondary)
        }
        .buttonStyle(.plain)
    }
}

struct RandTeren: View {
    let teren: Teren

    var body: some View {
        HStack(spacing: 12) {
            PozaTeren(cale: teren.poze.first, sport: teren.sport)
                .frame(width: 72, height: 72)
                .clipShape(.rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 3) {
                Text(teren.nume).font(.headline).lineLimit(1)

                Label(teren.oras, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let nota = teren.notaMedie {
                    HStack(spacing: 4) {
                        Stelute(nota: nota)
                        Text(String(format: "%.1f", nota)).font(.caption2).foregroundStyle(.secondary)
                        Text("(\(teren.numarRecenzii))").font(.caption2).foregroundStyle(.tertiary)
                    }
                }

                Text("\(Int(teren.pretPeOra)) RON / oră")
                    .font(.subheadline.weight(.semibold))
            }

            Spacer()

            if teren.favorit {
                Image(systemName: "heart.fill").font(.caption).foregroundStyle(.pink)
            }
        }
        .padding(.vertical, 4)
    }
}
