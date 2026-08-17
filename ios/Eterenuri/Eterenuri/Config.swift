import Foundation

enum Config {
    /// Adresa backendului, luată din Info.plist (cheia `EterenuriApiURL`).
    ///
    /// Atenție: în simulator trebuie `127.0.0.1`, nu `localhost`. „localhost”
    /// se rezolvă întâi la `::1`, care acolo înseamnă loopback-ul dispozitivului
    /// simulat, nu al Mac-ului, iar cererile expiră fără niciun mesaj util.
    static var urlBaza: URL {
        if let text = Bundle.main.object(forInfoDictionaryKey: "EterenuriApiURL") as? String,
           !text.isEmpty,
           let url = URL(string: text) {
            return url
        }
        return URL(string: "http://127.0.0.1:3000")!
    }

    /// Pozele încărcate în aplicație vin ca „/api/poze/…”, deci au nevoie de gazdă.
    static func urlPoza(_ cale: String) -> URL? {
        if cale.hasPrefix("http") { return URL(string: cale) }
        return URL(string: cale, relativeTo: urlBaza)
    }
}
