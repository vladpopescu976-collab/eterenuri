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

    private let baza: URL
    private let sesiuneRetea: URLSession

    private init() {
        baza = Config.urlBaza.appendingPathComponent("api/mobil")
        let configurare = URLSessionConfiguration.default
        // Baza de date se trezește greu după inactivitate, deci lăsăm timp.
        configurare.timeoutIntervalForRequest = 60
        sesiuneRetea = URLSession(configuration: configurare)
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
            throw EroareApi(mesaj: "Nu am putut contacta serverul. Verifică conexiunea.")
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
