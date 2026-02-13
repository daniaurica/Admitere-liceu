#ifndef COMMON_H
#define COMMON_H

#include <iostream>
#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <fstream>
#include <algorithm>
#include <cstdlib>

using namespace std;

/*
    common.h

    Acest fișier conține:
    - funcții pentru citirea datelor trimise din formular (GET / POST)
    - clasa Candidate (reprezintă un candidat)
    - clasa User (reprezintă un utilizator cu rol)
    - funcții pentru a salva și a citi candidații/utilizatorii dintr-un fișier text
*/

// ===================== FUNCTII PENTRU CGI =====================

// Decodare text de forma "Ana+Maria" sau "Ana%20Maria"
inline string urlDecode(const string& src) {
    string out;
    out.reserve(src.size());
    for (size_t i = 0; i < src.size(); ++i) {
        if (src[i] == '+') {
            out.push_back(' ');
        } else if (src[i] == '%' && i + 2 < src.size()) {
            string hex = src.substr(i + 1, 2);
            char c = (char)strtol(hex.c_str(), NULL, 16);
            out.push_back(c);
            i += 2;
        } else {
            out.push_back(src[i]);
        }
    }
    return out;
}

// Transforma "nume=Ion&prenume=Popescu" intr-o mapare cheie->valoare
inline map<string, string> parseFormData(const string& data) {
    map<string, string> params;
    size_t start = 0;

    while (start < data.size()) {
        size_t eq = data.find('=', start);
        if (eq == string::npos) break;

        size_t amp = data.find('&', eq);

        string key = data.substr(start, eq - start);
        string value;
        if (amp == string::npos)
            value = data.substr(eq + 1);
        else
            value = data.substr(eq + 1, amp - eq - 1);

        params[urlDecode(key)] = urlDecode(value);

        if (amp == string::npos) break;
        start = amp + 1;
    }
    return params;
}

// Citeste parametrii din GET sau POST
inline map<string, string> readParams() {
    const char* method = getenv("REQUEST_METHOD");
    string m = method ? method : "GET";
    string data;

    if (m == "POST") {
        const char* lenStr = getenv("CONTENT_LENGTH");
        int len = lenStr ? atoi(lenStr) : 0;
        if (len > 0) {
            data.resize(len);
            cin.read(&data[0], len);
        }
    } else { // GET
        const char* qs = getenv("QUERY_STRING");
        if (qs) data = qs;
    }

    return parseFormData(data);
}

// ===================== CLASA CANDIDATE =====================

class Candidate {
private:
    string cnp;
    string nume;
    string prenume;
    string facultate;
    string domeniu;
    string specializare;
    double medieBac;
    double nota1;
    double nota2;
    double mediaAdmitere;
    string repartizat; // facultatile la care a fost repartizat (pipe-separated, ex: "Fac1 (buget)|Fac2 (taxa)")
    string confirmat;  // facultatea confirmata final de candidat (ex: "Fac1 (buget)")

public:
    Candidate() {
        medieBac = 0.0;
        nota1 = 0.0;
        nota2 = 0.0;
        mediaAdmitere = 0.0;
    }

    // setteri
    void setCnp(const string& v)          { cnp = v; }
    void setNume(const string& v)         { nume = v; }
    void setPrenume(const string& v)      { prenume = v; }
    void setFacultate(const string& v)    { facultate = v; }
    void setDomeniu(const string& v)      { domeniu = v; }
    void setSpecializare(const string& v) { specializare = v; }
    void setMedieBac(double v)            { medieBac = v; }
    void setNota1(double v)               { nota1 = v; }
    void setNota2(double v)               { nota2 = v; }
    void setRepartizat(const string& v)   { repartizat = v; }
    void setConfirmat(const string& v)    { confirmat = v; }

    // getteri
    const string& getCnp() const          { return cnp; }
    const string& getNume() const         { return nume; }
    const string& getPrenume() const      { return prenume; }
    const string& getFacultate() const    { return facultate; }
    const string& getDomeniu() const      { return domeniu; }
    const string& getSpecializare() const { return specializare; }
    double getMedieBac() const             { return medieBac; }
    double getNota1() const               { return nota1; }
    double getNota2() const               { return nota2; }
    double getMediaAdmitere() const       { return mediaAdmitere; }
    const string& getRepartizat() const   { return repartizat; }
    const string& getConfirmat() const    { return confirmat; }

    // calculeaza media de admitere
    void computeMediaAdmitere() {
        double medieProbe = (nota1 + nota2) / 2.0;
        mediaAdmitere = 0.8 * medieProbe + 0.2 * medieBac;
    }

    // transforma un candidat intr-o linie de fisier
    string toFileLine() const {
        ostringstream oss;
        oss << cnp << ';'
            << nume << ';'
            << prenume << ';'
            << facultate << ';'
            << domeniu << ';'
            << specializare << ';'
            << medieBac << ';'
            << nota1 << ';'
            << nota2 << ';'
            << mediaAdmitere << ';'
            << repartizat << ';'
            << confirmat;
        return oss.str();
    }

    // recreeaza un candidat dintr-o linie de fisier
    static bool fromFileLine(const string& line, Candidate& out) {
        if (line.empty()) return false;

        stringstream ss(line);
        string field;

        string cnp, nume, prenume, facultate, domeniu, specializare, repartizat, confirmat;
        double mg, n1, n2, ma;

        if (!getline(ss, cnp, ';')) return false;
        if (!getline(ss, nume, ';')) return false;
        if (!getline(ss, prenume, ';')) return false;
        if (!getline(ss, facultate, ';')) return false;
        if (!getline(ss, domeniu, ';')) return false;
        if (!getline(ss, specializare, ';')) return false;

        if (!getline(ss, field, ';')) return false; mg = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; n1 = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; n2 = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; ma = atof(field.c_str());

        // repartizat field is optional (backward compat)
        getline(ss, repartizat, ';');
        // confirmat field is optional (backward compat)
        getline(ss, confirmat, ';');

        Candidate c;
        c.cnp = cnp;
        c.nume = nume;
        c.prenume = prenume;
        c.facultate = facultate;
        c.domeniu = domeniu;
        c.specializare = specializare;
        c.medieBac = mg;
        c.nota1 = n1;
        c.nota2 = n2;
        c.mediaAdmitere = ma;
        c.repartizat = repartizat;
        c.confirmat = confirmat;

        out = c;
        return true;
    }
};

// Functie generica pentru a gasi path-ul corect catre un fisier din data/
// (compatibil cu Apache si Python http.server)
inline string getDataFilePath(const string& filename) {
    // Apache: ruleaza din cgi-bin/, deci ../data/filename
    // Python http.server: ruleaza din root, deci data/filename
    
    string apachePath = "../data/" + filename;
    ifstream test(apachePath.c_str());
    if (test.good()) {
        test.close();
        return apachePath;
    }
    
    return "data/" + filename;
}

inline string getCandidatesFilePath() {
    return getDataFilePath("candidates.txt");
}

inline string getUsersFilePath() {
    return getDataFilePath("users.txt");
}

// adauga un candidat la finalul fisierului
inline bool appendCandidateToFile(const Candidate& c) {
    string filePath = getCandidatesFilePath();
    ofstream f(filePath.c_str(), ios::app);
    if (!f) return false;
    f << c.toFileLine() << "\n";
    return true;
}

// incarca toti candidatii din fisier intr-un vector
inline bool loadAllCandidates(vector<Candidate>& out) {
    string filePath = getCandidatesFilePath();
    ifstream f(filePath.c_str());
    if (!f) return false;

    string line;
    while (getline(f, line)) {
        Candidate c;
        if (Candidate::fromFileLine(line, c)) {
            out.push_back(c);
        }
    }
    return true;
}

// cauta un candidat dupa CNP
inline bool findCandidateByCnp(const string& cnp, Candidate& out) {
    vector<Candidate> v;
    if (!loadAllCandidates(v)) return false;

    for (size_t i = 0; i < v.size(); ++i) {
        if (v[i].getCnp() == cnp) {
            out = v[i];
            return true;
        }
    }
    return false;
}

// verifica daca exista deja un candidat cu CNP-ul dat
inline bool cnpExists(const string& cnp) {
    Candidate temp;
    return findCandidateByCnp(cnp, temp);
}

// functie de comparatie pentru sortare descrescatoare dupa media de admitere
inline bool compareByMediaDesc(const Candidate& a, const Candidate& b) {
    return a.getMediaAdmitere() > b.getMediaAdmitere();
}

// sorteaza vectorul de candidati in functie de media de admitere
inline void sortByMediaAdmitereDesc(vector<Candidate>& v) {
    sort(v.begin(), v.end(), compareByMediaDesc);
}

// actualizeaza un candidat existent in fisier (dupa CNP)
inline bool updateCandidateInFile(const Candidate& updated) {
    string filePath = getCandidatesFilePath();
    vector<Candidate> all;
    if (!loadAllCandidates(all)) return false;

    bool found = false;
    for (size_t i = 0; i < all.size(); ++i) {
        if (all[i].getCnp() == updated.getCnp()) {
            all[i] = updated;
            found = true;
            break;
        }
    }
    if (!found) return false;

    // rescriem intregul fisier
    ofstream f(filePath.c_str(), ios::trunc);
    if (!f) return false;
    for (size_t i = 0; i < all.size(); ++i) {
        f << all[i].toFileLine() << "\n";
    }
    return true;
}

// ===================== CLASA USER =====================

class User {
private:
    int id;
    string email;
    string password;   // parola in clar (doar pentru scop didactic!)
    string role;       // "candidat", "operator", "admin"
    string cnp;        // CNP-ul candidatului asociat (gol pentru operator/admin)

public:
    User() : id(0) {}

    // setteri
    void setId(int v)                 { id = v; }
    void setEmail(const string& v)    { email = v; }
    void setPassword(const string& v) { password = v; }
    void setRole(const string& v)     { role = v; }
    void setCnp(const string& v)      { cnp = v; }

    // getteri
    int getId() const                 { return id; }
    const string& getEmail() const    { return email; }
    const string& getPassword() const { return password; }
    const string& getRole() const     { return role; }
    const string& getCnp() const      { return cnp; }

    // transforma un user intr-o linie de fisier
    string toFileLine() const {
        ostringstream oss;
        oss << id << ';' << email << ';' << password << ';' << role << ';' << cnp;
        return oss.str();
    }

    // recreeaza un user dintr-o linie de fisier
    static bool fromFileLine(const string& line, User& out) {
        if (line.empty()) return false;

        stringstream ss(line);
        string field;

        if (!getline(ss, field, ';')) return false; out.id = atoi(field.c_str());
        if (!getline(ss, out.email, ';')) return false;
        if (!getline(ss, out.password, ';')) return false;
        if (!getline(ss, out.role, ';')) return false;
        if (!getline(ss, out.cnp)) out.cnp = ""; // cnp poate fi gol

        return true;
    }
};

// incarca toti utilizatorii din fisier
inline bool loadAllUsers(vector<User>& out) {
    string filePath = getUsersFilePath();
    ifstream f(filePath.c_str());
    if (!f) return false;

    string line;
    while (getline(f, line)) {
        User u;
        if (User::fromFileLine(line, u)) {
            out.push_back(u);
        }
    }
    return true;
}

// genereaza urmatorul ID disponibil
inline int getNextUserId() {
    vector<User> users;
    loadAllUsers(users);
    int maxId = 0;
    for (size_t i = 0; i < users.size(); ++i) {
        if (users[i].getId() > maxId) maxId = users[i].getId();
    }
    return maxId + 1;
}

// verifica daca exista deja un user cu acest email
inline bool emailExists(const string& email) {
    vector<User> users;
    if (!loadAllUsers(users)) return false;
    for (size_t i = 0; i < users.size(); ++i) {
        if (users[i].getEmail() == email) return true;
    }
    return false;
}

// adauga un user la finalul fisierului
inline bool appendUserToFile(const User& u) {
    string filePath = getUsersFilePath();
    ofstream f(filePath.c_str(), ios::app);
    if (!f) return false;
    f << u.toFileLine() << "\n";
    return true;
}

// asigura ca exista contul admin implicit
inline void ensureAdminExists() {
    if (!emailExists("admin@admin.com")) {
        User admin;
        admin.setId(getNextUserId());
        admin.setEmail("admin@admin.com");
        admin.setPassword("admin");
        admin.setRole("admin");
        admin.setCnp("");
        appendUserToFile(admin);
    }
}

// cauta un user dupa email
inline bool findUserByEmail(const string& email, User& out) {
    vector<User> users;
    if (!loadAllUsers(users)) return false;
    for (size_t i = 0; i < users.size(); ++i) {
        if (users[i].getEmail() == email) {
            out = users[i];
            return true;
        }
    }
    return false;
}

// cauta un user dupa id
inline bool findUserById(int id, User& out) {
    vector<User> users;
    if (!loadAllUsers(users)) return false;
    for (size_t i = 0; i < users.size(); ++i) {
        if (users[i].getId() == id) {
            out = users[i];
            return true;
        }
    }
    return false;
}

// sterge un user dupa id (rescrie fisierul fara acel user)
inline bool deleteUserById(int id) {
    vector<User> users;
    if (!loadAllUsers(users)) return false;

    bool found = false;
    vector<User> remaining;
    for (size_t i = 0; i < users.size(); ++i) {
        if (users[i].getId() == id) {
            found = true;
        } else {
            remaining.push_back(users[i]);
        }
    }
    if (!found) return false;

    string filePath = getUsersFilePath();
    ofstream f(filePath.c_str(), ios::trunc);
    if (!f) return false;
    for (size_t i = 0; i < remaining.size(); ++i) {
        f << remaining[i].toFileLine() << "\n";
    }
    return true;
}

// helper: escapeaza ghilimele in string-uri JSON
inline string jsonEscape(const string& s) {
    string out;
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '"') out += "\\\"";
        else if (s[i] == '\\') out += "\\\\";
        else out += s[i];
    }
    return out;
}

// ===================== FACULTATI SUCEAVA =====================

// Structura pentru o facultate din Suceava
// Format fisier: NumeFacultate;Domeniu;Specializare1;Specializare2;...
struct FacultateInfo {
    string nume;
    string domeniu;
    vector<string> specializari;
};

inline string getFacultatiFilePath() {
    return getDataFilePath("facultati_suceava.txt");
}

// incarca toate facultatile din fisier
inline bool loadFacultati(vector<FacultateInfo>& out) {
    string filePath = getFacultatiFilePath();
    ifstream f(filePath.c_str());
    if (!f) return false;

    string line;
    while (getline(f, line)) {
        if (line.empty()) continue;
        
        FacultateInfo fi;
        stringstream ss(line);
        string field;
        
        if (!getline(ss, fi.nume, ';')) continue;
        if (!getline(ss, fi.domeniu, ';')) continue;
        
        while (getline(ss, field, ';')) {
            if (!field.empty()) {
                fi.specializari.push_back(field);
            }
        }
        
        out.push_back(fi);
    }
    return true;
}

// ===================== LOCURI BUGET / TAXA =====================

struct LocuriFacultate {
    string numeFacultate;
    int locuribuget;
    int locuriTaxa;
};

inline string getLocuriFilePath() {
    return getDataFilePath("locuri_facultati.txt");
}

// Format: NumeFacultate;locuribuget;locuriTaxa
inline bool loadLocuri(vector<LocuriFacultate>& out) {
    string filePath = getLocuriFilePath();
    ifstream f(filePath.c_str());
    if (!f) return false;

    string line;
    while (getline(f, line)) {
        if (line.empty()) continue;

        stringstream ss(line);
        string field;
        LocuriFacultate lf;

        if (!getline(ss, lf.numeFacultate, ';')) continue;
        if (!getline(ss, field, ';')) continue;
        lf.locuribuget = atoi(field.c_str());
        if (!getline(ss, field, ';')) continue;
        lf.locuriTaxa = atoi(field.c_str());

        out.push_back(lf);
    }
    return true;
}

inline bool saveLocuri(const vector<LocuriFacultate>& locuri) {
    string filePath = getLocuriFilePath();
    ofstream f(filePath.c_str());
    if (!f) return false;

    for (size_t i = 0; i < locuri.size(); ++i) {
        f << locuri[i].numeFacultate << ';'
          << locuri[i].locuribuget << ';'
          << locuri[i].locuriTaxa << '\n';
    }
    return true;
}

#endif // COMMON_H

