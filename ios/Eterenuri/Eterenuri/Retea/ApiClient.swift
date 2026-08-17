import Foundation

/// Eroare cu mesajul venit de la server, ca să îl putem arăta direct în interfață.
struct EroareApi: LocalizedError {
    let mesaj: String
    var errorDescription: String? { mesaj }
}

/// Toate răspunsurile au forma { ok, data } sau { ok, error }.
private struct Anvelopa<T: Decodable>: Decodable {
    let ok: Bool
    let data: T?
    let error: String?
}

private struct AnvelopaEroare: Decodable {
    let error: String?
}

actor ApiClient {
    static let shared = ApiClient()

    private let sesiuneRetea: URLSession

    private init() {
        let configurare = URLSessionConfiguration.default
        // Baza de date se trezește greu după inactivitate, deci lăsăm timp.
        configurare.timeoutIntervalForRequest = 60
        sesiuneRetea = URLSession(configuration: configurare)
    }

    /// Citită la fiecare cerere, ca schimbarea adresei din aplicație să aibă
    /// efect imediat, fără repornire.
    private var baza: URL {
        Config.urlBaza.appendingPathComponent("api/mobil")
    }

    private var token: String?

    func seteazaToken(_ valoare: String?) {
        token = valoare
    }

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            // Serverul trimite ISO cu milisecunde, dar acceptăm și fără.
            if let data = try? Date(text, strategy: .iso8601cuFractiuni) { return data }
            if let data = try? Date(text, strategy: .iso8601faraFractiuni) { return data }
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Dată invalidă: \(text)")
            )
        }
        return d
    }()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .custom { data, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(data.formatted(.iso8601cuFractiuni))
        }
        return e
    }()

    func cere<T: Decodable>(
        _ cale: String,
        metoda: String = "GET",
        parametri: [String: String] = [:],
        corp: (any Encodable)? = nil,
        ca: T.Type = T.self
    ) async throws -> T {
        var componente = URLComponents(
            url: baza.appendingPathComponent(cale),
            resolvingAgainstBaseURL: false
        )!
        if !parametri.isEmpty {
            componente.queryItems = parametri.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        var cerere = URLRequest(url: componente.url!)
        cerere.httpMethod = metoda
        cerere.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            cerere.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let corp {
            cerere.httpBody = try Self.encoder.encode(AnyEncodable(corp))
        }

        let (date, raspuns): (Data, URLResponse)
        do {
            (date, raspuns) = try await sesiuneRetea.data(for: cerere)
        } catch {
            // Mesajul spune și de ce a picat, altfel „verifică conexiunea” nu
            // ajută cu nimic la depanare.
            throw EroareApi(mesaj: Self.explica(error, url: componente.url))
        }

        let cod = (raspuns as? HTTPURLResponse)?.statusCode ?? 0

        guard (200..<300).contains(cod) else {
            let mesaj = (try? Self.decoder.decode(AnvelopaEroare.self, from: date))?.error
            throw EroareApi(mesaj: mesaj ?? "Cerere eșuată (cod \(cod)).")
        }

        do {
            let anvelopa = try Self.decoder.decode(Anvelopa<T>.self, from: date)
            guard let continut = anvelopa.data else {
                throw EroareApi(mesaj: anvelopa.error ?? "Răspuns neașteptat de la server.")
            }
            return continut
        } catch let eroare as EroareApi {
            throw eroare
        } catch {
            throw EroareApi(mesaj: "Nu am putut citi răspunsul serverului.")
        }
    }

    /// Traduce erorile de rețea în ceva pe care îl poți citi și acționa.
    private static func explica(_ error: Error, url: URL?) -> String {
        let adresa = url?.host.map { "\($0):\(url?.port ?? 80)" } ?? "server"

        guard let urlError = error as? URLError else {
            return "Nu am putut contacta serverul (\(adresa)). \(error.localizedDescription)"
        }

        let eLoopback = ["127.0.0.1", "localhost", "::1"].contains(url?.host ?? "")

        switch urlError.code {
        case .cannotConnectToHost where eLoopback, .timedOut where eLoopback:
            return "Pe telefon, \(adresa) înseamnă telefonul însuși, nu calculatorul. Pune adresa calculatorului din rețea la „Adresa serverului”."
        case .cannotConnectToHost:
            return "Serverul de la \(adresa) nu răspunde. Pornește-l cu „npm run dev” sau schimbă EterenuriApiURL din Info.plist."
        case .cannotFindHost:
            return "Adresa \(adresa) nu poate fi găsită. Verifică EterenuriApiURL din Info.plist."
        case .timedOut:
            return "Serverul de la \(adresa) nu a răspuns la timp. Prima cerere după o pauză poate dura, încearcă din nou."
        case .notConnectedToInternet, .networkConnectionLost:
            return "Nu există conexiune la rețea."
        case .appTransportSecurityRequiresSecureConnection:
            return "iOS a blocat conexiunea nesecurizată către \(adresa). Folosește https sau adaugă o excepție în Info.plist."
        default:
            return "Nu am putut contacta serverul (\(adresa)). \(urlError.localizedDescription) [cod \(urlError.errorCode)]"
        }
    }

    /// Pentru rutele care nu întorc nimic util.
    func cereFaraRaspuns(
        _ cale: String,
        metoda: String,
        corp: (any Encodable)? = nil
    ) async throws {
        struct Orice: Decodable {}
        _ = try await cere(cale, metoda: metoda, corp: corp, ca: Orice.self)
    }
}

/// Permite trimiterea oricărui `Encodable` fără generice peste tot.
private struct AnyEncodable: Encodable {
    private let codifica: (Encoder) throws -> Void

    init(_ valoare: any Encodable) {
        codifica = valoare.encode
    }

    func encode(to encoder: Encoder) throws {
        try codifica(encoder)
    }
}

// `Date.ISO8601FormatStyle` este Sendable, spre deosebire de ISO8601DateFormatter,
// deci poate sta în proprietăți statice sub concurența strictă din Swift 6.
extension ParseStrategy where Self == Date.ISO8601FormatStyle {
    static var iso8601cuFractiuni: Date.ISO8601FormatStyle {
        .init(includingFractionalSeconds: true)
    }
    static var iso8601faraFractiuni: Date.ISO8601FormatStyle {
        .init()
    }
}

extension FormatStyle where Self == Date.ISO8601FormatStyle {
    static var iso8601cuFractiuni: Date.ISO8601FormatStyle {
        .init(includingFractionalSeconds: true)
    }
}
