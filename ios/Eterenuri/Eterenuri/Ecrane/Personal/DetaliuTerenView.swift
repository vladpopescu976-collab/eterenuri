import SwiftUI

struct DetaliuTerenView: View {
    let terenId: String

    @State private var detaliu: DetaliuTeren?
    @State private var eroare: String?
    @State private var favorit = false
    @State private var arataRezervare = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Tema.fundal.ignoresSafeArea()

            if let detaliu {
                continut(detaliu)
                if !detaliu.esteProprietar { bataieDeSubsol(detaliu.teren) }
            } else if let eroare {
                StareGoala(
                    simbol: "exclamationmark.triangle",
                    titlu: "Nu am putut încărca terenul",
                    detaliu: eroare
                )
            } else {
                ProgressView().controlSize(.large)
            }
        }
        .navigationTitle(detaliu?.teren.nume ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if detaliu != nil && detaliu?.esteProprietar == false {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await comutaFavorit() }
                    } label: {
                        Image(systemName: favorit ? "heart.fill" : "heart")
                            .foregroundStyle(favorit ? .pink : .primary)
                    }
                }
            }
        }
        .task { await incarca() }
        .sheet(isPresented: $arataRezervare) {
            if let teren = detaliu?.teren {
                NavigationStack {
                    RezervaView(teren: teren) { Task { await incarca() } }
                }
            }
        }
    }

    private func continut(_ detaliu: DetaliuTeren) -> some View {
        ScrollView {
            VStack(spacing: 14) {
                galerie(detaliu.teren)
                antet(detaliu.teren)
                if let descriere = detaliu.teren.descriere, !descriere.isEmpty {
                    sectiune("Descriere") {
                        Text(descriere).font(.callout).foregroundStyle(.secondary)
                    }
                }
                if !detaliu.teren.facilitati.isEmpty {
                    sectiune("Facilități") { facilitati(detaliu.teren.facilitati) }
                }
                if detaliu.esteProprietar { casetaProprietar }
                recenzii(detaliu.recenzii)
                Color.clear.frame(height: detaliu.esteProprietar ? 8 : 110)
            }
            .padding(.horizontal, Tema.spatiu)
            .padding(.bottom, 8)
        }
    }

    private func galerie(_ teren: Teren) -> some View {
        TabView {
            if teren.poze.isEmpty {
                PozaTeren(cale: nil, sport: teren.sport)
            } else {
                ForEach(teren.poze, id: \.self) { poza in
                    PozaTeren(cale: poza, sport: teren.sport)
                }
            }
        }
        .tabViewStyle(.page)
        .frame(height: 230)
        .clipShape(.rect(cornerRadius: Tema.razaFisa, style: .continuous))
    }

    private func antet(_ teren: Teren) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Pastila(text: teren.sport.eticheta, simbol: teren.sport.simbol)
                Spacer()
                if let nota = teren.notaMedie {
                    HStack(spacing: 4) {
                        Stelute(nota: nota, marime: 12)
                        Text(String(format: "%.1f", nota)).font(.caption.weight(.semibold))
                        Text("(\(teren.numarRecenzii))").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }

            Text(teren.nume).font(.title2.weight(.bold))

            VStack(alignment: .leading, spacing: 5) {
                Label("\(teren.adresa), \(teren.oras)", systemImage: "mappin.and.ellipse")
                Label(
                    "Deschis \(String(format: "%02d", teren.oraDeschidere)):00 – \(String(format: "%02d", teren.oraInchidere)):00",
                    systemImage: "clock"
                )
                if let telefon = teren.telefonContact, !telefon.isEmpty {
                    Label(telefon, systemImage: "phone")
                }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .fisa()
    }

    private func facilitati(_ elemente: [String]) -> some View {
        LazyVGrid(columns: [.init(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
            ForEach(elemente, id: \.self) { text in
                Label(text, systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 10).padding(.vertical, 9)
                    .background(Tema.accent.opacity(0.10),
                                in: .rect(cornerRadius: 10, style: .continuous))
                    .foregroundStyle(Tema.accent)
            }
        }
    }

    private var casetaProprietar: some View {
        Label("Acesta este terenul tău. Îl administrezi din secțiunea Terenuri.",
              systemImage: "person.badge.shield.checkmark")
            .font(.footnote)
            .foregroundStyle(Tema.accent)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Tema.accent.opacity(0.10),
                        in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
    }

    private func recenzii(_ lista: [Recenzie]) -> some View {
        sectiune("Recenzii") {
            if lista.isEmpty {
                Text("Terenul nu are încă recenzii.")
                    .font(.callout).foregroundStyle(.secondary)
            } else {
                VStack(spacing: 10) {
                    ForEach(lista) { CardRecenzie(recenzie: $0) }
                }
            }
        }
    }

    @ViewBuilder
    private func sectiune<C: View>(_ titlu: String, @ViewBuilder continut: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(titlu).font(.headline)
            continut()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .fisa()
    }

    private func bataieDeSubsol(_ teren: Teren) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 1) {
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(Int(teren.pretPeOra))").font(.title2.weight(.bold))
                    Text("RON").font(.subheadline).foregroundStyle(.secondary)
                }
                Text("pe oră").font(.caption2).foregroundStyle(.secondary)
            }

            ButonPrincipal(titlu: "Vezi orele libere", simbol: "calendar") {
                arataRezervare = true
            }
        }
        .padding(Tema.spatiu)
        .background(.regularMaterial)
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
        withAnimation { favorit.toggle() }
        do {
            let stare: StareFavorit = try await ApiClient.shared.cere(
                "favorite", metoda: "POST", corp: Corp(terenId: terenId), ca: StareFavorit.self
            )
            favorit = stare.favorit
        } catch {
            withAnimation { favorit.toggle() }
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
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Tema.accent)
                    Text(raspuns).font(.footnote).foregroundStyle(.secondary)
                }
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    Capsule().fill(Tema.accent.opacity(0.4)).frame(width: 3)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Tema.fundal, in: .rect(cornerRadius: Tema.razaMica, style: .continuous))
    }
}
