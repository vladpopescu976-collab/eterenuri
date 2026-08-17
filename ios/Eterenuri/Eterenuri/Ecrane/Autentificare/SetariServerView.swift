import SwiftUI

/// Adresa backendului se schimbă de aici, fără recompilare — pe un iPhone real
/// ea depinde de rețeaua în care e calculatorul și se schimbă des.
struct SetariServerView: View {
    @Environment(\.dismiss) private var inchide

    @State private var text = Config.textServer
    @State private var rezultat: Rezultat?
    @State private var seTesteaza = false

    private enum Rezultat {
        case reusit(Int)
        case esuat(String)
    }

    var body: some View {
        Form {
            Section {
                TextField("ex. 192.168.1.10:3000", text: $text)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            } header: {
                Text("Adresa serverului")
            } footer: {
                Text("""
                    Pe simulator: 127.0.0.1:3000
                    Pe telefon: adresa calculatorului în rețea, cea afișată de „npm run dev” la „Network”.
                    """)
            }

            Section {
                Button {
                    testeaza()
                } label: {
                    HStack {
                        Text("Testează conexiunea")
                        Spacer()
                        if seTesteaza { ProgressView() }
                    }
                }
                .disabled(seTesteaza || text.trimmingCharacters(in: .whitespaces).isEmpty)

                switch rezultat {
                case .reusit(let terenuri):
                    Label(
                        "Serverul răspunde. \(terenuri) terenuri disponibile.",
                        systemImage: "checkmark.circle.fill"
                    )
                    .foregroundStyle(.green)
                    .font(.footnote)
                case .esuat(let mesaj):
                    Label(mesaj, systemImage: "xmark.circle.fill")
                        .foregroundStyle(.red)
                        .font(.footnote)
                case nil:
                    EmptyView()
                }
            }

            Section {
                Button("Revino la adresa implicită") {
                    Config.textServer = ""
                    text = Config.textServer
                    rezultat = nil
                }
            }
        }
        .navigationTitle("Server")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Renunță") { inchide() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Salvează") {
                    Config.textServer = text
                    inchide()
                }
                .disabled(Config.normalizeaza(text) == nil)
            }
        }
    }

    private func testeaza() {
        guard let url = Config.normalizeaza(text) else {
            rezultat = .esuat("Adresă invalidă.")
            return
        }

        // Salvăm înainte de test, ca apelul să folosească exact ce se vede.
        let anterior = Config.textServer
        Config.textServer = text
        seTesteaza = true
        rezultat = nil

        Task {
            defer { seTesteaza = false }
            do {
                let terenuri = try await ApiClient.shared.cere("terenuri", ca: [Teren].self)
                rezultat = .reusit(terenuri.count)
            } catch {
                Config.textServer = anterior
                text = anterior
                rezultat = .esuat(error.localizedDescription)
            }
            _ = url
        }
    }
}
