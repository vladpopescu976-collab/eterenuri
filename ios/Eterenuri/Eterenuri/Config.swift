import Foundation

enum Config {
    /// Adresa backendului.
    ///
    /// În simulator, `localhost` e chiar Mac-ul, deci merge direct cu `next dev`.
    /// Pe un iPhone real, schimbă cu adresa din rețea a Mac-ului (ex.
    /// `http://192.168.1.130:3000`) sau cu adresa de producție.
    static var urlBaza: URL {
        if let text = Bundle.main.object(forInfoDictionaryKey: "EterenuriApiURL") as? String,
           !text.isEmpty,
           let url = URL(string: text) {
            return url
        }
        return URL(string: "http://localhost:3000")!
    }

    /// Pozele încărcate în aplicație vin ca „/api/poze/…”, deci au nevoie de gazdă.
    static func urlPoza(_ cale: String) -> URL? {
        if cale.hasPrefix("http") { return URL(string: cale) }
        return URL(string: cale, relativeTo: urlBaza)
    }
}
