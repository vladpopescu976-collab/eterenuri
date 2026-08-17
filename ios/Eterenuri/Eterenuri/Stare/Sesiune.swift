import Foundation
import Observation

/// Cine e conectat și cu ce token. Tokenul e ținut în Keychain, nu în
/// UserDefaults, ca să nu rămână în backup-uri necriptate.
@MainActor
@Observable
final class Sesiune {
    private(set) var utilizator: Utilizator?
    private(set) var seIncarca = true

    var esteConectat: Bool { utilizator != nil }
    var esteBusiness: Bool { utilizator?.rol == .business }

    private let cheieToken = "eterenuri.token"

    func porneste() async {
        defer { seIncarca = false }
        guard let token = Keychain.citeste(cheieToken) else { return }

        await ApiClient.shared.seteazaToken(token)
        do {
            utilizator = try await ApiClient.shared.cere("eu", ca: Utilizator.self)
        } catch {
            // Token expirat sau cont șters — pornim ca deconectat.
            await deconecteaza()
        }
    }

    func autentifica(email: String, parola: String, rol: Rol) async throws {
        struct Corp: Encodable {
            let email: String
            let password: String
            let role: String
        }
        let raspuns: RaspunsAutentificare = try await ApiClient.shared.cere(
            "auth/autentificare",
            metoda: "POST",
            corp: Corp(email: email, password: parola, role: rol.rawValue)
        )
        await aplica(raspuns)
    }

    func inregistreaza(
        nume: String,
        email: String,
        parola: String,
        telefon: String,
        rol: Rol
    ) async throws {
        struct Corp: Encodable {
            let name: String
            let email: String
            let password: String
            let phone: String?
            let role: String
        }
        let raspuns: RaspunsAutentificare = try await ApiClient.shared.cere(
            "auth/inregistrare",
            metoda: "POST",
            corp: Corp(
                name: nume,
                email: email,
                password: parola,
                phone: telefon.isEmpty ? nil : telefon,
                role: rol.rawValue
            )
        )
        await aplica(raspuns)
    }

    private func aplica(_ raspuns: RaspunsAutentificare) async {
        Keychain.scrie(cheieToken, valoare: raspuns.token)
        await ApiClient.shared.seteazaToken(raspuns.token)
        utilizator = raspuns.utilizator
    }

    func deconecteaza() async {
        Keychain.sterge(cheieToken)
        await ApiClient.shared.seteazaToken(nil)
        utilizator = nil
    }
}

enum Keychain {
    private static func interogare(_ cheie: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "ro.eterenuri.app",
            kSecAttrAccount as String: cheie,
        ]
    }

    static func scrie(_ cheie: String, valoare: String) {
        var interogare = interogare(cheie)
        SecItemDelete(interogare as CFDictionary)
        interogare[kSecValueData as String] = Data(valoare.utf8)
        interogare[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(interogare as CFDictionary, nil)
    }

    static func citeste(_ cheie: String) -> String? {
        var interogare = interogare(cheie)
        interogare[kSecReturnData as String] = true
        interogare[kSecMatchLimit as String] = kSecMatchLimitOne

        var rezultat: CFTypeRef?
        guard SecItemCopyMatching(interogare as CFDictionary, &rezultat) == errSecSuccess,
              let date = rezultat as? Data
        else { return nil }
        return String(data: date, encoding: .utf8)
    }

    static func sterge(_ cheie: String) {
        SecItemDelete(interogare(cheie) as CFDictionary)
    }
}
