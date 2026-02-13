#include "common.h"

/*
    register_user.cgi

    Creaza un cont nou de utilizator.
    Parametri POST: email, password, role, cnp (optional, doar pt candidati)
    Optional: caller_role - rolul celui care face cererea
    
    Reguli:
    - Din pagina de login, doar candidatii se pot inregistra
    - Operatorii pot fi creati doar de admin (caller_role=admin)
    - Contul de admin este pre-creat si nu poate fi creat prin acest endpoint
    - Candidatii trebuie sa aiba un CNP unic
    - Email-ul trebuie sa fie unic
*/

int main() {
    // Asigura existenta contului admin implicit
    ensureAdminExists();

    map<string, string> params = readParams();

    string email = params["email"];
    string password = params["password"];
    string role = params["role"];
    string cnp = params["cnp"];
    string callerRole = params["caller_role"];

    cout << "Content-type: application/json\r\n\r\n";

    // validari de baza
    if (email.empty() || password.empty() || role.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Email, parola si rolul sunt obligatorii\" }\n";
        return 0;
    }

    // Nu se pot crea conturi de admin
    if (role == "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Nu se pot crea conturi de administrator\" }\n";
        return 0;
    }

    // validam rolul
    if (role != "candidat" && role != "operator") {
        cout << "{ \"status\": \"error\", \"message\": \"Rol invalid. Valori acceptate: candidat, operator\" }\n";
        return 0;
    }

    // Operatorii pot fi creati doar de admin
    if (role == "operator" && callerRole != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Doar administratorul poate crea conturi de operator\" }\n";
        return 0;
    }

    // candidatii trebuie sa aiba CNP
    if (role == "candidat" && cnp.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"CNP-ul este obligatoriu pentru candidati\" }\n";
        return 0;
    }

    // validam CNP (13 cifre)
    if (role == "candidat") {
        if (cnp.size() != 13) {
            cout << "{ \"status\": \"error\", \"message\": \"CNP-ul trebuie sa aiba 13 cifre\" }\n";
            return 0;
        }
        for (size_t i = 0; i < cnp.size(); ++i) {
            if (cnp[i] < '0' || cnp[i] > '9') {
                cout << "{ \"status\": \"error\", \"message\": \"CNP-ul trebuie sa contina doar cifre\" }\n";
                return 0;
            }
        }
    }

    // verificam unicitatea email-ului
    if (emailExists(email)) {
        cout << "{ \"status\": \"error\", \"message\": \"Exista deja un cont cu acest email\" }\n";
        return 0;
    }

    // pentru candidati: verificam daca exista deja un user cu acest CNP
    if (role == "candidat") {
        vector<User> allUsers;
        loadAllUsers(allUsers);
        for (size_t i = 0; i < allUsers.size(); ++i) {
            if (allUsers[i].getCnp() == cnp) {
                cout << "{ \"status\": \"error\", \"message\": \"Exista deja un cont asociat cu acest CNP\" }\n";
                return 0;
            }
        }
    }

    // cream userul
    User u;
    u.setId(getNextUserId());
    u.setEmail(email);
    u.setPassword(password);
    u.setRole(role);
    u.setCnp(role == "candidat" ? cnp : "");

    bool ok = appendUserToFile(u);

    if (!ok) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot scrie in fisier\" }\n";
        return 0;
    }

    // Daca e candidat, cream si o intrare in candidates.txt cu datele goale
    // (va fi completata mai tarziu de candidat/operator)
    if (role == "candidat") {
        // Verificam daca exista deja un candidat cu acest CNP
        if (!cnpExists(cnp)) {
            Candidate c;
            c.setCnp(cnp);
            c.setNume("");
            c.setPrenume("");
            c.setFacultate("");
            c.setDomeniu("");
            c.setSpecializare("");
            c.setMedieBac(0);
            c.setNota1(0);
            c.setNota2(0);
            c.computeMediaAdmitere();
            appendCandidateToFile(c);
        }
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"user\": {\n";
    cout << "    \"id\": " << u.getId() << ",\n";
    cout << "    \"email\": \"" << jsonEscape(u.getEmail()) << "\",\n";
    cout << "    \"role\": \"" << jsonEscape(u.getRole()) << "\",\n";
    cout << "    \"cnp\": \"" << jsonEscape(u.getCnp()) << "\"\n";
    cout << "  }\n";
    cout << "}\n";

    return 0;
}
