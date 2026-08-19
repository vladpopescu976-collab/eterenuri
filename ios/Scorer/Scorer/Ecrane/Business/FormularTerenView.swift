import SwiftUI
import PhotosUI

/// Adăugarea și editarea unui teren, cu poze luate direct din telefon.
struct FormularTerenView: View {
    /// Lipsește la adăugare; prezent la editare.
    var teren: Teren?
    let laFinal: () -> Void

    @Environment(\.dismiss) private var inchide

    @State private var nume = ""
    @State private var sport: Sport = .fotbal
    @State private var oras = ""
    @State private var adresa = ""
    @State private var pret = ""
    @State private var deschidere = 8
    @State private var inchidere = 22
    @State private var telefon = ""
    @State private var descriere = ""
    @State private var facilitati: Set<String> = []
    @State private var activ = true

    @State private var poze: [String] = []
    @State private var alese: [PhotosPickerItem] = []
    @State private var seIncarcaPoze = false

    @State private var eroare: String?
    @State private var seTrimite = false
    @State private var orase: [OrasDisponibil] = []

    private let sugestiiFacilitati = [
        "Nocturnă", "Vestiare", "Dușuri", "Parcare", "Acoperit", "Echipament inclus",
    ]

    private var esteEditare: Bool { teren != nil }
    private var maximPoze: Int { 6 }

    var body: some View {
        Form {
            sectiuneDetalii
            sectiuneProgram
            sectiuneContact
            sectiuneFacilitati
            sectiunePoze

            if let eroare {
                Section { Text(eroare).font(.footnote).foregroundStyle(.red) }
            }

            if esteEditare {
                Section {
                    Toggle("Teren activ", isOn: $activ)
                } footer: {
                    Text("Terenurile inactive nu apar în căutare și nu pot primi rezervări.")
                }
            }

            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite {
                            ProgressView().tint(.white)
                        } else {
                            Text(esteEditare ? "Salvează modificările" : "Adaugă terenul")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite || seIncarcaPoze)
                .listRowBackground(seTrimite || seIncarcaPoze ? Color.gray.opacity(0.35) : Tema.accent)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle(esteEditare ? "Modifică terenul" : "Teren nou")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Renunță") { inchide() } }
        }
        .task {
            orase = (try? await ApiClient.shared.cere("orase", ca: [OrasDisponibil].self)) ?? []
            if let teren { preia(teren) }
        }
        .onChange(of: alese) { _, noi in
            guard !noi.isEmpty else { return }
            Task { await incarca(noi) }
        }
    }

    // MARK: - Secțiuni

    private var sectiuneDetalii: some View {
        Section("Despre teren") {
            TextField("Nume", text: $nume)

            Picker("Sport", selection: $sport) {
                ForEach(Sport.allCases, id: \.self) { s in
                    Label(s.eticheta, systemImage: s.simbol).tag(s)
                }
            }

            Picker("Oraș", selection: $oras) {
                if oras.isEmpty || !orase.contains(where: { $0.oras == oras }) {
                    Text(oras.isEmpty ? "Alege orașul" : oras).tag(oras)
                }
                ForEach(orase) { item in
                    Text(item.oras).tag(item.oras)
                }
            }

            TextField("Adresă", text: $adresa)

            TextField("Preț pe oră (RON)", text: $pret)
                .keyboardType(.numberPad)
        }
    }

    private var sectiuneProgram: some View {
        Section("Program") {
            Picker("Deschidere", selection: $deschidere) {
                ForEach(0..<24, id: \.self) { Text(String(format: "%02d:00", $0)).tag($0) }
            }
            Picker("Închidere", selection: $inchidere) {
                ForEach(1...24, id: \.self) { Text(String(format: "%02d:00", $0)).tag($0) }
            }
        }
    }

    private var sectiuneContact: some View {
        Section {
            TextField("Telefon de contact", text: $telefon)
                .keyboardType(.phonePad)
            TextField("Descriere (opțional)", text: $descriere, axis: .vertical)
                .lineLimit(2...5)
        } header: {
            Text("Contact")
        } footer: {
            Text("Vei fi anunțat să suni clientul dacă o cerere rămâne neconfirmată peste o oră.")
        }
    }

    private var sectiuneFacilitati: some View {
        Section("Facilități") {
            LazyVGrid(columns: [.init(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                ForEach(sugestiiFacilitati, id: \.self) { item in
                    let ales = facilitati.contains(item)
                    Button {
                        if ales { facilitati.remove(item) } else { facilitati.insert(item) }
                    } label: {
                        Text(item)
                            .font(.caption.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(ales ? Tema.accent : Tema.fundal,
                                        in: .rect(cornerRadius: 10, style: .continuous))
                            .foregroundStyle(ales ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private var sectiunePoze: some View {
        Section {
            if !poze.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(poze.enumerated()), id: \.offset) { index, cale in
                            ZStack(alignment: .topTrailing) {
                                PozaTeren(cale: cale, sport: sport)
                                    .frame(width: 96, height: 96)
                                    .clipShape(.rect(cornerRadius: 10, style: .continuous))

                                Button {
                                    poze.remove(at: index)
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .padding(5)
                                        .background(.black.opacity(0.55), in: .circle)
                                }
                                .padding(4)

                                if index == 0 {
                                    Text("Principală")
                                        .font(.system(size: 9, weight: .semibold))
                                        .padding(.horizontal, 5).padding(.vertical, 3)
                                        .background(.black.opacity(0.55), in: .capsule)
                                        .foregroundStyle(.white)
                                        .padding(4)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity,
                                               alignment: .bottomLeading)
                                }
                            }
                            .frame(width: 96, height: 96)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            PhotosPicker(
                selection: $alese,
                maxSelectionCount: max(1, maximPoze - poze.count),
                matching: .images
            ) {
                HStack {
                    Label(
                        seIncarcaPoze ? "Se încarcă…" : "Adaugă poze din telefon",
                        systemImage: "photo.badge.plus"
                    )
                    Spacer()
                    if seIncarcaPoze { ProgressView() }
                }
            }
            .disabled(seIncarcaPoze || poze.count >= maximPoze)
        } header: {
            Text("Poze")
        } footer: {
            Text("Maximum \(maximPoze) poze, 4 MB fiecare. Prima devine imaginea principală.")
        }
    }

    // MARK: - Poze

    private func incarca(_ elemente: [PhotosPickerItem]) async {
        seIncarcaPoze = true
        eroare = nil
        defer {
            seIncarcaPoze = false
            alese = []
        }

        var deTrimis: [(nume: String, tip: String, date: Data)] = []
        for (i, element) in elemente.prefix(maximPoze - poze.count).enumerated() {
            guard let date = try? await element.loadTransferable(type: Data.self) else { continue }
            // Pozele din galerie sunt de obicei HEIC sau JPEG; le trimitem ca
            // JPEG, singurul format pe care îl acceptă sigur și serverul.
            deTrimis.append((nume: "poza-\(i + 1).jpg", tip: "image/jpeg", date: date))
        }

        guard !deTrimis.isEmpty else {
            eroare = "Nu am putut citi pozele alese."
            return
        }

        do {
            let adrese = try await ApiClient.shared.incarcaPoze(deTrimis)
            poze.append(contentsOf: adrese)
        } catch {
            eroare = error.localizedDescription
        }
    }

    // MARK: - Salvare

    private func preia(_ t: Teren) {
        nume = t.nume
        sport = t.sport
        oras = t.oras
        adresa = t.adresa
        pret = String(Int(t.pretPeOra))
        deschidere = t.oraDeschidere
        inchidere = t.oraInchidere
        telefon = t.telefonContact ?? ""
        descriere = t.descriere ?? ""
        facilitati = Set(t.facilitati)
        poze = t.poze
        activ = t.activ
    }

    private func trimite() {
        eroare = nil

        guard nume.trimmingCharacters(in: .whitespaces).count >= 2 else {
            eroare = "Numele terenului trebuie să aibă cel puțin 2 caractere."; return
        }
        guard oras.trimmingCharacters(in: .whitespaces).count >= 2 else {
            eroare = "Alege orașul."; return
        }
        guard adresa.trimmingCharacters(in: .whitespaces).count >= 2 else {
            eroare = "Completează adresa."; return
        }
        guard let pretNumeric = Double(pret), pretNumeric > 0 else {
            eroare = "Prețul pe oră trebuie să fie mai mare decât 0."; return
        }
        guard inchidere > deschidere else {
            eroare = "Ora de închidere trebuie să fie după ora de deschidere."; return
        }
        guard telefon.trimmingCharacters(in: .whitespaces).count >= 7 else {
            eroare = "Completează un telefon de contact."; return
        }

        struct Corp: Encodable {
            let name: String
            let sportType: String
            let city: String
            let address: String
            let pricePerHour: Double
            let openingHour: Int
            let closingHour: Int
            let contactPhone: String
            let description: String?
            let amenities: [String]
            let images: [String]
            let isActive: Bool?
        }

        let corp = Corp(
            name: nume.trimmingCharacters(in: .whitespaces),
            sportType: sport.rawValue,
            city: oras,
            address: adresa.trimmingCharacters(in: .whitespaces),
            pricePerHour: pretNumeric,
            openingHour: deschidere,
            closingHour: inchidere,
            contactPhone: telefon.trimmingCharacters(in: .whitespaces),
            description: descriere.isEmpty ? nil : descriere,
            amenities: Array(facilitati),
            images: poze,
            isActive: esteEditare ? activ : nil
        )

        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                if let teren {
                    try await ApiClient.shared.cereFaraRaspuns(
                        // Ruta acceptă PUT, nu PATCH: trimitem terenul întreg.
                        "business/terenuri/\(teren.id)", metoda: "PUT", corp: corp
                    )
                } else {
                    try await ApiClient.shared.cereFaraRaspuns(
                        "business/terenuri", metoda: "POST", corp: corp
                    )
                }
                laFinal()
                inchide()
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
