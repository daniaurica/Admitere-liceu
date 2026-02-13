#include "common.h"

/*
    update_candidate.cgi

    Actualizeaza datele unui candidat existent.
    Primeste prin POST:
    - cnp (obligatoriu, identifica candidatul)
    - role (rolul utilizatorului care face modificarea)
    - campurile de actualizat

    Reguli de acces:
    - Candidatul (role=candidat) poate modifica: nume, prenume,
      facultate, domeniu, specializare (date personale + optiuni)
    - Operatorul (role=operator) poate modifica DOAR: medie_bac, nota1, nota2
      (note si medii)
    - Adminul (role=admin) poate modifica TOTUL
*/

int main() {
    map<string, string> params = readParams();

    string cnp = params["cnp"];
    string role = params["role"];

    cout << "Content-type: application/json\r\n\r\n";

    if (cnp.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"CNP-ul este obligatoriu\" }\n";
        return 0;
    }

    if (role.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Rolul utilizatorului este obligatoriu\" }\n";
        return 0;
    }

    // cautam candidatul
    Candidate c;
    if (!findCandidateByCnp(cnp, c)) {
        cout << "{ \"status\": \"error\", \"message\": \"Candidatul cu acest CNP nu exista\" }\n";
        return 0;
    }

    // aplicam modificarile in functie de rol
    if (role == "candidat") {
        // candidatul poate modifica datele personale si optiunile de facultate
        if (params.count("nume") && !params["nume"].empty())
            c.setNume(params["nume"]);
        if (params.count("prenume") && !params["prenume"].empty())
            c.setPrenume(params["prenume"]);
        if (params.count("facultate") && !params["facultate"].empty())
            c.setFacultate(params["facultate"]);
        if (params.count("domeniu") && !params["domeniu"].empty())
            c.setDomeniu(params["domeniu"]);
        if (params.count("specializare") && !params["specializare"].empty())
            c.setSpecializare(params["specializare"]);
    } else if (role == "admin") {
        // adminul poate modifica TOTUL
        if (params.count("nume") && !params["nume"].empty())
            c.setNume(params["nume"]);
        if (params.count("prenume") && !params["prenume"].empty())
            c.setPrenume(params["prenume"]);
        if (params.count("facultate") && !params["facultate"].empty())
            c.setFacultate(params["facultate"]);
        if (params.count("domeniu") && !params["domeniu"].empty())
            c.setDomeniu(params["domeniu"]);
        if (params.count("specializare") && !params["specializare"].empty())
            c.setSpecializare(params["specializare"]);
        if (params.count("medie_bac") && !params["medie_bac"].empty())
            c.setMedieBac(atof(params["medie_bac"].c_str()));
        if (params.count("nota1") && !params["nota1"].empty())
            c.setNota1(atof(params["nota1"].c_str()));
        if (params.count("nota2") && !params["nota2"].empty())
            c.setNota2(atof(params["nota2"].c_str()));

        // recalculam media de admitere
        c.computeMediaAdmitere();
    } else if (role == "operator") {
        // operatorul poate modifica DOAR notele
        if (params.count("medie_bac") && !params["medie_bac"].empty())
            c.setMedieBac(atof(params["medie_bac"].c_str()));
        if (params.count("nota1") && !params["nota1"].empty())
            c.setNota1(atof(params["nota1"].c_str()));
        if (params.count("nota2") && !params["nota2"].empty())
            c.setNota2(atof(params["nota2"].c_str()));

        // recalculam media de admitere
        c.computeMediaAdmitere();
    } else {
        cout << "{ \"status\": \"error\", \"message\": \"Rol necunoscut\" }\n";
        return 0;
    }

    // salvam modificarile
    if (!updateCandidateInFile(c)) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot actualiza fisierul\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"message\": \"Candidat actualizat cu succes\",\n";
    cout << "  \"candidate\": {\n";
    cout << "    \"cnp\": \"" << jsonEscape(c.getCnp()) << "\",\n";
    cout << "    \"nume\": \"" << jsonEscape(c.getNume()) << "\",\n";
    cout << "    \"prenume\": \"" << jsonEscape(c.getPrenume()) << "\",\n";
    cout << "    \"facultate\": \"" << jsonEscape(c.getFacultate()) << "\",\n";
    cout << "    \"domeniu\": \"" << jsonEscape(c.getDomeniu()) << "\",\n";
    cout << "    \"specializare\": \"" << jsonEscape(c.getSpecializare()) << "\",\n";
    cout << "    \"medieBac\": " << c.getMedieBac() << ",\n";
    cout << "    \"nota1\": " << c.getNota1() << ",\n";
    cout << "    \"nota2\": " << c.getNota2() << ",\n";
    cout << "    \"mediaAdmitere\": " << c.getMediaAdmitere() << "\n";
    cout << "  }\n";
    cout << "}\n";

    return 0;
}
