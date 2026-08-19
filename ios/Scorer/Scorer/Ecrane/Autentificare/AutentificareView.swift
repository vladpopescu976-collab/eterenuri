import SwiftUI

struct AutentificareView: View {
    @Environment(Sesiune.self) private var sesiune
    @Environment(\.dismiss) private var inchide

    @State private var rolAles: Rol?
    @State private var modInregistrare = false
    @State private var arataSetari = false

    var body: some View {
        NavigationStack {
            if let rol = rolAles {
                FormularAutentificare(rol: rol, modInregistrare: $modInregistrare) {
                    rolAles = nil
                }
            } else {
                AlegereRol { rol in
                    rolAles = rol
                    modInregistrare = false
                }
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Închide") { inchide() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Server", systemImage: "server.rack") { arataSetari = true }
                    }
                }
            }
        }
        .sheet(isPresented: $arataSetari) {
            NavigationStack { SetariServerView() }
        }
        // Conectarea se face dintr-o foaie deschisă peste aplicație; odată
        // reușită, foaia nu mai are ce arăta.
        .onChange(of: sesiune.esteConectat) { _, conectat in
            if conectat { inchide() }
        }
    }
}

private struct AlegereRol: View {
    let alege: (Rol) -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Image(systemName: "sportscourt.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Tema.accent)
                Text("Scorer")
                    .font(.largeTitle.bold())
                Text("Închiriază terenuri sportive în câteva secunde.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 12) {
                CardRol(
                    titlu: "Cont Personal",
                    descriere: "Caută terenuri și fă rezervări.",
                    simbol: "figure.run"
                ) { alege(.personal) }

                CardRol(
                    titlu: "Cont Business",
                    descriere: "Administrează-ți terenurile și rezervările.",
                    simbol: "building.2"
                ) { alege(.business) }
            }
            .padding(.horizontal)

            Spacer()
        }
        .padding()
    }
}

private struct CardRol: View {
    let titlu: String
    let descriere: String
    let simbol: String
    let actiune: () -> Void

    var body: some View {
        Button(action: actiune) {
            HStack(spacing: 14) {
                Image(systemName: simbol)
                    .font(.title2)
                    .foregroundStyle(Tema.accent)
                    .frame(width: 44, height: 44)
                    .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 2) {
                    Text(titlu).font(.headline)
                    Text(descriere)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }

                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
            }
            .padding()
            .background(.background.secondary, in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}

private struct FormularAutentificare: View {
    let rol: Rol
    @Binding var modInregistrare: Bool
    let inapoi: () -> Void

    @Environment(Sesiune.self) private var sesiune

    @State private var nume = ""
    @State private var email = ""
    @State private var parola = ""
    @State private var confirmareParola = ""
    @State private var telefon = ""
    @State private var eroare: String?
    @State private var seTrimite = false
    @State private var arataSetariServer = false
    /// Adresa la care tocmai am trimis linkul de confirmare. Cât timp e
    /// completată, formularul e înlocuit de ecranul de așteptare.
    @State private var asteaptaConfirmare: String?
    @State private var emailulAPlecat = true
    @State private var linkRetrimis = false
    @State private var oras = ""
    @State private var parolaCeruta = false
    /// Câmpurile în plus de la înregistrare se arată doar când e nevoie de ele.
    @State private var numeFirma = ""
    @State private var site = ""

    private var titlu: String { rol == .business ? "Cont Business" : "Cont Personal" }

    var body: some View {
        continut
            .navigationTitle(titlu)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Înapoi", systemImage: "chevron.left", action: inapoi)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Server", systemImage: "server.rack") { arataSetariServer = true }
                }
            }
            .sheet(isPresented: $arataSetariServer) {
                NavigationStack { SetariServerView() }
            }
    }

    @ViewBuilder
    private var continut: some View {
        if let adresa = asteaptaConfirmare {
            asteptareConfirmare(adresa)
        } else {
            formular
        }
    }

    /// După înregistrare contul există, dar nu se poate folosi până nu e
    /// confirmată adresa — deci nu are rost să rămână formularul pe ecran.
    private func asteptareConfirmare(_ adresa: String) -> some View {
        VStack(spacing: 18) {
            Spacer()

            Image(systemName: "envelope.badge")
                .font(.system(size: 46))
                .foregroundStyle(Tema.accent)

            VStack(spacing: 8) {
                Text("Verifică-ți emailul")
                    .font(.title2.bold())
                Text("Am trimis un link de confirmare la \(adresa). Apasă-l ca să îți activezi contul, apoi autentifică-te.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if !emailulAPlecat {
                Text("Contul a fost creat, dar emailul nu a putut fi trimis. Încearcă să ceri linkul din nou.")
                    .font(.footnote)
                    .foregroundStyle(.orange)
                    .multilineTextAlignment(.center)
            }

            if let eroare {
                Text(eroare)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 10) {
                Button {
                    Task { await retrimite(adresa) }
                } label: {
                    HStack {
                        if seTrimite { ProgressView() }
                        Text(linkRetrimis ? "Link trimis" : "Trimite din nou linkul")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Tema.accent.opacity(0.12), in: .rect(cornerRadius: 12))
                    .foregroundStyle(Tema.accent)
                }
                .disabled(seTrimite || linkRetrimis)

                Button("Mergi la autentificare") {
                    asteaptaConfirmare = nil
                    modInregistrare = false
                    parola = ""
                    eroare = nil
                }
                .font(.subheadline.weight(.medium))
            }

            Spacer()
        }
        .padding(24)
    }

    private var formular: some View {
        Form {
            Section {
                Picker("Mod", selection: $modInregistrare) {
                    Text("Autentificare").tag(false)
                    Text("Înregistrare").tag(true)
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(.init())
            }

            Section {
                if modInregistrare {
                    TextField(rol == .business ? "Persoană de contact" : "Nume", text: $nume)
                        .textContentType(.name)
                }

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                SecureField("Parolă", text: $parola)
                    .textContentType(modInregistrare ? .newPassword : .password)

                if modInregistrare {
                    SecureField("Confirmă parola", text: $confirmareParola)
                        .textContentType(.newPassword)

                    TextField("Telefon", text: $telefon)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)

                    TextField("Oraș", text: $oras)
                        .textContentType(.addressCity)
                }
            } footer: {
                if modInregistrare {
                    VStack(alignment: .leading, spacing: 4) {
                        // Scris cât tastezi, nu abia la trimitere.
                        if !confirmareParola.isEmpty && confirmareParola != parola {
                            Text("Parolele nu coincid.").foregroundStyle(.red)
                        }
                        Text("Parola trebuie să aibă cel puțin 8 caractere, dintre care o literă și o cifră.")
                    }
                }
            }

            if modInregistrare && rol == .business {
                Section("Datele firmei") {
                    TextField("Denumirea firmei", text: $numeFirma)
                        .textContentType(.organizationName)
                    TextField("Site (opțional)", text: $site)
                        .textContentType(.URL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }

            if !modInregistrare {
                Section {
                    Button(parolaCeruta ? "Link trimis pe email" : "Am uitat parola") {
                        cereParolaNoua()
                    }
                    .font(.footnote)
                    .disabled(parolaCeruta || seTrimite)
                } footer: {
                    if parolaCeruta {
                        Text("Dacă adresa are un cont, linkul de schimbare a parolei e pe drum. Este valabil o oră.")
                    }
                }
            }

            if let eroare {
                Section {
                    Text(eroare)
                        .font(.footnote)
                        .foregroundStyle(.red)
                    Button("Schimbă adresa serverului") { arataSetariServer = true }
                        .font(.footnote)
                } footer: {
                    Text("Server: \(Config.textServer)")
                }
            }

            Section {
                Button(action: trimite) {
                    HStack {
                        Spacer()
                        if seTrimite {
                            ProgressView().tint(.white)
                        } else {
                            Text(modInregistrare ? "Creează contul" : "Autentificare")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(seTrimite)
                .listRowBackground(Tema.accent)
                .foregroundStyle(.white)
            } footer: {
                VStack(alignment: .leading, spacing: 8) {
                    if seTrimite {
                        Text("Prima autentificare după o pauză poate dura până la un minut, cât pornește serverul.")
                    }
                    if modInregistrare {
                        // Acceptarea prin acțiune, notată pe server ca dată.
                        Text("Creând contul accepți termenii și condițiile și politica de confidențialitate, disponibile pe scorer.ro.")
                    }
                }
            }
        }
    }

    private func cereParolaNoua() {
        let adresa = email.trimmingCharacters(in: .whitespaces)
        guard adresa.contains("@") else {
            eroare = "Scrie întâi adresa de email."
            return
        }
        eroare = nil
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                try await sesiune.cereParolaNoua(email: adresa)
                parolaCeruta = true
            } catch {
                eroare = error.localizedDescription
            }
        }
    }

    private func retrimite(_ adresa: String) async {
        eroare = nil
        seTrimite = true
        defer { seTrimite = false }
        do {
            try await sesiune.retrimiteConfirmarea(email: adresa)
            linkRetrimis = true
            emailulAPlecat = true
        } catch {
            eroare = error.localizedDescription
        }
    }

    private func trimite() {
        eroare = nil

        if modInregistrare {
            guard parola.count >= 8 else {
                eroare = "Parola trebuie să aibă cel puțin 8 caractere."
                return
            }
            guard parola == confirmareParola else {
                eroare = "Parolele nu coincid."
                return
            }
            if rol == .business, numeFirma.trimmingCharacters(in: .whitespaces).count < 2 {
                eroare = "Completează denumirea firmei."
                return
            }
        }

        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                if modInregistrare {
                    let adresa = email.trimmingCharacters(in: .whitespaces)
                    emailulAPlecat = try await sesiune.inregistreaza(
                        nume: nume.trimmingCharacters(in: .whitespaces),
                        email: adresa,
                        parola: parola,
                        telefon: telefon.trimmingCharacters(in: .whitespaces),
                        oras: oras.trimmingCharacters(in: .whitespaces),
                        numeFirma: numeFirma.trimmingCharacters(in: .whitespaces),
                        site: site.trimmingCharacters(in: .whitespaces),
                        rol: rol
                    )
                    linkRetrimis = false
                    asteaptaConfirmare = adresa
                } else {
                    try await sesiune.autentifica(
                        email: email.trimmingCharacters(in: .whitespaces),
                        parola: parola,
                        rol: rol
                    )
                }
            } catch {
                eroare = error.localizedDescription
            }
        }
    }
}
