#include "common.h"

/*
    get_users.cgi

    Returneaza lista utilizatorilor filtrata dupa rol.
    Parametri GET: role (optional, filtreaza dupa rol), caller_role (obligatoriu)
    
    Doar adminul poate accesa acest endpoint.
*/

int main() {
    ensureAdminExists();

    string queryString = getenv("QUERY_STRING") ? getenv("QUERY_STRING") : "";
    map<string, string> params;

    // parse query string manual
    stringstream ss(queryString);
    string pair;
    while (getline(ss, pair, '&')) {
        size_t eq = pair.find('=');
        if (eq != string::npos) {
            params[pair.substr(0, eq)] = pair.substr(eq + 1);
        }
    }

    string callerRole = params["caller_role"];
    string filterRole = params["role"];

    cout << "Content-type: application/json\r\n\r\n";

    if (callerRole != "admin") {
        cout << "{ \"status\": \"error\", \"message\": \"Acces interzis. Doar administratorul poate vedea utilizatorii.\" }\n";
        return 0;
    }

    vector<User> allUsers;
    loadAllUsers(allUsers);

    cout << "{\n";
    cout << "  \"status\": \"ok\",\n";
    cout << "  \"users\": [\n";

    bool first = true;
    for (size_t i = 0; i < allUsers.size(); ++i) {
        // Filtrare dupa rol daca este specificat
        if (!filterRole.empty() && allUsers[i].getRole() != filterRole) continue;

        if (!first) cout << ",\n";
        first = false;

        cout << "    {\n";
        cout << "      \"id\": " << allUsers[i].getId() << ",\n";
        cout << "      \"email\": \"" << jsonEscape(allUsers[i].getEmail()) << "\",\n";
        cout << "      \"role\": \"" << jsonEscape(allUsers[i].getRole()) << "\"\n";
        cout << "    }";
    }

    cout << "\n  ]\n";
    cout << "}\n";

    return 0;
}
