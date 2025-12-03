CXX = g++
CXXFLAGS =

all: cgi-bin/candidate_register.cgi \
     cgi-bin/candidates_ranking.cgi \
     cgi-bin/candidate_sheet.cgi

cgi-bin/candidate_register.cgi: src/candidate_register.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidate_register.cpp -o cgi-bin/candidate_register.cgi

cgi-bin/candidates_ranking.cgi: src/candidates_ranking.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidates_ranking.cpp -o cgi-bin/candidates_ranking.cgi

cgi-bin/candidate_sheet.cgi: src/candidate_sheet.cpp src/common.h
	$(CXX) $(CXXFLAGS) src/candidate_sheet.cpp -o cgi-bin/candidate_sheet.cgi

clean:
	rm -f cgi-bin/*.cgi
