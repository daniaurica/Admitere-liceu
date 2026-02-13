#include "common.h"

/*
    candidate_sheet.cgi

    Returneaza datele unui candidat in format JSON.
    Parametri GET: cnp, role
    
    Reguli de acces:
    - candidat: vede doar datele proprii (CNP-ul trebuie sa se potriveasca)
    - operator: vede datele oricarui candidat
    - admin: vede datele oricarui candidat
*/

int main() {
    map<string, string> params = readParams();
    string cnp = params["cnp"];
    string role = params["role"];

    cout << "Content-type: application/json\r\n\r\n";

    if (cnp.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Lipseste parametrul cnp\" }\n";
        return 0;
    }

    Candidate c;
    bool ok = findCandidateByCnp(cnp, c);

    if (!ok) {
        cout << "{ \"status\": \"error\", \"message\": \"Candidat cu acest CNP nu a fost gasit\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"candidate\": {\n";
    cout << "    \"cnp\": \"" << jsonEscape(c.getCnp()) << "\",\n";
    cout << "    \"nume\": \"" << jsonEscape(c.getNume()) << "\",\n";
    cout << "    \"prenume\": \"" << jsonEscape(c.getPrenume()) << "\",\n";
    cout << "    \"facultate\": \"" << jsonEscape(c.getFacultate()) << "\",\n";
    cout << "    \"domeniu\": \"" << jsonEscape(c.getDomeniu()) << "\",\n";
    cout << "    \"specializare\": \"" << jsonEscape(c.getSpecializare()) << "\",\n";

    // Output optiuni as arrays (pipe-separated internally)
    cout << "    \"optiuni\": [\n";
    {
        string facs = c.getFacultate();
        string doms = c.getDomeniu();
        string specs = c.getSpecializare();
        vector<string> vf, vd, vs;
        // split by |
        {
            stringstream ss(facs); string t;
            while (getline(ss, t, '|')) vf.push_back(t);
        }
        {
            stringstream ss(doms); string t;
            while (getline(ss, t, '|')) vd.push_back(t);
        }
        {
            stringstream ss(specs); string t;
            while (getline(ss, t, '|')) vs.push_back(t);
        }
        size_t count = vf.size();
        // Skip if only one empty entry
        bool hasOptions = !(count == 1 && vf[0].empty());
        if (hasOptions) {
            for (size_t i = 0; i < count; ++i) {
                cout << "      {\n";
                cout << "        \"facultate\": \"" << jsonEscape(i < vf.size() ? vf[i] : "") << "\",\n";
                cout << "        \"domeniu\": \"" << jsonEscape(i < vd.size() ? vd[i] : "") << "\",\n";
                cout << "        \"specializare\": \"" << jsonEscape(i < vs.size() ? vs[i] : "") << "\"\n";
                cout << "      }";
                if (i + 1 < count) cout << ",";
                cout << "\n";
            }
        }
    }
    cout << "    ],\n";

    cout << "    \"medieBac\": " << c.getMedieBac() << ",\n";
    cout << "    \"nota1\": " << c.getNota1() << ",\n";
    cout << "    \"nota2\": " << c.getNota2() << ",\n";
    cout << "    \"mediaAdmitere\": " << c.getMediaAdmitere() << ",\n";
    cout << "    \"repartizat\": \"" << jsonEscape(c.getRepartizat()) << "\",\n";
    cout << "    \"confirmat\": \"" << jsonEscape(c.getConfirmat()) << "\"\n";
    cout << "  }\n";
    cout << "}\n";

    return 0;
}


