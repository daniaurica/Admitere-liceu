#include "common.h"

/*
    save_locuri.cgi

    Salveaza numarul de locuri buget si taxa pe fiecare facultate.
    Primeste prin POST:
    - role (operator sau admin)
    - locuri: format "NumeFacultate1:buget:taxa|NumeFacultate2:buget:taxa|..."
    
    Doar operator si admin au acces.
*/

int main() {
    map<string, string> params = readParams();

    string role = params["role"];
    string locuriData = params["locuri"];

    cout << "Content-type: application/json\r\n\r\n";

    if (role != "operator" && role != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Acces interzis\" }\n";
        return 0;
    }

    if (locuriData.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Datele sunt obligatorii\" }\n";
        return 0;
    }

    // parsam: "Fac1:50:30|Fac2:40:20|..."
    vector<LocuriFacultate> locuri;
    stringstream ss(locuriData);
    string entry;
    while (getline(ss, entry, '|')) {
        if (entry.empty()) continue;

        // parsam "NumeFacultate:buget:taxa"
        stringstream es(entry);
        string numeFac, bugetStr, taxaStr;
        if (!getline(es, numeFac, ':')) continue;
        if (!getline(es, bugetStr, ':')) continue;
        if (!getline(es, taxaStr, ':')) continue;

        LocuriFacultate lf;
        lf.numeFacultate = numeFac;
        lf.locuribuget = atoi(bugetStr.c_str());
        lf.locuriTaxa = atoi(taxaStr.c_str());
        locuri.push_back(lf);
    }

    if (locuri.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu s-au putut parsa datele\" }\n";
        return 0;
    }

    if (!saveLocuri(locuri)) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot salva fisierul\" }\n";
        return 0;
    }

    cout << "{ \"status\": \"ok\", \"message\": \"Locuri salvate cu succes\", \"count\": " << locuri.size() << " }\n";
    return 0;
}
