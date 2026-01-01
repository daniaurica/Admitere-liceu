#include "common.h"

int main() {
    // citim parametrii trimisi prin formular
    map<string, string> params = readParams();

    // construim un candidat din datele primite
    Candidate c;
    c.setNume(params["nume"]);
    c.setPrenume(params["prenume"]);
    c.setCnp(params["cnp"]);
    c.setLiceu(params["liceu"]);
    c.setFiliera(params["filiera"]);
    c.setSpecializare(params["specializare"]);
    c.setMedieGenerala(atof(params["medie_generala"].c_str()));
    c.setNota1(atof(params["nota1"].c_str()));
    c.setNota2(atof(params["nota2"].c_str()));

    // calculam media de admitere
    c.computeMediaAdmitere();
    
    // raspuns HTTP in format JSON
    cout << "Content-type: application/json\r\n\r\n";
    
    // verificam daca CNP-ul exista deja
    if (cnpExists(params["cnp"])) {
        cout << "{ \"status\": \"error\", \"message\": \"CNP deja existent\" }\n";
        return 0;
    }

    // salvam candidatul in fisier
    bool ok = appendCandidateToFile(c);

    if (!ok) {
        cout << "{ \"status\": \"error\", \"message\": \"nu pot scrie in fisier\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"mediaAdmitere\": " << c.getMediaAdmitere() << "\n";
    cout << "}\n";

    return 0;
}
