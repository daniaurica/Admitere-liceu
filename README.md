# Admitere Liceu - High School Admission System

A web-based admission management system built with C++ CGI backend and vanilla HTML/CSS/JavaScript frontend.

## Features

- **Statistics Dashboard** - Overview of all candidates with visual analytics
- **Candidate Registration** - Register new candidates with automatic admission score calculation
- **Rankings** - View all candidates sorted by admission score
- **Search** - Find candidate information by CNP

## Technology Stack

**Backend:**
- C++ CGI scripts
- Plain text file storage (`data/candidates.txt`)

**Frontend:**
- HTML5
- CSS3
- JavaScript (ES6+)

## Project Structure

```
Admitere-liceu/
├── cgi-bin/              # Compiled CGI executables
├── data/                 # Data storage
│   └── candidates.txt    # Candidate database (semicolon-separated)
├── src/                  # C++ source code
│   ├── common.h          # Shared utilities and Candidate class
│   ├── candidate_register.cpp
│   ├── candidates_ranking.cpp
│   └── candidate_sheet.cpp
├── public/               # Web UI
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── Makefile
```

## Prerequisites

- C++ compiler (g++)
- Web server with CGI support (Apache, nginx with fcgiwrap, or Python's http.server)
- Modern web browser

## Setup Instructions

### 1. Compile CGI Scripts

```bash
cd /path/to/Admitere-liceu
make
```

This will compile all CGI scripts and place them in the `cgi-bin/` directory.

### 2. Create Data Directory

```bash
mkdir -p data
touch data/candidates.txt
```

### 3. Set Up Web Server

#### Option A: Apache (Recommended for Production)

1. **Install Apache:**
   ```bash
   sudo apt-get install apache2
   ```

2. **Enable CGI module:**
   ```bash
   sudo a2enmod cgi
   sudo systemctl restart apache2
   ```

3. **Configure Apache virtual host:**
   
   Create `/etc/apache2/sites-available/admitere-liceu.conf`:
   ```apache
   <VirtualHost *:8080>
       DocumentRoot /path/to/Admitere-liceu/public
       
       <Directory /path/to/Admitere-liceu/public>
           Options Indexes FollowSymLinks
           AllowOverride None
           Require all granted
       </Directory>
       
       ScriptAlias /cgi-bin/ /path/to/Admitere-liceu/cgi-bin/
       <Directory /path/to/Admitere-liceu/cgi-bin>
           Options +ExecCGI
           AddHandler cgi-script .cgi
           Require all granted
       </Directory>
   </VirtualHost>
   ```

4. **Enable site and restart:**
   ```bash
   sudo a2ensite admitere-liceu
   sudo systemctl restart apache2
   ```

#### Option B: Python HTTP Server (Quick Testing)

For quick local testing (not for production):

```bash
cd /path/to/Admitere-liceu
python3 -m http.server --cgi 8000
```

**Note:** Ensure `cgi-bin/` scripts have execute permissions: `chmod +x cgi-bin/*.cgi`

### 4. Access the Application

Open your browser and navigate to:
- **Apache:** `http://localhost:8080`
- **Python server:** `http://localhost:8000/public/`

## API Endpoints

### POST /cgi-bin/candidate_register.cgi
Register a new candidate.

**Parameters:**
- `nume`, `prenume`, `cnp`, `liceu`, `filiera`, `specializare`
- `medie_generala`, `nota1`, `nota2` (numeric, 1-10)

**Response:** JSON with status and calculated `mediaAdmitere`

### GET /cgi-bin/candidates_ranking.cgi
Get all candidates sorted by admission score.

**Response:** JSON array of candidates

### GET /cgi-bin/candidate_sheet.cgi?cnp=XXXXXXXXXXXXX
Get candidate information by CNP.

**Response:** Plain text formatted candidate data

## Usage

1. **View Dashboard:** Open the app - dashboard is the default tab
2. **Register Candidate:** Go to "Înregistrare" tab, fill the form, submit
3. **View Rankings:** Go to "Clasament" tab, click "Actualizează Clasament"
4. **Search:** Go to "Căutare Candidat" tab, enter CNP, click search

## Development

### Rebuild CGI Scripts

After modifying C++ source files:
```bash
make clean
make
```

### Clean Build

```bash
make clean
```

### Modify UI

Edit files in `public/` directory:
- `index.html` - Structure
- `styles.css` - Styling
- `app.js` - Functionality

No rebuild needed, just refresh browser.

## Troubleshooting

**CGI scripts return 500 error:**
- Check file permissions: `chmod +x cgi-bin/*.cgi`
- Check Apache error log: `sudo tail -f /var/log/apache2/error.log`
- Verify CGI module is enabled: `apache2ctl -M | grep cgi`

**Cannot write to data file:**
- Check directory permissions: `chmod 755 data/`
- Check file permissions: `chmod 666 data/candidates.txt`

**UI not loading:**
- Verify web server DocumentRoot points to `public/` directory
- Check browser console for errors
