#include "common.h"

int main() {
    map<string, string> params = readParams();
    string cnp = params["cnp"];

    cout << "Content-type: text/plain\r\n\r\n";

    if (cnp.empty()) {
        cout << "Eroare: lipseste parametrul 'cnp'.\n";
        return 0;
    }

    Candidate c;
    bool ok = findCandidateByCnp(cnp, c);

    if (!ok) {
        cout << "Candidat cu CNP " << cnp << " nu a fost gasit.\n";
        return 0;
    }

    cout << "FISA DE INSCRIERE - ADMITERE LICEU\n";
    cout << "-----------------------------------\n\n";
    cout << "CNP: " << c.getCnp() << "\n";
    cout << "Nume: " << c.getNume() << "\n";
    cout << "Prenume: " << c.getPrenume() << "\n\n";
    cout << "Liceu: " << c.getLiceu() << "\n";
    cout << "Filiera: " << c.getFiliera() << "\n";
    cout << "Specializare: " << c.getSpecializare() << "\n\n";
    cout << "Medie generala: " << c.getMedieGenerala() << "\n";
    cout << "Nota proba 1: " << c.getNota1() << "\n";
    cout << "Nota proba 2: " << c.getNota2() << "\n";
    cout << "Media admitere: " << c.getMediaAdmitere() << "\n";

    return 0;
}

