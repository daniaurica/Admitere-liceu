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
    - funcții pentru a salva și a citi candidații dintr-un fișier text
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
    string liceu;
    string filiera;
    string specializare;
    double medieGenerala;
    double nota1;
    double nota2;
    double mediaAdmitere;

public:
    Candidate() {
        medieGenerala = 0.0;
        nota1 = 0.0;
        nota2 = 0.0;
        mediaAdmitere = 0.0;
    }

    // setteri
    void setCnp(const string& v)          { cnp = v; }
    void setNume(const string& v)         { nume = v; }
    void setPrenume(const string& v)      { prenume = v; }
    void setLiceu(const string& v)        { liceu = v; }
    void setFiliera(const string& v)      { filiera = v; }
    void setSpecializare(const string& v) { specializare = v; }
    void setMedieGenerala(double v)       { medieGenerala = v; }
    void setNota1(double v)               { nota1 = v; }
    void setNota2(double v)               { nota2 = v; }

    // getteri
    const string& getCnp() const          { return cnp; }
    const string& getNume() const         { return nume; }
    const string& getPrenume() const      { return prenume; }
    const string& getLiceu() const        { return liceu; }
    const string& getFiliera() const      { return filiera; }
    const string& getSpecializare() const { return specializare; }
    double getMedieGenerala() const       { return medieGenerala; }
    double getNota1() const               { return nota1; }
    double getNota2() const               { return nota2; }
    double getMediaAdmitere() const       { return mediaAdmitere; }

    // calculeaza media de admitere
    void computeMediaAdmitere() {
        double medieProbe = (nota1 + nota2) / 2.0;
        mediaAdmitere = 0.8 * medieProbe + 0.2 * medieGenerala;
    }

    // transforma un candidat intr-o linie de fisier
    string toFileLine() const {
        ostringstream oss;
        oss << cnp << ';'
            << nume << ';'
            << prenume << ';'
            << liceu << ';'
            << filiera << ';'
            << specializare << ';'
            << medieGenerala << ';'
            << nota1 << ';'
            << nota2 << ';'
            << mediaAdmitere;
        return oss.str();
    }

    // recreeaza un candidat dintr-o linie de fisier
    static bool fromFileLine(const string& line, Candidate& out) {
        if (line.empty()) return false;

        stringstream ss(line);
        string field;

        string cnp, nume, prenume, liceu, filiera, specializare;
        double mg, n1, n2, ma;

        if (!getline(ss, cnp, ';')) return false;
        if (!getline(ss, nume, ';')) return false;
        if (!getline(ss, prenume, ';')) return false;
        if (!getline(ss, liceu, ';')) return false;
        if (!getline(ss, filiera, ';')) return false;
        if (!getline(ss, specializare, ';')) return false;

        if (!getline(ss, field, ';')) return false; mg = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; n1 = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; n2 = atof(field.c_str());
        if (!getline(ss, field, ';')) return false; ma = atof(field.c_str());

        Candidate c;
        c.cnp = cnp;
        c.nume = nume;
        c.prenume = prenume;
        c.liceu = liceu;
        c.filiera = filiera;
        c.specializare = specializare;
        c.medieGenerala = mg;
        c.nota1 = n1;
        c.nota2 = n2;
        c.mediaAdmitere = ma;

        out = c;
        return true;
    }
};

// ===================== FISIERUL CU CANDIDATI =====================

// CGI-urile sunt in folderul cgi-bin, iar fisierul cu candidati este in ../data
const string CANDIDATES_FILE = "../data/candidates.txt";

// adauga un candidat la finalul fisierului
inline bool appendCandidateToFile(const Candidate& c) {
    ofstream f(CANDIDATES_FILE.c_str(), ios::app);
    if (!f) return false;
    f << c.toFileLine() << "\n";
    return true;
}

// incarca toti candidatii din fisier intr-un vector
inline bool loadAllCandidates(vector<Candidate>& out) {
    ifstream f(CANDIDATES_FILE.c_str());
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

// functie de comparatie pentru sortare descrescatoare dupa media de admitere
inline bool compareByMediaDesc(const Candidate& a, const Candidate& b) {
    return a.getMediaAdmitere() > b.getMediaAdmitere();
}

// sorteaza vectorul de candidati in functie de media de admitere
inline void sortByMediaAdmitereDesc(vector<Candidate>& v) {
    sort(v.begin(), v.end(), compareByMediaDesc);
}

#endif // COMMON_H

