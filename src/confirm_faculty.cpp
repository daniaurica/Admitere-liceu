#include "common.h"

/*
    confirm_faculty.cgi

    Confirma facultatea aleasa de candidat.
    POST request, operator sau admin.
    
    Parametri:
    - cnp: CNP-ul candidatului
    - role: rolul utilizatorului care confirma
    - facultate_confirmata: facultatea aleasa (ex: "Facultatea X (buget)")
    
    Candidatul trebuie sa aiba aceasta facultate in lista de repartizari.
*/

int main() {
    map<string, string> params = readParams();
    string cnp = params["cnp"];
    string role = params["role"];
    string facConfirmata = params["facultate_confirmata"];

    cout << "Content-type: application/json\r\n\r\n";

    if (role != "operator" && role != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Doar operatorul sau adminul poate confirma facultatea\" }\n";
        return 0;
    }

    if (cnp.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"CNP-ul este obligatoriu\" }\n";
        return 0;
    }

    if (facConfirmata.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Facultatea confirmata este obligatorie\" }\n";
        return 0;
    }

    // Cautam candidatul
    Candidate c;
    if (!findCandidateByCnp(cnp, c)) {
        cout << "{ \"status\": \"error\", \"message\": \"Candidatul cu acest CNP nu exista\" }\n";
        return 0;
    }

    // Verificam ca facultatea confirmata e in lista de repartizari
    string repartizat = c.getRepartizat();
    if (repartizat.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Candidatul nu a fost repartizat la nicio facultate\" }\n";
        return 0;
    }

    // Split repartizat by pipe
    vector<string> optiuni;
    {
        stringstream ss(repartizat);
        string token;
        while (getline(ss, token, '|')) {
            optiuni.push_back(token);
        }
    }

    bool gasit = false;
    for (size_t i = 0; i < optiuni.size(); ++i) {
        if (optiuni[i] == facConfirmata) {
            gasit = true;
            break;
        }
    }

    if (!gasit) {
        cout << "{ \"status\": \"error\", \"message\": \"Facultatea selectata nu se regaseste in optiunile repartizate ale candidatului\" }\n";
        return 0;
    }

    // Setam confirmarea
    c.setConfirmat(facConfirmata);

    // Salvam
    if (!updateCandidateInFile(c)) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot actualiza fisierul\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"message\": \"Facultatea a fost confirmata cu succes\",\n";
    cout << "  \"confirmat\": \"" << jsonEscape(facConfirmata) << "\"\n";
    cout << "}\n";

    return 0;
}
