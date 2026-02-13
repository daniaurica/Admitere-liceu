#include "common.h"
#include <algorithm>

/*
    repartizare.cgi

    Repartizarea automata a candidatilor pe facultati.
    POST request, doar admin.
    
    Algoritm NOU (multi-optiune):
    1. Incarca toti candidatii, sorteaza descrescator dupa mediaAdmitere
    2. Incarca locurile (buget + taxa) pe fiecare facultate
    3. Pentru fiecare candidat (de la cel mai bun la cel mai slab):
       - Parcurge TOATE optiunile sale (pipe-separated)
       - Pentru fiecare facultate care are loc liber (buget mai intai, apoi taxa) => o adauga in lista
       - Candidatul primeste TOATE facultatile la care se incadreaza
    4. Candidatul vede toate optiunile si alege una (confirmare ulterioara de operator/admin)
    5. Salveaza rezultatele in candidates.txt (campul repartizat = pipe-separated)
    6. Returneaza JSON cu rezultatele
*/

// structura pentru contorizare locuri ramase
struct LocuriDisponibile {
    int bugetRamas;
    int taxaRamas;
};

// split by pipe
vector<string> splitPipe(const string& s) {
    vector<string> result;
    if (s.empty()) return result;
    stringstream ss(s);
    string token;
    while (getline(ss, token, '|')) {
        result.push_back(token);
    }
    return result;
}

bool cmpByMedia(const Candidate& a, const Candidate& b) {
    return a.getMediaAdmitere() > b.getMediaAdmitere();
}

int main() {
    map<string, string> params = readParams();
    string role = params["role"];

    cout << "Content-type: application/json\r\n\r\n";

    if (role != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Doar adminul poate face repartizarea\" }\n";
        return 0;
    }

    // 1. Incarca candidatii
    vector<Candidate> candidati;
    if (!loadAllCandidates(candidati) || candidati.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu exista candidati\" }\n";
        return 0;
    }

    // 2. Incarca locurile
    vector<LocuriFacultate> locuri;
    if (!loadLocuri(locuri) || locuri.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu sunt definite locurile pe facultati. Setati mai intai locurile buget/taxa.\" }\n";
        return 0;
    }

    // Creeam map de locuri disponibile
    map<string, LocuriDisponibile> disponibil;
    for (size_t i = 0; i < locuri.size(); ++i) {
        LocuriDisponibile ld;
        ld.bugetRamas = locuri[i].locuribuget;
        ld.taxaRamas = locuri[i].locuriTaxa;
        disponibil[locuri[i].numeFacultate] = ld;
    }

    // 3. Sorteaza candidatii descrescator dupa media de admitere
    sort(candidati.begin(), candidati.end(), cmpByMedia);

    // 4. Repartizarea - candidatul primeste TOATE facultatile la care se incadreaza
    struct RezultatRepartizare {
        string cnp;
        string nume;
        string prenume;
        double mediaAdmitere;
        string repartizatAll; // pipe-separated: "Fac1 (buget)|Fac2 (taxa)"
        int nrOptiuni;        // cate facultati a primit
    };

    vector<RezultatRepartizare> rezultate;

    for (size_t i = 0; i < candidati.size(); ++i) {
        Candidate& cand = candidati[i];
        
        // skip candidati fara medie (nu au dat examen)
        if (cand.getMediaAdmitere() <= 0) {
            RezultatRepartizare r;
            r.cnp = cand.getCnp();
            r.nume = cand.getNume();
            r.prenume = cand.getPrenume();
            r.mediaAdmitere = cand.getMediaAdmitere();
            r.repartizatAll = "";
            r.nrOptiuni = 0;
            cand.setRepartizat("");
            cand.setConfirmat("");
            rezultate.push_back(r);
            continue;
        }

        // optiunile candidatului (pipe-separated in campul facultate)
        vector<string> optFacultati = splitPipe(cand.getFacultate());

        // Colectam TOATE facultatile la care se incadreaza
        vector<string> repartizari;

        for (size_t j = 0; j < optFacultati.size(); ++j) {
            string facNume = optFacultati[j];
            if (facNume.empty()) continue;

            if (disponibil.count(facNume) == 0) continue;

            LocuriDisponibile& ld = disponibil[facNume];

            if (ld.bugetRamas > 0) {
                ld.bugetRamas--;
                repartizari.push_back(facNume + " (buget)");
            } else if (ld.taxaRamas > 0) {
                ld.taxaRamas--;
                repartizari.push_back(facNume + " (taxa)");
            }
            // daca nu are loc nici la buget, nici la taxa => skip aceasta facultate
        }

        // Construim string-ul pipe-separated
        string repartizatStr;
        for (size_t k = 0; k < repartizari.size(); ++k) {
            if (k > 0) repartizatStr += "|";
            repartizatStr += repartizari[k];
        }

        cand.setRepartizat(repartizatStr);
        // Resetam confirmarea (va fi setata ulterior de operator/admin)
        cand.setConfirmat("");

        RezultatRepartizare r;
        r.cnp = cand.getCnp();
        r.nume = cand.getNume();
        r.prenume = cand.getPrenume();
        r.mediaAdmitere = cand.getMediaAdmitere();
        r.repartizatAll = repartizatStr;
        r.nrOptiuni = repartizari.size();
        rezultate.push_back(r);
    }

    // 5. Salvam candidatii actualizati
    string candFile = getCandidatesFilePath();
    ofstream fout(candFile.c_str());
    if (fout) {
        for (size_t i = 0; i < candidati.size(); ++i) {
            fout << candidati[i].toFileLine() << '\n';
        }
        fout.close();
    }

    // 6. Salvam raportul de repartizare
    string rapFile = getDataFilePath("repartizare.txt");
    ofstream rap(rapFile.c_str());
    if (rap) {
        for (size_t i = 0; i < rezultate.size(); ++i) {
            rap << rezultate[i].cnp << ';'
                << rezultate[i].nume << ';'
                << rezultate[i].prenume << ';'
                << rezultate[i].mediaAdmitere << ';'
                << rezultate[i].repartizatAll << ';'
                << rezultate[i].nrOptiuni << '\n';
        }
        rap.close();
    }

    // 7. Returnam JSON
    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"message\": \"Repartizare finalizata\",\n";
    cout << "  \"total\": " << rezultate.size() << ",\n";
    cout << "  \"rezultate\": [\n";

    for (size_t i = 0; i < rezultate.size(); ++i) {
        cout << "    {\n";
        cout << "      \"cnp\": \"" << jsonEscape(rezultate[i].cnp) << "\",\n";
        cout << "      \"nume\": \"" << jsonEscape(rezultate[i].nume) << "\",\n";
        cout << "      \"prenume\": \"" << jsonEscape(rezultate[i].prenume) << "\",\n";
        cout << "      \"mediaAdmitere\": " << rezultate[i].mediaAdmitere << ",\n";
        cout << "      \"repartizat\": \"" << jsonEscape(rezultate[i].repartizatAll) << "\",\n";
        cout << "      \"nrOptiuni\": " << rezultate[i].nrOptiuni << "\n";
        cout << "    }";
        if (i < rezultate.size() - 1) cout << ",";
        cout << "\n";
    }

    cout << "  ]\n";
    cout << "}\n";

    return 0;
}
