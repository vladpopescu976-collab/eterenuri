import SwiftUI

struct DetaliuTerenView: View {
    let terenId: String

    @State private var detaliu: DetaliuTeren?
    @State private var eroare: String?
    @State private var favorit = false
    @State private var arataRezervare = false

    var body: some View {
        Group {
            if let detaliu {
                continut(detaliu)
            } else if let eroare {
                StareGoala(simbol: "exclamationmark.triangle", titlu: "Nu am putut încărca terenul", detaliu: eroare)
            } else {
                ProgressView().frame(maxWidth: .infinity, minHeight: 240)
            }
        }
        .navigationTitle(detaliu?.teren.nume ?? "Teren")
        .navigationBarTitleDisplayMode(.inline)
        .task { await incarca() }
        .sheet(isPresented: $arataRezervare) {
            if let teren = detaliu?.teren {
                NavigationStack {
                    RezervaView(teren: teren) { Task { await incarca() } }
                }
            }
        }
    }

    @ViewBuilder
    private func continut(_ detaliu: DetaliuTeren) -> some View {
        let teren = detaliu.teren

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PozaTeren(cale: teren.poze.first, sport: teren.sport)
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
                    .clipShape(.rect(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 6) {
                    Label(teren.sport.eticheta, systemImage: teren.sport.simbol)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(Color.verdeEterenuri.opacity(0.14), in: .capsule)
                        .foregroundStyle(Color.verdeEterenuri)

                    Text(teren.nume).font(.title2.bold())

                    if let nota = teren.notaMedie {
                        HStack(spacing: 5) {
                            Stelute(nota: nota, marime: 13)
                            Text(String(format: "%.1f", nota)).font(.subheadline.weight(.medium))
                            Text("(\(teren.numarRecenzii) recenzii)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }

                    Label("\(teren.adresa), \(teren.oras)", systemImage: "mappin.and.ellipse")
                        .font(.subheadline).foregroundStyle(.secondary)

                    Label(
                        "Program: \(String(format: "%02d", teren.oraDeschidere)):00 – \(String(format: "%02d", teren.oraInchidere)):00",
                        systemImage: "clock"
                    )
                    .font(.subheadline).foregroundStyle(.secondary)
                }

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(Int(teren.pretPeOra))").font(.title.bold())
                    Text("RON / oră").foregroundStyle(.secondary)
                }

                if !detaliu.esteProprietar {
                    HStack(spacing: 10) {
                        Button {
                            arataRezervare = true
                        } label: {
                            Text("Rezervă").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)

                        Button {
                            Task { await comutaFavorit() }
                        } label: {
                            Image(systemName: favorit ? "heart.fill" : "heart")
                                .foregroundStyle(favorit ? .pink : .secondary)
                                .frame(width: 44, height: 44)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                    }
                } else {
                    Text("Acesta este terenul tău.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.verdeEterenuri.opacity(0.08), in: .rect(cornerRadius: 12))
                }

                if let descriere = teren.descriere, !descriere.isEmpty {
                    sectiune("Descriere") {
                        Text(descriere).font(.callout).foregroundStyle(.secondary)
                    }
                }

                if !teren.facilitati.isEmpty {
                    sectiune("Facilități") {
                        FlowFacilitati(elemente: teren.facilitati)
                    }
                }

                sectiune("Recenzii") {
                    if detaliu.recenzii.isEmpty {
                        Text("Terenul nu are încă recenzii.")
                            .font(.callout).foregroundStyle(.secondary)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(detaliu.recenzii) { recenzie in
                                CardRecenzie(recenzie: recenzie)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private func sectiune<Continut: View>(
        _ titlu: String,
        @ViewBuilder continut: () -> Continut
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(titlu).font(.headline)
            continut()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func incarca() async {
        do {
            let rezultat: DetaliuTeren = try await ApiClient.shared.cere(
                "terenuri/\(terenId)", ca: DetaliuTeren.self
            )
            detaliu = rezultat
            favorit = rezultat.teren.favorit
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func comutaFavorit() async {
        struct Corp: Encodable { let terenId: String }
        // Răspunsul imediat contează mai mult decât exactitatea de o clipă.
        favorit.toggle()
        do {
            let stare: StareFavorit = try await ApiClient.shared.cere(
                "favorite", metoda: "POST", corp: Corp(terenId: terenId), ca: StareFavorit.self
            )
            favorit = stare.favorit
        } catch {
            favorit.toggle()
        }
    }
}

struct FlowFacilitati: View {
    let elemente: [String]

    var body: some View {
        // Layout-ul nativ pentru „câte încap pe rând”.
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 6) { pastile }
            VStack(alignment: .leading, spacing: 6) { pastile }
        }
    }

    private var pastile: some View {
        ForEach(elemente, id: \.self) { text in
            Label(text, systemImage: "sparkles")
                .font(.caption)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Color(.secondarySystemBackground), in: .capsule)
        }
    }
}

struct CardRecenzie: View {
    let recenzie: Recenzie

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Stelute(nota: Double(recenzie.nota))
                Text(recenzie.autor).font(.subheadline.weight(.medium))
                Spacer()
            }
            if let comentariu = recenzie.comentariu, !comentariu.isEmpty {
                Text(comentariu).font(.callout).foregroundStyle(.secondary)
            }
            if let raspuns = recenzie.raspunsProprietar, !raspuns.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Răspunsul proprietarului")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.verdeEterenuri)
                    Text(raspuns).font(.footnote).foregroundStyle(.secondary)
                }
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.verdeEterenuri.opacity(0.4))
                        .frame(width: 2)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 12))
    }
}
