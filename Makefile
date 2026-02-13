CXX = g++
CXXFLAGS =

all: cgi-bin/candidate_register.cgi \
     cgi-bin/candidates_ranking.cgi \
     cgi-bin/candidate_sheet.cgi \
     cgi-bin/login.cgi \
     cgi-bin/register_user.cgi \
     cgi-bin/update_candidate.cgi \
     cgi-bin/get_facultati.cgi \
     cgi-bin/get_users.cgi \
     cgi-bin/save_locuri.cgi \
     cgi-bin/get_locuri.cgi \
     cgi-bin/repartizare.cgi \
     cgi-bin/confirm_faculty.cgi \
     cgi-bin/delete_user.cgi

cgi-bin/candidate_register.cgi: src/candidate_register.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidate_register.cpp -o cgi-bin/candidate_register.cgi

cgi-bin/candidates_ranking.cgi: src/candidates_ranking.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidates_ranking.cpp -o cgi-bin/candidates_ranking.cgi

cgi-bin/candidate_sheet.cgi: src/candidate_sheet.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidate_sheet.cpp -o cgi-bin/candidate_sheet.cgi

cgi-bin/login.cgi: src/login.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/login.cpp -o cgi-bin/login.cgi

cgi-bin/register_user.cgi: src/register_user.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/register_user.cpp -o cgi-bin/register_user.cgi

cgi-bin/update_candidate.cgi: src/update_candidate.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/update_candidate.cpp -o cgi-bin/update_candidate.cgi

cgi-bin/get_facultati.cgi: src/get_facultati.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/get_facultati.cpp -o cgi-bin/get_facultati.cgi

cgi-bin/get_users.cgi: src/get_users.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/get_users.cpp -o cgi-bin/get_users.cgi

cgi-bin/save_locuri.cgi: src/save_locuri.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/save_locuri.cpp -o cgi-bin/save_locuri.cgi

cgi-bin/get_locuri.cgi: src/get_locuri.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/get_locuri.cpp -o cgi-bin/get_locuri.cgi

cgi-bin/repartizare.cgi: src/repartizare.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/repartizare.cpp -o cgi-bin/repartizare.cgi

cgi-bin/confirm_faculty.cgi: src/confirm_faculty.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/confirm_faculty.cpp -o cgi-bin/confirm_faculty.cgi

cgi-bin/delete_user.cgi: src/delete_user.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/delete_user.cpp -o cgi-bin/delete_user.cgi

clean:
	rm -f cgi-bin/*.cgi
