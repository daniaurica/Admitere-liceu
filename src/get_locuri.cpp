#include "common.h"

/*
    get_locuri.cgi

    Returneaza numarul de locuri buget si taxa pe fiecare facultate.
    GET request, returneaza JSON array.
*/

int main() {
    cout << "Content-type: application/json\r\n\r\n";

    // incarcam facultatile
    vector<FacultateInfo> facultati;
    loadFacultati(facultati);

    // incarcam locurile
    vector<LocuriFacultate> locuri;
    loadLocuri(locuri);

    // cream un map: numeFacultate -> {buget, taxa}
    map<string, LocuriFacultate> locuriMap;
    for (size_t i = 0; i < locuri.size(); ++i) {
        locuriMap[locuri[i].numeFacultate] = locuri[i];
    }

    cout << "[\n";
    for (size_t i = 0; i < facultati.size(); ++i) {
        int buget = 0, taxa = 0;
        if (locuriMap.count(facultati[i].nume)) {
            buget = locuriMap[facultati[i].nume].locuribuget;
            taxa = locuriMap[facultati[i].nume].locuriTaxa;
        }

        cout << "  {\n";
        cout << "    \"facultate\": \"" << jsonEscape(facultati[i].nume) << "\",\n";
        cout << "    \"domeniu\": \"" << jsonEscape(facultati[i].domeniu) << "\",\n";
        cout << "    \"locuri_buget\": " << buget << ",\n";
        cout << "    \"locuri_taxa\": " << taxa << "\n";
        cout << "  }";
        if (i < facultati.size() - 1) cout << ",";
        cout << "\n";
    }
    cout << "]\n";

    return 0;
}
