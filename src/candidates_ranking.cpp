#include "common.h"

int main() {
    vector<Candidate> v;
    bool ok = loadAllCandidates(v);

    cout << "Content-type: application/json\r\n\r\n";

    if (!ok) {
        cout << "{ \"status\": \"error\", \"message\": \"nu pot citi fisierul\" }\n";
        return 0;
    }

    // sortam descrescator dupa media de admitere
    sortByMediaAdmitereDesc(v);

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"count\": " << v.size() << ",\n";
    cout << "  \"candidates\": [\n";

    for (size_t i = 0; i < v.size(); ++i) {
        const Candidate& c = v[i];
        cout << "    {\n";
        cout << "      \"position\": " << (i + 1) << ",\n";
        cout << "      \"cnp\": \"" << c.getCnp() << "\",\n";
        cout << "      \"nume\": \"" << c.getNume() << "\",\n";
        cout << "      \"prenume\": \"" << c.getPrenume() << "\",\n";
        cout << "      \"liceu\": \"" << c.getLiceu() << "\",\n";
        cout << "      \"filiera\": \"" << c.getFiliera() << "\",\n";
        cout << "      \"specializare\": \"" << c.getSpecializare() << "\",\n";
        cout << "      \"mediaAdmitere\": " << c.getMediaAdmitere() << "\n";
        cout << "    }";
        if (i + 1 < v.size()) cout << ",";
        cout << "\n";
    }

    cout << "  ]\n";
    cout << "}\n";

    return 0;
}

