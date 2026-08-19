import SwiftUI

struct RecenziiBusinessView: View {
    @State private var recenzii: [Recenzie] = []
    @State private var seIncarca = true
    @State private var deRaspuns: Recenzie?

    private var media: Double {
        guard !recenzii.isEmpty else { return 0 }
        return Double(recenzii.map(\.nota).reduce(0, +)) / Double(recenzii.count)
    }

    var body: some View {
        List {
            if seIncarca {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if recenzii.isEmpty {
                StareGoala(
                    simbol: "star",
                    titlu: "Nicio recenzie încă",
                    detaliu: "Clienții pot lăsa o recenzie după ce se încheie o rezervare confirmată."
                )
                .listRowSeparator(.hidden)
            } else {
                Section {
                    HStack {
                        Stelute(nota: media, marime: 14)
                        Text(String(format: "%.1f", media)).font(.headline)
                        Spacer()
                        Text("\(recenzii.count) recenzii")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }

                ForEach(recenzii) { recenzie in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            Stelute(nota: Double(recenzie.nota))
                            Text(recenzie.autor).font(.subheadline.weight(.medium))
                            if let teren = recenzie.teren {
                                Text("· \(teren)").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        if let comentariu = recenzie.comentariu, !comentariu.isEmpty {
                            Text(comentariu).font(.callout).foregroundStyle(.secondary)
                        }
                        if let raspuns = recenzie.raspunsProprietar, !raspuns.isEmpty {
                            Text("Răspunsul tău: \(raspuns)")
                                .font(.caption).foregroundStyle(Tema.accent)
                        }
                        Button(
                            recenzie.raspunsProprietar == nil ? "Răspunde" : "Modifică răspunsul",
                            systemImage: "bubble.left"
                        ) {
                            deRaspuns = recenzie
                        }
                        .font(.footnote)
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Recenzii")
        .refreshable { await incarca() }
        .task { await incarca() }
        .sheet(item: $deRaspuns) { recenzie in
            NavigationStack {
                RaspundeRecenzieView(recenzie: recenzie) { Task { await incarca() } }
            }
        }
    }

    private func incarca() async {
        recenzii = (try? await ApiClient.shared.cere("recenzii", ca: [Recenzie].self)) ?? []
        seIncarca = false
    }
}

struct RaspundeRecenzieView: View {
    let recenzie: Recenzie
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide
    @State private var text: String
    @State private var eroare: String?
    @State private var seTrimite = false

    init(recenzie: Recenzie, laFinal: @escaping () -> Void) {
        self.recenzie = recenzie
        self.laFinal = laFinal
        _text = State(initialValue: recenzie.raspunsProprietar ?? "")
    }

    var body: some View {
        Form {
            Section("Recenzia lui \(recenzie.autor)") {
                Stelute(nota: Double(recenzie.nota), marime: 14)
                if let comentariu = recenzie.comentariu, !comentariu.isEmpty {
                    Text(comentariu).font(.callout).foregroundStyle(.secondary)
                }
            }
            Section("Răspunsul tău") {
                TextField("Mulțumim pentru feedback! …", text: $text, axis: .vertical)
                    .lineLimit(3...6)
            }
            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }
            Section {
                Button {
                    trimite()
                } label: {
                    HStack { Spacer(); Text("Publică răspunsul").fontWeight(.semibold); Spacer() }
                }
                .disabled(seTrimite || text.trimmingCharacters(in: .whitespaces).isEmpty)
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Răspunde")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
    }

    private func trimite() {
        struct Corp: Encodable {
            let recenzieId: String
            let raspuns: String
        }
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await ApiClient.shared.cereFaraRaspuns(
                    "recenzii",
                    metoda: "PATCH",
                    corp: Corp(recenzieId: recenzie.id, raspuns: text.trimmingCharacters(in: .whitespaces))
                )
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
