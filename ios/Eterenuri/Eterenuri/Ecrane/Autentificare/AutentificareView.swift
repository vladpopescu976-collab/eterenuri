import SwiftUI

struct AutentificareView: View {
    @Environment(Sesiune.self) private var sesiune

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
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Server", systemImage: "server.rack") { arataSetari = true }
                    }
                }
            }
        }
        .sheet(isPresented: $arataSetari) {
            NavigationStack { SetariServerView() }
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
                Text("Eterenuri")
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
    @State private var telefon = ""
    @State private var eroare: String?
    @State private var seTrimite = false
    @State private var arataSetariServer = false

    private var titlu: String { rol == .business ? "Cont Business" : "Cont Personal" }

    var body: some View {
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
                    TextField("Nume", text: $nume)
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
                    TextField("Telefon (opțional)", text: $telefon)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }
            } footer: {
                if modInregistrare {
                    Text("Parola trebuie să aibă cel puțin 8 caractere.")
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
                if seTrimite {
                    Text("Prima autentificare după o pauză poate dura până la un minut, cât pornește serverul.")
                }
            }
        }
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

    private func trimite() {
        eroare = nil
        seTrimite = true
        Task {
            defer { seTrimite = false }
            do {
                if modInregistrare {
                    try await sesiune.inregistreaza(
                        nume: nume.trimmingCharacters(in: .whitespaces),
                        email: email.trimmingCharacters(in: .whitespaces),
                        parola: parola,
                        telefon: telefon.trimmingCharacters(in: .whitespaces),
                        rol: rol
                    )
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
