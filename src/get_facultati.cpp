#include "common.h"

/*
    get_facultati.cgi

    Returneaza lista facultatilor din Suceava (USV) in format JSON.
    Fiecare facultate are: nume, domeniu, lista de specializari.
    GET - nu necesita parametri.
*/

int main() {
    cout << "Content-type: application/json\r\n\r\n";

    vector<FacultateInfo> facultati;
    bool ok = loadFacultati(facultati);

    if (!ok || facultati.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot citi lista de facultati\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"universitate\": \"Universitatea Ștefan cel Mare din Suceava\",\n";
    cout << "  \"count\": " << facultati.size() << ",\n";
    cout << "  \"facultati\": [\n";

    for (size_t i = 0; i < facultati.size(); ++i) {
        const FacultateInfo& fi = facultati[i];
        cout << "    {\n";
        cout << "      \"nume\": \"" << jsonEscape(fi.nume) << "\",\n";
        cout << "      \"domeniu\": \"" << jsonEscape(fi.domeniu) << "\",\n";
        cout << "      \"specializari\": [";

        for (size_t j = 0; j < fi.specializari.size(); ++j) {
            cout << "\"" << jsonEscape(fi.specializari[j]) << "\"";
            if (j + 1 < fi.specializari.size()) cout << ", ";
        }

        cout << "]\n";
        cout << "    }";
        if (i + 1 < facultati.size()) cout << ",";
        cout << "\n";
    }

    cout << "  ]\n";
    cout << "}\n";

    return 0;
}
