// ===== Configuration =====
const API_BASE = '/cgi-bin';

async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!response.ok) {
        let detail = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (contentType.includes('application/json') && text) {
            try {
                const parsed = JSON.parse(text);
                detail = parsed.message || detail;
            } catch (e) {
                // Keep the plain response preview below.
            }
        }
        throw new Error(`Server error ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    if (!contentType.includes('application/json')) {
        const preview = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
        throw new Error(`Raspuns invalid de la server${preview ? `: ${preview}` : ''}`);
    }

    return JSON.parse(text);
}

// ===== Global Faculty Data (loaded from server) =====
let facultatiSuceava = [];

// ===== Auth / Session Management (localStorage) =====

function getCurrentUser() {
    const data = localStorage.getItem('admitere_user');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem('admitere_user', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('admitere_user');
}

// ===== Role-based Tab Configuration =====
// Defines which tabs each role can see
const ROLE_TABS = {
    candidat: [
        { id: 'mydata', label: '👤 Datele Mele' },
        { id: 'facultati', label: '🏛️ Facultăți Suceava' }
    ],
    operator: [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'editcandidate', label: '✏️ Editare Candidat' },
        { id: 'locuri', label: '🎟️ Locuri Buget/Taxă' },
        { id: 'facultati', label: '🏛️ Facultăți' },
        { id: 'ranking', label: '🏆 Clasament' },
        { id: 'search', label: '🔍 Căutare' }
    ],
    admin: [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'register', label: '➕ Înregistrare Candidat' },
        { id: 'operators', label: '👥 Operatori' },
        { id: 'editcandidate', label: '✏️ Editare Candidat' },
        { id: 'locuri', label: '🎟️ Locuri Buget/Taxă' },
        { id: 'repartizare', label: '🏆 Repartizare' },
        { id: 'facultati', label: '🏛️ Facultăți' },
        { id: 'ranking', label: '📊 Clasament' },
        { id: 'search', label: '🔍 Căutare' }
    ]
};

const ROLE_LABELS = {
    candidat: 'Candidat',
    operator: 'Operator',
    admin: 'Administrator'
};

// ===== Application Entry Point =====
document.addEventListener('DOMContentLoaded', function () {
    initAuthForms();

    const user = getCurrentUser();
    if (user) {
        showApp(user);
    } else {
        showAuth();
    }
});

// ===== Auth UI =====
function showAuth() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp(user) {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    // Display user info in header
    const userDisplay = document.getElementById('userDisplay');
    userDisplay.innerHTML = `${user.email} <span class="role-tag role-${user.role}">${ROLE_LABELS[user.role]}</span>`;

    // Load faculties first, then build UI
    loadFacultatiData().then(() => {
        // Build tabs for this role
        buildTabs(user.role);

        // Setup logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            clearCurrentUser();
            location.reload();
        });

        // Init all sections
        initDashboard();
        initRegisterForm();
        initRankingSection();
        initSearchSection();
        initMyDataSection();
        initEditCandidateSection(user.role);
        initFacultatiSection();
        initOperatorsSection();
        initLocuriSection();
        initRepartizareSection();
    });
}

function buildTabs(role) {
    const navTabs = document.getElementById('navTabs');
    const tabs = ROLE_TABS[role] || [];

    navTabs.innerHTML = '';
    tabs.forEach((tab, index) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (index === 0 ? ' active' : '');
        btn.setAttribute('data-tab', tab.id);
        btn.textContent = tab.label;
        navTabs.appendChild(btn);
    });

    // Show first tab
    if (tabs.length > 0) {
        document.getElementById(tabs[0].id).classList.add('active');
    }

    // Setup tab click events
    const tabBtns = navTabs.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Activate target
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Auto-load data
            if (targetTab === 'dashboard') loadStatistics();
            else if (targetTab === 'ranking') loadRankings();
            else if (targetTab === 'mydata') loadMyData();
            else if (targetTab === 'facultati') displayFacultatiList();
            else if (targetTab === 'operators') loadOperatorsList();
            else if (targetTab === 'locuri') loadLocuri();
        });
    });

    // Auto-load the first tab's data
    if (tabs.length > 0) {
        const first = tabs[0].id;
        if (first === 'dashboard') loadStatistics();
        else if (first === 'ranking') loadRankings();
        else if (first === 'mydata') loadMyData();
        else if (first === 'facultati') displayFacultatiList();
        else if (first === 'operators') loadOperatorsList();
        else if (first === 'locuri') loadLocuri();
    }
}

// ===== Auth Forms =====
function initAuthForms() {
    // Toggle between login and register
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerUserSection').style.display = 'block';
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerUserSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
    });

    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('loginAlert');

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_BASE}/login.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            });

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                setCurrentUser(data.user);
                showApp(data.user);
            } else {
                showAlert(alert, data.message, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare de conexiune: ${error.message}`, 'error');
        }
    });

    // Register form submission (only for candidat)
    document.getElementById('registerUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('registerUserAlert');

        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const cnp = document.getElementById('regCnp').value.trim();

        if (!/^[0-9]{13}$/.test(cnp)) {
            showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
            return;
        }

        const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=candidat&cnp=${encodeURIComponent(cnp)}`;

        try {
            const response = await fetch(`${API_BASE}/register_user.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                // Auto-login after successful registration
                setCurrentUser(data.user);
                showApp(data.user);
            } else {
                showAlert(alert, data.message, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare de conexiune: ${error.message}`, 'error');
        }
    });
}

// ===== My Data Section (Candidat) =====
const MAX_FACULTY_OPTIONS = 15;

function initMyDataSection() {
    const form = document.getElementById('mydataForm');
    if (!form) return;

    // Setup the "Add option" button
    const addBtn = document.getElementById('addFacultyOptionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            addFacultyOptionRow();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('mydataAlert');
        const user = getCurrentUser();
        if (!user || !user.cnp) return;

        const nume = document.getElementById('myNume').value.trim();
        const prenume = document.getElementById('myPrenume').value.trim();

        // Collect all faculty options
        const options = collectFacultyOptions();

        // Join with pipe separator
        const facultateStr = options.map(o => o.facultate).join('|');
        const domeniuStr = options.map(o => o.domeniu).join('|');
        const specializareStr = options.map(o => o.specializare).join('|');

        let body = `cnp=${encodeURIComponent(user.cnp)}&role=candidat&nume=${encodeURIComponent(nume)}&prenume=${encodeURIComponent(prenume)}`;
        body += `&facultate=${encodeURIComponent(facultateStr)}`;
        body += `&domeniu=${encodeURIComponent(domeniuStr)}`;
        body += `&specializare=${encodeURIComponent(specializareStr)}`;

        try {
            const response = await fetch(`${API_BASE}/update_candidate.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                showAlert(alert, '✓ Datele personale au fost salvate cu succes!', 'success');
                // Refresh displayed data
                loadMyData();
            } else {
                showAlert(alert, `Eroare: ${data.message}`, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare: ${error.message}`, 'error');
        }
    });
}

async function loadMyData() {
    const user = getCurrentUser();
    if (!user || !user.cnp) return;

    const loading = document.getElementById('mydataLoading');
    const form = document.getElementById('mydataForm');

    loading.classList.add('show');
    form.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/candidate_sheet.cgi?cnp=${encodeURIComponent(user.cnp)}&role=candidat`);
        const data = await parseJsonResponse(response);

        loading.classList.remove('show');

        if (data.status === 'ok') {
            const c = data.candidate;
            form.style.display = 'block';

            // Editable fields
            document.getElementById('myNume').value = c.nume || '';
            document.getElementById('myPrenume').value = c.prenume || '';
            document.getElementById('myCnpDisplay').value = c.cnp || '';

            // Faculty choice options (dynamic rows)
            const container = document.getElementById('myFacultyOptionsContainer');
            container.innerHTML = '';

            const optiuni = c.optiuni || [];
            if (optiuni.length > 0) {
                optiuni.forEach((opt, index) => {
                    addFacultyOptionRow(opt.facultate, opt.specializare);
                });
            } else {
                // Add one empty row to start
                addFacultyOptionRow();
            }
            updateAddButtonVisibility();

            // Read-only academic fields (set by operator)
            document.getElementById('myMedieDisplay').textContent = c.medieBac ? c.medieBac.toFixed(2) : '-';
            document.getElementById('myNota1Display').textContent = c.nota1 ? c.nota1.toFixed(2) : '-';
            document.getElementById('myNota2Display').textContent = c.nota2 ? c.nota2.toFixed(2) : '-';
            document.getElementById('myMediaAdmitereDisplay').textContent = c.mediaAdmitere ? c.mediaAdmitere.toFixed(2) : '-';

            // Show repartizat result if available
            const repartizatCard = document.getElementById('myRepartizatCard');
            if (repartizatCard) {
                if (c.repartizat && c.repartizat.trim() !== '') {
                    repartizatCard.style.display = 'block';
                    
                    // Show confirmed faculty if exists
                    const confirmatSection = document.getElementById('myConfirmatSection');
                    const confirmatDisplay = document.getElementById('myConfirmatDisplay');
                    if (confirmatSection && confirmatDisplay) {
                        if (c.confirmat && c.confirmat.trim() !== '') {
                            confirmatSection.style.display = 'block';
                            confirmatDisplay.textContent = c.confirmat;
                        } else {
                            confirmatSection.style.display = 'none';
                        }
                    }

                    // Show all repartizat options as a list
                    const repartizatList = document.getElementById('myRepartizatList');
                    if (repartizatList) {
                        const optiuni = c.repartizat.split('|').filter(o => o.trim() !== '');
                        if (optiuni.length > 0) {
                            let html = '';
                            optiuni.forEach((opt, idx) => {
                                const isBuget = opt.includes('(buget)');
                                const bgColor = isBuget ? '#d4edda' : '#fff3cd';
                                const textColor = isBuget ? 'var(--success-color)' : '#e67e22';
                                const icon = isBuget ? '✅' : '💰';
                                const isConfirmed = c.confirmat && c.confirmat === opt;
                                html += `
                                    <div style="background: ${bgColor}; padding: 0.6rem 1rem; border-radius: var(--radius); margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: space-between; border: ${isConfirmed ? '2px solid var(--success-color)' : '1px solid ' + textColor};">
                                        <span style="color: ${textColor}; font-weight: bold;">
                                            ${icon} ${idx + 1}. ${opt}
                                        </span>
                                        ${isConfirmed ? '<span style="color: var(--success-color); font-weight: bold;">← CONFIRMAT</span>' : ''}
                                    </div>
                                `;
                            });
                            repartizatList.innerHTML = html;
                        } else {
                            repartizatList.innerHTML = '<em style="color: var(--danger-color);">Nu te-ai încadrat la nicio facultate.</em>';
                        }
                    }
                } else {
                    repartizatCard.style.display = 'none';
                }
            }
        } else {
            form.style.display = 'block';
            document.getElementById('myCnpDisplay').value = user.cnp;
            // Init one empty option row
            const container = document.getElementById('myFacultyOptionsContainer');
            if (container) { container.innerHTML = ''; addFacultyOptionRow(); updateAddButtonVisibility(); }
        }
    } catch (error) {
        loading.classList.remove('show');
        form.style.display = 'block';
        document.getElementById('myCnpDisplay').value = user.cnp;
        const container = document.getElementById('myFacultyOptionsContainer');
        if (container) { container.innerHTML = ''; addFacultyOptionRow(); updateAddButtonVisibility(); }
    }
}

// ===== Dynamic Faculty Option Rows (Candidat My Data) =====

function addFacultyOptionRow(facultateValue, specializareValue) {
    const container = document.getElementById('myFacultyOptionsContainer');
    if (!container) return;

    const currentCount = container.querySelectorAll('.faculty-option-row').length;
    if (currentCount >= MAX_FACULTY_OPTIONS) return;

    const index = currentCount + 1;
    const row = document.createElement('div');
    row.className = 'faculty-option-row';
    row.innerHTML = `
        <div class="faculty-option-header">
            <span class="faculty-option-number">Opțiunea ${index}</span>
            ${currentCount > 0 ? '<button type="button" class="btn-remove-option" title="Elimină opțiunea">✕</button>' : ''}
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Facultate</label>
                <select class="myOptFacultate">
                    <option value="">Selectează facultatea</option>
                </select>
            </div>
            <div class="form-group">
                <label>Domeniu</label>
                <input type="text" class="myOptDomeniu" readonly placeholder="(se completează automat)">
            </div>
            <div class="form-group">
                <label>Specializare</label>
                <select class="myOptSpecializare">
                    <option value="">Selectează specializarea</option>
                </select>
            </div>
        </div>
    `;

    container.appendChild(row);

    // Populate faculty select
    const facSelect = row.querySelector('.myOptFacultate');
    const domInput = row.querySelector('.myOptDomeniu');
    const specSelect = row.querySelector('.myOptSpecializare');

    facultatiSuceava.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.nume;
        opt.textContent = f.nume;
        facSelect.appendChild(opt);
    });

    // Cascading change handler
    facSelect.addEventListener('change', () => {
        const selectedName = facSelect.value;
        const faculty = facultatiSuceava.find(f => f.nume === selectedName);

        while (specSelect.options.length > 1) specSelect.remove(1);
        specSelect.value = '';

        if (faculty) {
            domInput.value = faculty.domeniu;
            faculty.specializari.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                specSelect.appendChild(opt);
            });
        } else {
            domInput.value = '';
        }

        // Show + button only after selection is made
        updateAddButtonVisibility();
    });

    // Remove button handler
    const removeBtn = row.querySelector('.btn-remove-option');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            row.remove();
            renumberFacultyOptions();
            updateAddButtonVisibility();
        });
    }

    // Set initial values if provided
    if (facultateValue) {
        facSelect.value = facultateValue;
        facSelect.dispatchEvent(new Event('change'));
        if (specializareValue) {
            setTimeout(() => {
                specSelect.value = specializareValue;
            }, 50);
        }
    }

    updateAddButtonVisibility();
}

function renumberFacultyOptions() {
    const container = document.getElementById('myFacultyOptionsContainer');
    if (!container) return;
    const rows = container.querySelectorAll('.faculty-option-row');
    rows.forEach((row, i) => {
        const numberSpan = row.querySelector('.faculty-option-number');
        if (numberSpan) numberSpan.textContent = `Opțiunea ${i + 1}`;

        // First row should never have remove button
        const removeBtn = row.querySelector('.btn-remove-option');
        if (i === 0 && removeBtn) removeBtn.remove();
    });
}

function updateAddButtonVisibility() {
    const container = document.getElementById('myFacultyOptionsContainer');
    const addBtn = document.getElementById('addFacultyOptionBtn');
    if (!container || !addBtn) return;

    const rows = container.querySelectorAll('.faculty-option-row');
    const count = rows.length;

    // Show + button if: under max AND last row has a faculty selected
    if (count >= MAX_FACULTY_OPTIONS) {
        addBtn.style.display = 'none';
        return;
    }

    if (count === 0) {
        addBtn.style.display = 'none';
        return;
    }

    const lastRow = rows[rows.length - 1];
    const lastFac = lastRow.querySelector('.myOptFacultate');
    if (lastFac && lastFac.value) {
        addBtn.style.display = 'inline-flex';
    } else {
        addBtn.style.display = 'none';
    }
}

function collectFacultyOptions() {
    const container = document.getElementById('myFacultyOptionsContainer');
    if (!container) return [];

    const rows = container.querySelectorAll('.faculty-option-row');
    const options = [];

    rows.forEach(row => {
        const fac = row.querySelector('.myOptFacultate').value;
        const dom = row.querySelector('.myOptDomeniu').value;
        const spec = row.querySelector('.myOptSpecializare').value;

        if (fac) {
            options.push({ facultate: fac, domeniu: dom, specializare: spec });
        }
    });

    return options;
}

// ===== Edit Candidate Section (Operator / Admin) =====
function initEditCandidateSection(role) {
    const searchBtn = document.getElementById('editSearchBtn');
    const searchInput = document.getElementById('editSearchCnp');

    if (!searchBtn) return;

    searchBtn.addEventListener('click', () => loadCandidateForEdit(role));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadCandidateForEdit(role);
    });

    // For operators, hide name fields (they can only edit grades)
    // Admin can edit everything, so all fields stay visible
    if (role === 'operator') {
        const numeGroup = document.getElementById('editNumeGroup');
        const prenumeGroup = document.getElementById('editPrenumeGroup');
        if (numeGroup) numeGroup.style.display = 'none';
        if (prenumeGroup) prenumeGroup.style.display = 'none';
    }

    // Show admin faculty section with add button
    if (role === 'admin') {
        const adminFacSection = document.getElementById('editAdminFacultySection');
        if (adminFacSection) adminFacSection.style.display = 'block';

        const addBtn = document.getElementById('editAddOptionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                addEditOptionRow('', '');
            });
        }
    }

    // Form submission
    const form = document.getElementById('editCandidateForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('editCandidateAlert');
        const cnp = document.getElementById('editCnpDisplay').value;

        if (!cnp) return;

        // Build body based on role
        let body = `cnp=${encodeURIComponent(cnp)}&role=${encodeURIComponent(role)}`;

        if (role === 'admin') {
            // Admin sends all fields
            body += `&nume=${encodeURIComponent(document.getElementById('editNume').value)}`;
            body += `&prenume=${encodeURIComponent(document.getElementById('editPrenume').value)}`;

            // Collect faculty options from the multi-option rows (same as candidate form)
            const optionRows = document.querySelectorAll('#editOptionsContainer .option-row');
            const facArr = [], domArr = [], specArr = [];
            optionRows.forEach(row => {
                const fac = row.querySelector('.edit-opt-facultate');
                const spec = row.querySelector('.edit-opt-specializare');
                const dom = row.querySelector('.edit-opt-domeniu');
                if (fac && fac.value && spec && spec.value) {
                    facArr.push(fac.value);
                    domArr.push(dom ? dom.value : '');
                    specArr.push(spec.value);
                }
            });
            if (facArr.length > 0) {
                body += `&facultate=${encodeURIComponent(facArr.join('|'))}`;
                body += `&domeniu=${encodeURIComponent(domArr.join('|'))}`;
                body += `&specializare=${encodeURIComponent(specArr.join('|'))}`;
            }

            body += `&medie_bac=${encodeURIComponent(document.getElementById('editMedieBac').value)}`;
            body += `&nota1=${encodeURIComponent(document.getElementById('editNota1').value)}`;
            body += `&nota2=${encodeURIComponent(document.getElementById('editNota2').value)}`;
        } else {
            // Operator sends only grade fields
            body += `&medie_bac=${encodeURIComponent(document.getElementById('editMedieBac').value)}`;
            body += `&nota1=${encodeURIComponent(document.getElementById('editNota1').value)}`;
            body += `&nota2=${encodeURIComponent(document.getElementById('editNota2').value)}`;
        }
        try {
            const response = await fetch(`${API_BASE}/update_candidate.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                showAlert(alert, '✓ Candidat actualizat cu succes! Media de admitere: ' + data.candidate.mediaAdmitere.toFixed(2), 'success');
            } else {
                showAlert(alert, `Eroare: ${data.message}`, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare: ${error.message}`, 'error');
        }
    });

    // Confirm Faculty button handler
    const confirmBtn = document.getElementById('confirmFacultyBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const confirmSection = document.getElementById('confirmFacultySection');
            const confirmSelect = document.getElementById('confirmFacultySelect');
            const confirmAlert = document.getElementById('confirmFacultyAlert');
            
            const cnp = confirmSection ? confirmSection.dataset.cnp : '';
            const selectedFaculty = confirmSelect ? confirmSelect.value : '';

            if (!cnp) {
                showAlert(confirmAlert, 'Nu este selectat niciun candidat.', 'error');
                return;
            }
            if (!selectedFaculty) {
                showAlert(confirmAlert, 'Selectați o facultate din listă!', 'error');
                return;
            }

            if (!confirm(`Confirmați că candidatul alege: ${selectedFaculty}?`)) {
                return;
            }

            try {
                const body = `cnp=${encodeURIComponent(cnp)}&role=${encodeURIComponent(role)}&facultate_confirmata=${encodeURIComponent(selectedFaculty)}`;
                const response = await fetch(`${API_BASE}/confirm_faculty.cgi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body
                });

                const data = await parseJsonResponse(response);

                if (data.status === 'ok') {
                    showAlert(confirmAlert, `✅ ${data.message}: ${data.confirmat}`, 'success');
                    // Reload candidate data to refresh the display
                    loadCandidateForEdit(role);
                } else {
                    showAlert(confirmAlert, `Eroare: ${data.message}`, 'error');
                }
            } catch (error) {
                showAlert(confirmAlert, `Eroare: ${error.message}`, 'error');
            }
        });
    }
}

// ===== Admin Edit: Dynamic Faculty Option Rows =====
function addEditOptionRow(facultateValue, specializareValue) {
    const container = document.getElementById('editOptionsContainer');
    if (!container) return;

    const currentCount = container.querySelectorAll('.option-row').length;
    if (currentCount >= MAX_FACULTY_OPTIONS) return;

    const index = currentCount + 1;
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.cssText = 'background: var(--bg-color); padding: var(--spacing-sm); border-radius: var(--radius); border: 1px solid var(--border-color); margin-bottom: var(--spacing-sm);';
    row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs);">
            <span style="font-weight: 600; color: var(--primary-color);">Opțiunea ${index}</span>
            ${currentCount > 0 ? '<button type="button" class="btn-remove-edit-option" style="background: var(--danger-color); color: #fff; border: none; border-radius: var(--radius); padding: 0.2rem 0.5rem; cursor: pointer; font-size: 0.8rem;">✕ Șterge</button>' : ''}
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Facultate</label>
                <select class="edit-opt-facultate form-input">
                    <option value="">Selectează facultatea</option>
                </select>
            </div>
            <div class="form-group">
                <label>Domeniu</label>
                <input type="text" class="edit-opt-domeniu form-input" readonly placeholder="(se completează automat)">
            </div>
            <div class="form-group">
                <label>Specializare</label>
                <select class="edit-opt-specializare form-input">
                    <option value="">Selectează specializarea</option>
                </select>
            </div>
        </div>
    `;

    container.appendChild(row);

    const facSelect = row.querySelector('.edit-opt-facultate');
    const domInput = row.querySelector('.edit-opt-domeniu');
    const specSelect = row.querySelector('.edit-opt-specializare');

    // Populate faculty select
    facultatiSuceava.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.nume;
        opt.textContent = f.nume;
        facSelect.appendChild(opt);
    });

    // Cascading change handler
    facSelect.addEventListener('change', () => {
        const selectedName = facSelect.value;
        const faculty = facultatiSuceava.find(f => f.nume === selectedName);

        while (specSelect.options.length > 1) specSelect.remove(1);
        specSelect.value = '';

        if (faculty) {
            domInput.value = faculty.domeniu;
            faculty.specializari.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                specSelect.appendChild(opt);
            });
        } else {
            domInput.value = '';
        }
    });

    // Remove button handler
    const removeBtn = row.querySelector('.btn-remove-edit-option');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            row.remove();
            renumberEditOptions();
        });
    }

    // Pre-set values if provided
    if (facultateValue) {
        facSelect.value = facultateValue;
        facSelect.dispatchEvent(new Event('change'));
        // Set specialization after change populates the options
        setTimeout(() => {
            if (specializareValue) {
                specSelect.value = specializareValue;
            }
        }, 50);
    }
}

function renumberEditOptions() {
    const container = document.getElementById('editOptionsContainer');
    if (!container) return;
    const rows = container.querySelectorAll('.option-row');
    rows.forEach((row, idx) => {
        const label = row.querySelector('span');
        if (label) label.textContent = `Opțiunea ${idx + 1}`;
        // First row should not have a remove button
        const removeBtn = row.querySelector('.btn-remove-edit-option');
        if (idx === 0 && removeBtn) {
            removeBtn.remove();
        }
    });
}

async function loadCandidateForEdit(role) {
    const cnp = document.getElementById('editSearchCnp').value.trim();
    const loading = document.getElementById('editSearchLoading');
    const alert = document.getElementById('editSearchAlert');
    const form = document.getElementById('editCandidateForm');

    alert.classList.remove('show');
    form.style.display = 'none';

    // Also hide confirm section
    const confirmSection = document.getElementById('confirmFacultySection');
    if (confirmSection) confirmSection.style.display = 'none';
    const confirmFacultyAlert = document.getElementById('confirmFacultyAlert');
    if (confirmFacultyAlert) confirmFacultyAlert.classList.remove('show');
    const editCandidateAlert = document.getElementById('editCandidateAlert');
    if (editCandidateAlert) editCandidateAlert.classList.remove('show');

    if (!/^[0-9]{13}$/.test(cnp)) {
        showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const response = await fetch(`${API_BASE}/candidate_sheet.cgi?cnp=${encodeURIComponent(cnp)}&role=${encodeURIComponent(role)}`);
        const data = await parseJsonResponse(response);

        loading.classList.remove('show');

        if (data.status === 'ok') {
            const c = data.candidate;
            form.style.display = 'block';

            document.getElementById('editCnpDisplay').value = c.cnp;
            document.getElementById('editNume').value = c.nume || '';
            document.getElementById('editPrenume').value = c.prenume || '';

            // Admin: populate editable faculty option rows
            if (role === 'admin') {
                const editContainer = document.getElementById('editOptionsContainer');
                if (editContainer) {
                    editContainer.innerHTML = ''; // Clear existing rows
                    if (c.optiuni && c.optiuni.length > 0) {
                        c.optiuni.forEach(opt => {
                            addEditOptionRow(opt.facultate, opt.specializare);
                        });
                    } else {
                        addEditOptionRow('', '');
                    }
                }
            }

            // Operator: show read-only candidate options
            if (role === 'operator') {
                const optContainer = document.getElementById('editOptiuniReadonly');
                const optList = document.getElementById('editOptiuniList');
                if (optContainer && optList) {
                    optContainer.style.display = 'block';
                    if (c.optiuni && c.optiuni.length > 0) {
                        let html = '<ol style="margin:0; padding-left: 1.5rem;">';
                        c.optiuni.forEach((opt, idx) => {
                            html += `<li style="margin-bottom: 0.3rem;"><strong>${opt.facultate}</strong> — ${opt.domeniu} — ${opt.specializare}</li>`;
                        });
                        html += '</ol>';
                        optList.innerHTML = html;
                    } else {
                        optList.innerHTML = '<em style="color: var(--text-secondary);">Candidatul nu a ales opțiuni.</em>';
                    }
                }
            }

            document.getElementById('editMedieBac').value = c.medieBac || '';
            document.getElementById('editNota1').value = c.nota1 || '';
            document.getElementById('editNota2').value = c.nota2 || '';

            // Show confirm faculty section if candidate has been repartizat
            const confirmSection = document.getElementById('confirmFacultySection');
            const confirmSelect = document.getElementById('confirmFacultySelect');
            const confirmStatus = document.getElementById('confirmCurrentStatus');
            if (confirmSection && confirmSelect && confirmStatus) {
                if (c.repartizat && c.repartizat.trim() !== '') {
                    confirmSection.style.display = 'block';
                    
                    // Populate select with repartizat options
                    const optiuni = c.repartizat.split('|').filter(o => o.trim() !== '');
                    confirmSelect.innerHTML = '<option value="">-- Selectează facultatea --</option>';
                    optiuni.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        if (c.confirmat && c.confirmat === opt) {
                            option.selected = true;
                        }
                        confirmSelect.appendChild(option);
                    });

                    // Show current status
                    if (c.confirmat && c.confirmat.trim() !== '') {
                        confirmStatus.innerHTML = `
                            <div style="background: #d4edda; padding: 0.6rem 1rem; border-radius: var(--radius); border: 1px solid var(--success-color);">
                                <strong style="color: var(--success-color);">✅ Confirmat:</strong> 
                                <span style="color: var(--success-color);">${c.confirmat}</span>
                            </div>`;
                    } else {
                        confirmStatus.innerHTML = `
                            <div style="background: #fff3cd; padding: 0.6rem 1rem; border-radius: var(--radius); border: 1px solid #ffc107;">
                                <strong style="color: #856404;">⏳ Neconfirmat:</strong> 
                                <span style="color: #856404;">Candidatul are ${optiuni.length} opțiune/opțiuni, dar nu a confirmat încă.</span>
                            </div>`;
                    }

                    // Store CNP for confirm button
                    confirmSection.dataset.cnp = c.cnp;
                } else {
                    confirmSection.style.display = 'none';
                }
            }

            // Domain is auto-filled by the change event above
        } else {
            showAlert(alert, data.message, 'error');
        }
    } catch (error) {
        loading.classList.remove('show');
        showAlert(alert, `Eroare: ${error.message}`, 'error');
    }
}

// ===== Dashboard Section =====
function initDashboard() {
    const loadStatsBtn = document.getElementById('loadStats');
    if (loadStatsBtn) {
        loadStatsBtn.addEventListener('click', loadStatistics);
    }
}

async function loadStatistics() {
    const loading = document.getElementById('statsLoading');
    const content = document.getElementById('statsContent');

    if (!loading || !content) return;

    loading.classList.add('show');
    content.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/candidates_ranking.cgi`);

        if (!response.ok) {
            throw new Error('Eroare la încărcarea datelor');
        }

        const data = await parseJsonResponse(response);

        loading.classList.remove('show');

        if (data.status === 'ok') {
            if (data.count === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>Nu există candidați înregistrați pentru a calcula statistici</p>
                    </div>
                `;
            } else {
                displayStatistics(data.candidates);
            }
        } else {
            content.innerHTML = `
                <div class="alert alert-error show">
                    Eroare: ${data.message}
                </div>
            `;
        }
    } catch (error) {
        loading.classList.remove('show');
        content.innerHTML = `
            <div class="alert alert-error show">
                Eroare: ${error.message}
            </div>
        `;
    }
}

function displayStatistics(candidates) {
    const content = document.getElementById('statsContent');

    // ---- Core stats ----
    const totalCandidates = candidates.length;
    const withGrades = candidates.filter(c => c.mediaAdmitere > 0);
    const withoutGrades = totalCandidates - withGrades.length;
    const repartizati = candidates.filter(c => c.repartizat && c.repartizat.trim() !== '');
    const confirmati = candidates.filter(c => c.confirmat && c.confirmat.trim() !== '');

    const scores = withGrades.map(c => c.mediaAdmitere);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '—';
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : '—';
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : '—';

    // Score distribution brackets
    const brackets = [
        { label: '9.00 – 10.00', min: 9, max: 10.01, count: 0, color: '#22c55e' },
        { label: '8.00 – 8.99', min: 8, max: 9, count: 0, color: '#3b82f6' },
        { label: '7.00 – 7.99', min: 7, max: 8, count: 0, color: '#f59e0b' },
        { label: '6.00 – 6.99', min: 6, max: 7, count: 0, color: '#f97316' },
        { label: '< 6.00', min: 0, max: 6, count: 0, color: '#ef4444' },
    ];
    scores.forEach(s => {
        for (const b of brackets) {
            if (s >= b.min && s < b.max) { b.count++; break; }
        }
    });

    // ---- Faculty popularity (count each pipe-separated preference) ----
    const facultyCounts = {};
    candidates.forEach(c => {
        if (!c.facultate) return;
        const faculties = c.facultate.split('|');
        faculties.forEach(f => {
            const name = f.trim();
            if (name) facultyCounts[name] = (facultyCounts[name] || 0) + 1;
        });
    });
    const sortedFaculties = Object.entries(facultyCounts).sort((a, b) => b[1] - a[1]);

    // ---- Build HTML ----
    let statsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-label">Total Candidați</div>
                <div class="stat-value">${totalCandidates}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-icon">✅</div>
                <div class="stat-label">Cu Note Complete</div>
                <div class="stat-value">${withGrades.length}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon">⏳</div>
                <div class="stat-label">Fără Note</div>
                <div class="stat-value">${withoutGrades}</div>
            </div>
            <div class="stat-card info">
                <div class="stat-icon">🎯</div>
                <div class="stat-label">Repartizați</div>
                <div class="stat-value">${repartizati.length}</div>
            </div>
            <div class="stat-card" style="border-left-color: #8b5cf6;">
                <div class="stat-icon">🏁</div>
                <div class="stat-label">Confirmați</div>
                <div class="stat-value">${confirmati.length}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-icon">📊</div>
                <div class="stat-label">Medie Generală</div>
                <div class="stat-value">${avgScore}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon">🏆</div>
                <div class="stat-label">Scor Maxim</div>
                <div class="stat-value">${maxScore}</div>
            </div>
            <div class="stat-card info">
                <div class="stat-icon">📉</div>
                <div class="stat-label">Scor Minim</div>
                <div class="stat-value">${minScore}</div>
            </div>
        </div>
    `;

    // Score distribution
    if (scores.length > 0) {
        const maxBracket = Math.max(...brackets.map(b => b.count));
        statsHTML += `
            <div class="card" style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">
                    � Distribuția Notelor
                </h3>
                <div class="distribution-grid">
        `;
        brackets.forEach(b => {
            const pct = ((b.count / scores.length) * 100).toFixed(1);
            const barW = maxBracket > 0 ? (b.count / maxBracket) * 100 : 0;
            statsHTML += `
                <div class="distribution-item">
                    <div class="distribution-label">${b.label}</div>
                    <div class="distribution-value">${b.count} candidați (${pct}%)</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${barW}%; background: ${b.color};"></div>
                    </div>
                </div>
            `;
        });
        statsHTML += `
                </div>
            </div>
        `;
    }

    content.innerHTML = statsHTML;

    // ---- Faculty Popularity Card ----
    const facCard = document.getElementById('facultyStatsCard');
    const facContent = document.getElementById('facultyStatsContent');
    if (sortedFaculties.length > 0) {
        facCard.style.display = '';
        const maxFac = sortedFaculties[0][1];
        let facHTML = '<div class="distribution-grid">';
        sortedFaculties.forEach(([fac, count], idx) => {
            const pct = ((count / totalCandidates) * 100).toFixed(1);
            const barW = (count / maxFac) * 100;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            facHTML += `
                <div class="distribution-item">
                    <div class="distribution-label">${medal} ${fac}</div>
                    <div class="distribution-value">${count} aplicanți (${pct}%)</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${barW}%;"></div>
                    </div>
                </div>
            `;
        });
        facHTML += '</div>';
        facContent.innerHTML = facHTML;
    } else {
        facCard.style.display = 'none';
    }

    // ---- Faculty Filter Card ----
    const filterCard = document.getElementById('facultyFilterCard');
    filterCard.style.display = '';
    const filterSelect = document.getElementById('dashboardFacultyFilter');
    // Populate faculty dropdown
    filterSelect.innerHTML = '<option value="">-- Toate facultățile --</option>';
    sortedFaculties.forEach(([fac]) => {
        const opt = document.createElement('option');
        opt.value = fac;
        opt.textContent = fac;
        filterSelect.appendChild(opt);
    });

    // Store candidates globally for filter
    window._dashboardCandidates = candidates;

    filterSelect.onchange = function () {
        const selected = this.value;
        const container = document.getElementById('filteredCandidatesContent');
        const allCandidates = window._dashboardCandidates || [];

        if (!selected) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎓</div>
                    <p>Selectează o facultate pentru a vedea candidații</p>
                </div>
            `;
            return;
        }

        const filtered = allCandidates.filter(c => {
            if (!c.facultate) return false;
            return c.facultate.split('|').map(f => f.trim()).includes(selected);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>Niciun candidat nu a aplicat la <strong>${selected}</strong></p>
                </div>
            `;
            return;
        }

        // Sort by mediaAdmitere descending
        filtered.sort((a, b) => (b.mediaAdmitere || 0) - (a.mediaAdmitere || 0));

        let tHTML = `
            <p style="margin-bottom: var(--spacing-sm); color: var(--text-muted);">
                <strong>${filtered.length}</strong> candidați au aplicat la <strong>${selected}</strong>
            </p>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nume</th>
                            <th>Prenume</th>
                            <th>CNP</th>
                            <th>Media Bac</th>
                            <th>Media Admitere</th>
                            <th>Repartizat</th>
                            <th>Confirmat</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        filtered.forEach((c, i) => {
            const repartizatBadge = c.repartizat && c.repartizat.trim()
                ? `<span class="status-badge status-active">${c.repartizat.split('|').join(', ')}</span>`
                : '<span class="status-badge status-pending">—</span>';
            const confirmatBadge = c.confirmat && c.confirmat.trim()
                ? `<span class="status-badge status-active">${c.confirmat}</span>`
                : '<span class="status-badge status-pending">—</span>';
            tHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${c.nume || ''}</td>
                    <td>${c.prenume || ''}</td>
                    <td><code>${c.cnp}</code></td>
                    <td>${c.medieBac || '—'}</td>
                    <td><strong>${c.mediaAdmitere || '—'}</strong></td>
                    <td>${repartizatBadge}</td>
                    <td>${confirmatBadge}</td>
                </tr>
            `;
        });
        tHTML += '</tbody></table></div>';
        container.innerHTML = tHTML;
    };
}

// ===== Registration Form (Admin only) =====
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    const alert = document.getElementById('registerAlert');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        // Validate CNP
        const cnp = formData.get('cnp');
        if (!/^[0-9]{13}$/.test(cnp)) {
            showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
            return;
        }

        // Validate grades
        const medieBac = parseFloat(formData.get('medie_bac'));
        const nota1 = parseFloat(formData.get('nota1'));
        const nota2 = parseFloat(formData.get('nota2'));

        if (medieBac < 1 || medieBac > 10 || nota1 < 1 || nota1 > 10 || nota2 < 1 || nota2 > 10) {
            showAlert(alert, 'Notele trebuie să fie între 1 și 10!', 'error');
            return;
        }

        const params = new URLSearchParams(formData);

        try {
            const response = await fetch(`${API_BASE}/candidate_register.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            if (!response.ok) throw new Error('Eroare la comunicarea cu serverul');

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                showAlert(alert,
                    `✓ Candidat înregistrat cu succes! Media de admitere: ${data.mediaAdmitere.toFixed(2)}`,
                    'success'
                );
                form.reset();
            } else {
                showAlert(alert, `Eroare: ${data.message}`, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare: ${error.message}`, 'error');
        }
    });
}

// ===== Rankings Section =====
let allCandidates = [];

function initRankingSection() {
    const refreshBtn = document.getElementById('refreshRanking');
    const filterSelect = document.getElementById('filterFacultate');

    if (refreshBtn) refreshBtn.addEventListener('click', loadRankings);
    if (filterSelect) filterSelect.addEventListener('change', filterRankings);
}

async function loadRankings() {
    const loading = document.getElementById('rankingLoading');
    const content = document.getElementById('rankingContent');
    const filterSelect = document.getElementById('filterFacultate');

    if (!loading || !content) return;

    loading.classList.add('show');
    content.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/candidates_ranking.cgi`);

        if (!response.ok) throw new Error('Eroare la încărcarea clasamentului');

        const data = await parseJsonResponse(response);

        loading.classList.remove('show');

        if (data.status === 'ok') {
            allCandidates = data.candidates || [];

            if (data.count === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>Nu există candidați înregistrați</p>
                    </div>
                `;
                if (filterSelect) filterSelect.innerHTML = '<option value="">Toate Facultățile</option>';
            } else {
                populateFacultateFilter();
                filterRankings();
            }
        } else {
            content.innerHTML = `
                <div class="alert alert-error show">
                    Eroare: ${data.message}
                </div>
            `;
        }
    } catch (error) {
        loading.classList.remove('show');
        content.innerHTML = `
            <div class="alert alert-error show">
                Eroare: ${error.message}
            </div>
        `;
    }
}

function populateFacultateFilter() {
    const filterSelect = document.getElementById('filterFacultate');
    const facultati = [...new Set(allCandidates.map(c => c.facultate).filter(l => l))].sort();

    let options = '<option value="">Toate Facultățile</option>';
    facultati.forEach(facultate => {
        options += `<option value="${facultate}">${facultate}</option>`;
    });
    if (filterSelect) filterSelect.innerHTML = options;

    // Custom dropdown
    const customOptionsContainer = document.querySelector('.custom-options');
    if (customOptionsContainer) {
        let customOptionsHTML = '<div class="custom-option selected" data-value="">Toate Facultățile</div>';
        facultati.forEach(facultate => {
            customOptionsHTML += `<div class="custom-option" data-value="${facultate}">${facultate}</div>`;
        });
        customOptionsContainer.innerHTML = customOptionsHTML;
        setupCustomDropdown();
    }
}

function setupCustomDropdown() {
    const wrapper = document.querySelector('.custom-select');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select__trigger');
    const triggerText = wrapper.querySelector('.trigger-text');
    const options = wrapper.querySelectorAll('.custom-option');
    const hiddenSelect = document.getElementById('filterFacultate');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('open');
    });

    options.forEach(option => {
        option.addEventListener('click', function () {
            wrapper.querySelector('.custom-option.selected').classList.remove('selected');
            this.classList.add('selected');
            triggerText.textContent = this.textContent;
            const value = this.getAttribute('data-value');
            if (hiddenSelect) hiddenSelect.value = value;
            filterRankings();
            wrapper.classList.remove('open');
        });
    });

    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
}

function filterRankings() {
    const filterSelect = document.getElementById('filterFacultate');
    const content = document.getElementById('rankingContent');
    const filterValue = filterSelect ? filterSelect.value : '';

    let filtered = [...allCandidates];

    if (filterValue) {
        filtered = filtered.filter(c => c.facultate === filterValue);
    }

    filtered.forEach((c, index) => {
        c.position = index + 1;
    });

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Niciun candidat găsit pentru facultatea selectată.</p>
            </div>
        `;
    } else {
        displayRankings(filtered);
    }
}

function displayRankings(candidates) {
    const content = document.getElementById('rankingContent');
    const user = getCurrentUser();

    // Determine which columns to show based on role
    const showCnp = user && (user.role === 'operator' || user.role === 'admin');

    let tableHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Poziție</th>
                        ${showCnp ? '<th>CNP</th>' : ''}
                        <th>Nume</th>
                        <th>Prenume</th>
                        <th>Facultate (opțiuni)</th>
                        <th>Media Admitere</th>
                        <th>Repartizat</th>
                        <th>Confirmat</th>
                    </tr>
                </thead>
                <tbody>
    `;

    candidates.forEach(candidate => {
        const positionClass = candidate.position <= 3 ? 'top-3' :
            candidate.position <= 10 ? 'top-10' : 'other';

        // Build repartizat cell with multiple options
        let repartizatCell = '-';
        if (candidate.repartizat && candidate.repartizat.trim() !== '') {
            const opts = candidate.repartizat.split('|');
            repartizatCell = opts.map(opt => {
                const isBuget = opt.includes('(buget)');
                const color = isBuget ? 'var(--success-color)' : '#e67e22';
                const icon = isBuget ? '✅' : '💰';
                return `<div style="color: ${color}; font-weight: bold; font-size: 0.85rem;">${icon} ${opt}</div>`;
            }).join('');
        }

        // Build confirmat cell
        let confirmatCell = '-';
        let confirmatStyle = '';
        if (candidate.confirmat && candidate.confirmat.trim() !== '') {
            confirmatCell = candidate.confirmat;
            confirmatStyle = candidate.confirmat.includes('buget') 
                ? 'color: var(--success-color); font-weight: bold;' 
                : 'color: #e67e22; font-weight: bold;';
        }

        tableHTML += `
            <tr>
                <td><span class="position-badge ${positionClass}">${candidate.position}</span></td>
                ${showCnp ? `<td>${candidate.cnp}</td>` : ''}
                <td>${candidate.nume || '-'}</td>
                <td>${candidate.prenume || '-'}</td>
                <td>${candidate.facultate || '-'}</td>
                <td><strong>${candidate.mediaAdmitere.toFixed(2)}</strong></td>
                <td>${repartizatCell}</td>
                <td style="${confirmatStyle}">${confirmatCell}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    content.innerHTML = tableHTML;
}

// ===== Search Section =====
function initSearchSection() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchCnp');

    if (searchBtn) searchBtn.addEventListener('click', searchCandidate);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchCandidate();
        });
    }
}

async function searchCandidate() {
    const cnp = document.getElementById('searchCnp').value.trim();
    const loading = document.getElementById('searchLoading');
    const alert = document.getElementById('searchAlert');
    const info = document.getElementById('candidateInfo');

    alert.classList.remove('show');
    info.innerHTML = '';

    if (!/^[0-9]{13}$/.test(cnp)) {
        showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const user = getCurrentUser();
        const role = user ? user.role : '';
        const response = await fetch(`${API_BASE}/candidate_sheet.cgi?cnp=${encodeURIComponent(cnp)}&role=${encodeURIComponent(role)}`);
        const data = await parseJsonResponse(response);

        loading.classList.remove('show');

        if (data.status === 'ok') {
            displayCandidateInfo(data.candidate);
        } else {
            showAlert(alert, data.message, 'error');
        }
    } catch (error) {
        loading.classList.remove('show');
        showAlert(alert, `Eroare: ${error.message}`, 'error');
    }
}

function displayCandidateInfo(c) {
    const info = document.getElementById('candidateInfo');

    const infoHTML = `
        <div class="candidate-info">
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-color);">
                📋 Informații Candidat
            </h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">CNP</div>
                    <div class="info-value">${c.cnp || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nume</div>
                    <div class="info-value">${c.nume || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Prenume</div>
                    <div class="info-value">${c.prenume || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Facultate</div>
                    <div class="info-value">${c.facultate || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Domeniu</div>
                    <div class="info-value">${c.domeniu || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Specializare</div>
                    <div class="info-value">${c.specializare || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Media Bacalaureat</div>
                    <div class="info-value">${c.medieBac ? c.medieBac.toFixed(2) : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nota Probă 1</div>
                    <div class="info-value">${c.nota1 ? c.nota1.toFixed(2) : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nota Probă 2</div>
                    <div class="info-value">${c.nota2 ? c.nota2.toFixed(2) : '-'}</div>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Media de Admitere</div>
                    <div class="info-value" style="font-size: 1.75rem; color: var(--primary-color);">
                        ${c.mediaAdmitere ? c.mediaAdmitere.toFixed(2) : '-'}
                    </div>
                </div>
                ${c.repartizat ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Repartizat la</div>
                    <div class="info-value">
                        ${c.repartizat.split('|').map(opt => {
                            const isBuget = opt.includes('(buget)');
                            const color = isBuget ? 'var(--success-color)' : '#e67e22';
                            const icon = isBuget ? '✅' : '💰';
                            return `<div style="color: ${color}; font-weight: bold; margin-bottom: 0.2rem;">${icon} ${opt}</div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                ${c.confirmat ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Facultate Confirmată</div>
                    <div class="info-value" style="font-size: 1.25rem; color: var(--success-color); font-weight: bold;">
                        ✅ ${c.confirmat}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    info.innerHTML = infoHTML;
}

// ===== Operators Management Section (Admin Only) =====

function initOperatorsSection() {
    const form = document.getElementById('addOperatorForm');
    const refreshBtn = document.getElementById('refreshOperators');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('addOperatorAlert');

        const email = document.getElementById('opEmail').value.trim();
        const password = document.getElementById('opPassword').value;

        if (!email || !password) {
            showAlert(alert, 'Email-ul și parola sunt obligatorii!', 'error');
            return;
        }

        const user = getCurrentUser();
        const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=operator&caller_role=${encodeURIComponent(user.role)}`;

        try {
            const response = await fetch(`${API_BASE}/register_user.cgi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });

            const data = await parseJsonResponse(response);

            if (data.status === 'ok') {
                showAlert(alert, `✓ Cont operator creat cu succes pentru ${email}!`, 'success');
                form.reset();
                loadOperatorsList();
            } else {
                showAlert(alert, data.message, 'error');
            }
        } catch (error) {
            showAlert(alert, `Eroare: ${error.message}`, 'error');
        }
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadOperatorsList);
    }
}

async function loadOperatorsList() {
    const loading = document.getElementById('operatorsLoading');
    const container = document.getElementById('operatorsList');

    if (!container) return;

    if (loading) loading.classList.add('show');
    container.innerHTML = '';

    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE}/get_users.cgi?caller_role=${encodeURIComponent(user.role)}&role=operator`);
        const data = await parseJsonResponse(response);

        if (loading) loading.classList.remove('show');

        if (data.status === 'ok') {
            const operators = data.users || [];

            if (operators.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <p>Nu există operatori înregistrați</p>
                    </div>
                `;
                return;
            }

            let html = '<div class="operators-list">';
            operators.forEach((op, index) => {
                html += `
                    <div class="operator-item">
                        <span class="operator-index">${index + 1}</span>
                        <span class="operator-email">${op.email}</span>
                        <span class="role-tag role-operator">Operator</span>
                        <button class="btn btn-sm" style="background: var(--danger-color); color: #fff; padding: 0.3rem 0.7rem; font-size: 0.8rem; border: none; border-radius: var(--radius); cursor: pointer;" 
                            onclick="deleteOperator(${op.id}, '${op.email.replace(/'/g, "\\'")}')">
                            🗑️ Șterge
                        </button>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `<p style="color:var(--error-color);">${data.message}</p>`;
        }
    } catch (error) {
        if (loading) loading.classList.remove('show');
        container.innerHTML = `<p style="color:var(--error-color);">Eroare: ${error.message}</p>`;
    }
}

async function deleteOperator(userId, email) {
    if (!confirm(`Sigur doriți să ștergeți operatorul "${email}"?`)) return;
    try {
        const user = getCurrentUser();
        const params = new URLSearchParams();
        params.append('user_id', userId);
        params.append('caller_role', user.role);
        const response = await fetch(`${API_BASE}/delete_user.cgi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const data = await parseJsonResponse(response);
        if (data.status === 'ok') {
            showNotification('Operator șters cu succes!', 'success');
            loadOperatorsList();
        } else {
            showNotification(data.message || 'Eroare la ștergerea operatorului', 'error');
        }
    } catch (error) {
        showNotification('Eroare la ștergerea operatorului: ' + error.message, 'error');
    }
}

// ===== Facultăți Suceava Section =====

async function loadFacultatiData() {
    try {
        const response = await fetch(`${API_BASE}/get_facultati.cgi`);
        const data = await parseJsonResponse(response);
        if (data.status === 'ok' && data.facultati) {
            facultatiSuceava = data.facultati;
            populateFacultyDropdowns();
        }
    } catch (error) {
        console.error('Eroare la încărcarea facultăților:', error);
    }
}

function populateFacultyDropdowns() {
    const selectors = ['#facultate', '#editFacultate'];
    selectors.forEach(sel => {
        const select = document.querySelector(sel);
        if (!select) return;

        // Keep the first placeholder option, remove the rest
        while (select.options.length > 1) {
            select.remove(1);
        }

        facultatiSuceava.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.nume;
            opt.textContent = f.nume;
            select.appendChild(opt);
        });
    });

    // Setup cascading handlers for static forms (register + edit)
    setupFacultyChangeHandler('facultate', 'domeniu', 'specializare');
    setupFacultyChangeHandler('editFacultate', 'editDomeniu', 'editSpecializare');
}

function setupFacultyChangeHandler(facultateId, domeniuId, specializareId) {
    const facSelect = document.getElementById(facultateId);
    const domeniuInput = document.getElementById(domeniuId);
    const specSelect = document.getElementById(specializareId);

    if (!facSelect || !domeniuInput || !specSelect) return;

    facSelect.addEventListener('change', () => {
        const selectedName = facSelect.value;
        const faculty = facultatiSuceava.find(f => f.nume === selectedName);

        // Clear specialization options (keep placeholder)
        while (specSelect.options.length > 1) {
            specSelect.remove(1);
        }
        specSelect.value = '';

        if (faculty) {
            // Auto-fill domain
            domeniuInput.value = faculty.domeniu;

            // Populate specializations
            faculty.specializari.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                specSelect.appendChild(opt);
            });
        } else {
            domeniuInput.value = '';
        }
    });
}

function initFacultatiSection() {
    // Nothing special to init — data is loaded in showApp
}

function displayFacultatiList() {
    const content = document.getElementById('facultatiContent');
    const loading = document.getElementById('facultatiLoading');

    if (!content) return;

    if (facultatiSuceava.length === 0) {
        if (loading) loading.classList.add('show');
        loadFacultatiData().then(() => {
            if (loading) loading.classList.remove('show');
            renderFacultatiCards(content);
        });
    } else {
        renderFacultatiCards(content);
    }
}

function renderFacultatiCards(container) {
    if (facultatiSuceava.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;">Nu s-au găsit facultăți.</p>';
        return;
    }

    let html = `
        <div style="text-align:center; margin-bottom:1.5rem;">
            <h3 style="color:var(--primary-color);">🏛️ Universitatea Ștefan cel Mare din Suceava</h3>
            <p style="color:#666;">${facultatiSuceava.length} facultăți disponibile</p>
        </div>
        <div class="facultati-grid">
    `;

    facultatiSuceava.forEach(f => {
        const specBadges = f.specializari.map(s => `<span class="badge">${s}</span>`).join('');
        html += `
            <div class="facultate-card">
                <div class="facultate-header">
                    <span class="facultate-icon">🎓</span>
                    <span class="facultate-name">${f.nume}</span>
                </div>
                <div class="facultate-domeniu">
                    <strong>Domeniu:</strong> ${f.domeniu}
                </div>
                <div class="facultate-specializari">
                    <strong>Specializări:</strong>
                    <div class="badges-container">${specBadges}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ===== Locuri Buget / Taxa Section (operator, admin) =====

function initLocuriSection() {
    const form = document.getElementById('locuriForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveLocuri();
    });
}

async function loadLocuri() {
    const loading = document.getElementById('locuriLoading');
    const form = document.getElementById('locuriForm');
    const alert = document.getElementById('locuriAlert');
    const tbody = document.getElementById('locuriTableBody');

    if (!loading || !form || !tbody) return;

    loading.classList.add('show');
    form.style.display = 'none';
    if (alert) alert.classList.remove('show');

    try {
        const response = await fetch(`${API_BASE}/get_locuri.cgi`);
        const data = await parseJsonResponse(response);

        loading.classList.remove('show');
        form.style.display = 'block';

        let html = '';
        data.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.facultate}</td>
                    <td>${item.domeniu}</td>
                    <td>
                        <input type="number" class="locuri-input locuri-buget" min="0"
                            data-facultate="${item.facultate}" value="${item.locuri_buget}"
                            style="width: 80px; text-align: center; padding: 0.3rem;">
                    </td>
                    <td>
                        <input type="number" class="locuri-input locuri-taxa" min="0"
                            data-facultate="${item.facultate}" value="${item.locuri_taxa}"
                            style="width: 80px; text-align: center; padding: 0.3rem;">
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        loading.classList.remove('show');
        showAlert(alert, `Eroare la încărcare: ${error.message}`, 'error');
    }
}

async function saveLocuri() {
    const alert = document.getElementById('locuriAlert');
    const user = getCurrentUser();
    if (!user) return;

    // Collect all faculty rows
    const bugetInputs = document.querySelectorAll('.locuri-buget');
    const taxaInputs = document.querySelectorAll('.locuri-taxa');

    let locuri = [];
    bugetInputs.forEach((input, index) => {
        const facultate = input.getAttribute('data-facultate');
        const buget = parseInt(input.value) || 0;
        const taxa = parseInt(taxaInputs[index].value) || 0;
        locuri.push(`${facultate}:${buget}:${taxa}`);
    });

    const locuriStr = locuri.join('|');
    const body = `role=${encodeURIComponent(user.role)}&locuri=${encodeURIComponent(locuriStr)}`;

    try {
        const response = await fetch(`${API_BASE}/save_locuri.cgi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });

        const data = await parseJsonResponse(response);

        if (data.status === 'ok') {
            showAlert(alert, `✓ ${data.message} (${data.count} facultăți)`, 'success');
        } else {
            showAlert(alert, `Eroare: ${data.message}`, 'error');
        }
    } catch (error) {
        showAlert(alert, `Eroare: ${error.message}`, 'error');
    }
}

// ===== Repartizare Section (admin only) =====

function initRepartizareSection() {
    const btn = document.getElementById('runRepartizareBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!confirm('Sunteți sigur că doriți să rulați repartizarea? Aceasta va asigna toți candidații pe facultăți.')) {
            return;
        }
        await runRepartizare();
    });
}

async function runRepartizare() {
    const loading = document.getElementById('repartizareLoading');
    const alert = document.getElementById('repartizareAlert');
    const results = document.getElementById('repartizareResults');
    const tbody = document.getElementById('repartizareTableBody');
    const btn = document.getElementById('runRepartizareBtn');

    if (!loading || !alert || !results || !tbody) return;

    loading.classList.add('show');
    alert.classList.remove('show');
    results.style.display = 'none';
    if (btn) btn.disabled = true;

    const user = getCurrentUser();
    const body = `role=${encodeURIComponent(user.role)}`;

    try {
        const response = await fetch(`${API_BASE}/repartizare.cgi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });

        const data = await parseJsonResponse(response);

        loading.classList.remove('show');
        if (btn) btn.disabled = false;

        if (data.status === 'ok') {
            showAlert(alert, `✓ ${data.message}. Total candidați procesați: ${data.total}`, 'success');

            // Display results table
            let html = '';
            let repartizati = 0;
            let nerepartizati = 0;

            data.rezultate.forEach((r, index) => {
                const nrOpt = r.nrOptiuni || 0;
                let optCell = '';
                let nrClass = '';

                if (nrOpt === 0) {
                    optCell = '<span style="color: var(--danger-color); font-weight: bold;">❌ Nerepartizat</span>';
                    nrClass = 'color: var(--danger-color); font-weight: bold;';
                    nerepartizati++;
                } else {
                    repartizati++;
                    // Parse the pipe-separated repartizat
                    const opts = r.repartizat.split('|');
                    optCell = opts.map(opt => {
                        const isBuget = opt.includes('(buget)');
                        const color = isBuget ? 'var(--success-color)' : '#e67e22';
                        const icon = isBuget ? '✅' : '💰';
                        return `<div style="color: ${color}; font-weight: bold; margin-bottom: 0.2rem;">${icon} ${opt}</div>`;
                    }).join('');
                    nrClass = 'color: var(--primary-color); font-weight: bold;';
                }

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${r.cnp}</td>
                        <td>${r.nume}</td>
                        <td>${r.prenume}</td>
                        <td>${r.mediaAdmitere.toFixed(2)}</td>
                        <td>${optCell}</td>
                        <td style="${nrClass}">${nrOpt}</td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
            results.style.display = 'block';

            // Update alert with summary
            showAlert(alert,
                `✓ Repartizare finalizată! Total: ${data.total} | ` +
                `Repartizați: ${repartizati} | Nerepartizați: ${nerepartizati}`,
                'success'
            );
        } else {
            showAlert(alert, `Eroare: ${data.message}`, 'error');
        }
    } catch (error) {
        loading.classList.remove('show');
        if (btn) btn.disabled = false;
        showAlert(alert, `Eroare: ${error.message}`, 'error');
    }
}

// ===== Utility Functions =====
function showAlert(element, message, type) {
    if (!element) return;
    element.className = `alert alert-${type} show`;
    element.textContent = message;

    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}
