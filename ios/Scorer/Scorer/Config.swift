import Foundation

enum Config {
    private static let cheieServer = "scorer.adresaServer"

    /// Adresa scrisă în Info.plist, folosită până când utilizatorul pune alta.
    private static var adresaImplicita: String {
        let dinPlist = Bundle.main.object(forInfoDictionaryKey: "ScorerApiURL") as? String
        return dinPlist?.isEmpty == false ? dinPlist! : "http://127.0.0.1:3000"
    }

    /// Adresa curentă, ca text — se poate schimba din aplicație, fără recompilare.
    ///
    /// Simulatorul ajunge la Mac prin `127.0.0.1`; „localhost” nu merge, pentru
    /// că se rezolvă la `::1`, adică loopback-ul dispozitivului simulat.
    /// Un iPhone real are nevoie de adresa Mac-ului din rețea, care se schimbă
    /// la fiecare rețea — de aceea e o setare, nu o constantă.
    static var textServer: String {
        get { UserDefaults.standard.string(forKey: cheieServer) ?? adresaImplicita }
        set {
            let curatat = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if curatat.isEmpty {
                UserDefaults.standard.removeObject(forKey: cheieServer)
            } else {
                UserDefaults.standard.set(curatat, forKey: cheieServer)
            }
        }
    }

    static var urlBaza: URL {
        normalizeaza(textServer) ?? URL(string: "http://127.0.0.1:3000")!
    }

    /// Acceptă și „192.168.1.5:3000”, fără schemă, ca să nu fie nevoie de precizie.
    static func normalizeaza(_ text: String) -> URL? {
        var curatat = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !curatat.isEmpty else { return nil }
        if !curatat.contains("://") { curatat = "http://" + curatat }
        while curatat.hasSuffix("/") { curatat.removeLast() }
        guard let url = URL(string: curatat), url.host != nil else { return nil }
        return url
    }

    /// Pozele încărcate în aplicație vin ca „/api/poze/…”, deci au nevoie de gazdă.
    static func urlPoza(_ cale: String) -> URL? {
        if cale.hasPrefix("http") { return URL(string: cale) }
        return URL(string: cale, relativeTo: urlBaza)
    }
}
