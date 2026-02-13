#include "common.h"

/*
    delete_user.cgi

    Sterge un utilizator (operator) din sistem.
    POST request, doar admin.
    
    Parametri:
    - user_id: ID-ul userului de sters
    - caller_role: rolul celui care face cererea (trebuie sa fie admin)
    
    Nu permite stergerea adminului.
*/

int main() {
    map<string, string> params = readParams();
    string callerRole = params["caller_role"];
    string userIdStr = params["user_id"];

    cout << "Content-type: application/json\r\n\r\n";

    if (callerRole != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Doar adminul poate sterge utilizatori\" }\n";
        return 0;
    }

    if (userIdStr.empty()) {
        cout << "{ \"status\": \"error\", \"message\": \"ID-ul utilizatorului este obligatoriu\" }\n";
        return 0;
    }

    int userId = atoi(userIdStr.c_str());

    // Gasim userul pentru verificari
    User u;
    if (!findUserById(userId, u)) {
        cout << "{ \"status\": \"error\", \"message\": \"Utilizatorul nu a fost gasit\" }\n";
        return 0;
    }

    // Nu permite stergerea adminului
    if (u.getRole() == "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Nu puteti sterge contul de administrator\" }\n";
        return 0;
    }

    // Stergem userul
    if (!deleteUserById(userId)) {
        cout << "{ \"status\": \"error\", \"message\": \"Nu pot sterge utilizatorul din fisier\" }\n";
        return 0;
    }

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"message\": \"Utilizatorul a fost sters cu succes\"\n";
    cout << "}\n";

    return 0;
}
