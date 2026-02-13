#include "common.h"

/*
    login.cgi

    Primeste email si password prin POST.
    Verifica datele in users.txt.
    Returneaza JSON cu id, email, role si cnp (pentru localStorage).
*/

int main() {
    // Asigura existenta contului admin implicit
    ensureAdminExists();

    map<string, string> params = readParams();

    string email = params["email"];
    string password = params["password"];

    cout << "Content-type: application/json\r\n\r\n";

    if (email.empty() || password.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"Email si parola sunt obligatorii\" }\n";
        return 0;
    }

    User user;
    bool found = findUserByEmail(email, user);

    if (!found) {
        cout << "{ \"status\": \"error\", \"message\": \"Email sau parola incorecta\" }\n";
        return 0;
    }

    if (user.getPassword() != password) {
        cout << "{ \"status\": \"error\", \"message\": \"Email sau parola incorecta\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"user\": {\n";
    cout << "    \"id\": " << user.getId() << ",\n";
    cout << "    \"email\": \"" << jsonEscape(user.getEmail()) << "\",\n";
    cout << "    \"role\": \"" << jsonEscape(user.getRole()) << "\",\n";
    cout << "    \"cnp\": \"" << jsonEscape(user.getCnp()) << "\"\n";
    cout << "  }\n";
    cout << "}\n";

    return 0;
}
