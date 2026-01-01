// ===== Configuration =====
const API_BASE = '/cgi-bin';

// ===== Tab Navigation =====
document.addEventListener('DOMContentLoaded', function () {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Auto-load data when switching to dashboard or ranking tabs
            if (targetTab === 'dashboard') {
                loadStatistics();
            } else if (targetTab === 'ranking') {
                loadRankings();
            }
        });
    });

    // Initialize event listeners
    initDashboard();
    initRegisterForm();
    initRankingSection();
    initSearchSection();

    // Load dashboard statistics on initial page load (since it's the default tab)
    loadStatistics();
});

// ===== Dashboard Section =====
function initDashboard() {
    const loadStatsBtn = document.getElementById('loadStats');
    loadStatsBtn.addEventListener('click', loadStatistics);
}

async function loadStatistics() {
    const loading = document.getElementById('statsLoading');
    const content = document.getElementById('statsContent');

    loading.classList.add('show');
    content.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/candidates_ranking.cgi`);

        if (!response.ok) {
            throw new Error('Eroare la încărcarea datelor');
        }

        const data = await response.json();

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

    // Calculate statistics
    const totalCandidates = candidates.length;
    const scores = candidates.map(c => c.mediaAdmitere);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / totalCandidates).toFixed(2);
    const maxScore = Math.max(...scores).toFixed(2);
    const minScore = Math.min(...scores).toFixed(2);

    // Distribution by stream
    const streamCounts = {};
    candidates.forEach(c => {
        streamCounts[c.filiera] = (streamCounts[c.filiera] || 0) + 1;
    });

    // Distribution by school
    const schoolCounts = {};
    candidates.forEach(c => {
        schoolCounts[c.liceu] = (schoolCounts[c.liceu] || 0) + 1;
    });
    const topSchools = Object.entries(schoolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    let statsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-label">Total Candidați</div>
                <div class="stat-value">${totalCandidates}</div>
            </div>
            
            <div class="stat-card success">
                <div class="stat-icon">📊</div>
                <div class="stat-label">Media Generală</div>
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
        
        <div class="card" style="margin-bottom: var(--spacing-lg);">
            <h3 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">
                📚 Distribuție pe Filiere
            </h3>
            <div class="distribution-grid">
    `;

    // Add stream distribution
    const maxStreamCount = Math.max(...Object.values(streamCounts));
    Object.entries(streamCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([stream, count]) => {
            const percentage = ((count / totalCandidates) * 100).toFixed(1);
            const barWidth = (count / maxStreamCount) * 100;
            statsHTML += `
                <div class="distribution-item">
                    <div class="distribution-label">${stream}</div>
                    <div class="distribution-value">${count} candidați (${percentage}%)</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        });

    statsHTML += `
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">
                🏫 Top 5 Licee (după număr de candidați)
            </h3>
            <div class="distribution-grid">
    `;

    // Add top schools
    const maxSchoolCount = Math.max(...topSchools.map(s => s[1]));
    topSchools.forEach(([school, count]) => {
        const percentage = ((count / totalCandidates) * 100).toFixed(1);
        const barWidth = (count / maxSchoolCount) * 100;
        statsHTML += `
            <div class="distribution-item">
                <div class="distribution-label">${school}</div>
                <div class="distribution-value">${count} candidați (${percentage}%)</div>
                <div class="distribution-bar">
                    <div class="distribution-fill" style="width: ${barWidth}%"></div>
                </div>
            </div>
        `;
    });

    statsHTML += `
            </div>
        </div>
    `;

    content.innerHTML = statsHTML;
}

// ===== Registration Form =====
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    const alert = document.getElementById('registerAlert');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);

        // Validate CNP
        const cnp = formData.get('cnp');
        if (!/^[0-9]{13}$/.test(cnp)) {
            showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
            return;
        }

        // Validate grades
        const medieGenerala = parseFloat(formData.get('medie_generala'));
        const nota1 = parseFloat(formData.get('nota1'));
        const nota2 = parseFloat(formData.get('nota2'));

        if (medieGenerala < 1 || medieGenerala > 10 || nota1 < 1 || nota1 > 10 || nota2 < 1 || nota2 > 10) {
            showAlert(alert, 'Notele trebuie să fie între 1 și 10!', 'error');
            return;
        }

        // Prepare data for CGI
        const params = new URLSearchParams(formData);

        try {
            const response = await fetch(`${API_BASE}/candidate_register.cgi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error('Eroare la comunicarea cu serverul');
            }

            const data = await response.json();

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
let allCandidates = []; // Store all candidates for filtering

function initRankingSection() {
    const refreshBtn = document.getElementById('refreshRanking');
    const filterSelect = document.getElementById('filterLiceu');

    refreshBtn.addEventListener('click', loadRankings);
    filterSelect.addEventListener('change', filterRankings);
}

async function loadRankings() {
    const loading = document.getElementById('rankingLoading');
    const content = document.getElementById('rankingContent');
    const filterSelect = document.getElementById('filterLiceu');

    loading.classList.add('show');
    content.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/candidates_ranking.cgi`);

        if (!response.ok) {
            throw new Error('Eroare la încărcarea clasamentului');
        }

        const data = await response.json();

        loading.classList.remove('show');

        if (data.status === 'ok') {
            allCandidates = data.candidates || []; // Store data

            if (data.count === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>Nu există candidați înregistrați</p>
                    </div>
                `;
                filterSelect.innerHTML = '<option value="">Toate Liceele</option>';
            } else {
                populateLiceuFilter();
                filterRankings(); // Display with current filter
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

function populateLiceuFilter() {
    // 1. Populate Hidden Native Select (keeps logic working)
    const filterSelect = document.getElementById('filterLiceu');
    const licee = [...new Set(allCandidates.map(c => c.liceu))].sort();

    let options = '<option value="">Toate Liceele</option>';
    licee.forEach(liceu => {
        options += `<option value="${liceu}">${liceu}</option>`;
    });
    filterSelect.innerHTML = options;

    // 2. Populate Custom Dropdown
    const customOptionsContainer = document.querySelector('.custom-options');
    let customOptionsHTML = '<div class="custom-option selected" data-value="">Toate Liceele</div>';

    licee.forEach(liceu => {
        customOptionsHTML += `<div class="custom-option" data-value="${liceu}">${liceu}</div>`;
    });
    customOptionsContainer.innerHTML = customOptionsHTML;

    // 3. Setup Custom Dropdown Interaction
    setupCustomDropdown();
}

function setupCustomDropdown() {
    const wrapper = document.querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select__trigger');
    const triggerText = wrapper.querySelector('.trigger-text');
    const options = wrapper.querySelectorAll('.custom-option');
    const hiddenSelect = document.getElementById('filterLiceu');

    // Toggle Open
    trigger.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        wrapper.classList.toggle('open');
    });

    // Select Option
    options.forEach(option => {
        option.addEventListener('click', function () {
            // Update visual selection
            wrapper.querySelector('.custom-option.selected').classList.remove('selected');
            this.classList.add('selected');

            // Update trigger text
            triggerText.textContent = this.textContent;

            // Update hidden select value and trigger change
            const value = this.getAttribute('data-value');
            hiddenSelect.value = value;

            // Trigger filtering
            filterRankings();

            // Close dropdown
            wrapper.classList.remove('open');
        });
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
}

function filterRankings() {
    const filterValue = document.getElementById('filterLiceu').value;
    const content = document.getElementById('rankingContent');

    let filtered = [...allCandidates]; // Create a copy

    if (filterValue) {
        filtered = filtered.filter(c => c.liceu === filterValue);
    }

    // Recalculate positions for the current view
    filtered.forEach((c, index) => {
        c.position = index + 1;
    });

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Niciun candidat găsit pentru liceul selectat.</p>
            </div>
        `;
    } else {
        displayRankings(filtered);
    }
}

function displayRankings(candidates) {
    const content = document.getElementById('rankingContent');

    let tableHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Poziție</th>
                        <th>CNP</th>
                        <th>Nume</th>
                        <th>Prenume</th>
                        <th>Liceu</th>
                        <th>Filieră</th>
                        <th>Specializare</th>
                        <th>Media Admitere</th>
                    </tr>
                </thead>
                <tbody>
    `;

    candidates.forEach(candidate => {
        const positionClass = candidate.position <= 3 ? 'top-3' :
            candidate.position <= 10 ? 'top-10' : 'other';

        tableHTML += `
            <tr>
                <td><span class="position-badge ${positionClass}">${candidate.position}</span></td>
                <td>${candidate.cnp}</td>
                <td>${candidate.nume}</td>
                <td>${candidate.prenume}</td>
                <td>${candidate.liceu}</td>
                <td>${candidate.filiera}</td>
                <td>${candidate.specializare}</td>
                <td><strong>${candidate.mediaAdmitere.toFixed(2)}</strong></td>
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

    searchBtn.addEventListener('click', searchCandidate);

    // Allow search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCandidate();
        }
    });
}

async function searchCandidate() {
    const cnp = document.getElementById('searchCnp').value.trim();
    const loading = document.getElementById('searchLoading');
    const alert = document.getElementById('searchAlert');
    const info = document.getElementById('candidateInfo');

    // Reset previous results
    alert.classList.remove('show');
    info.innerHTML = '';

    // Validate CNP
    if (!/^[0-9]{13}$/.test(cnp)) {
        showAlert(alert, 'CNP-ul trebuie să conțină exact 13 cifre!', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const response = await fetch(`${API_BASE}/candidate_sheet.cgi?cnp=${encodeURIComponent(cnp)}`);

        if (!response.ok) {
            throw new Error('Eroare la căutarea candidatului');
        }

        const text = await response.text();
        loading.classList.remove('show');

        if (text.includes('nu a fost gasit')) {
            showAlert(alert, 'Candidatul cu CNP-ul specificat nu a fost găsit.', 'error');
        } else {
            displayCandidateInfo(text);
        }
    } catch (error) {
        loading.classList.remove('show');
        showAlert(alert, `Eroare: ${error.message}`, 'error');
    }
}

function displayCandidateInfo(text) {
    const info = document.getElementById('candidateInfo');

    // Parse the plain text response
    const lines = text.split('\n').filter(line => line.trim());
    const data = {};

    lines.forEach(line => {
        if (line.includes(':')) {
            const [key, value] = line.split(':').map(s => s.trim());
            data[key] = value;
        }
    });

    const infoHTML = `
        <div class="candidate-info">
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-color);">
                📋 Informații Candidat
            </h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">CNP</div>
                    <div class="info-value">${data['CNP'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nume</div>
                    <div class="info-value">${data['Nume'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Prenume</div>
                    <div class="info-value">${data['Prenume'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Liceu</div>
                    <div class="info-value">${data['Liceu'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Filieră</div>
                    <div class="info-value">${data['Filiera'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Specializare</div>
                    <div class="info-value">${data['Specializare'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Medie Generală</div>
                    <div class="info-value">${data['Medie generala'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nota Probă 1</div>
                    <div class="info-value">${data['Nota proba 1'] || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nota Probă 2</div>
                    <div class="info-value">${data['Nota proba 2'] || '-'}</div>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Media de Admitere</div>
                    <div class="info-value" style="font-size: 1.75rem; color: var(--primary-color);">
                        ${data['Media admitere'] || '-'}
                    </div>
                </div>
            </div>
        </div>
    `;

    info.innerHTML = infoHTML;
}

// ===== Utility Functions =====
function showAlert(element, message, type) {
    element.className = `alert alert-${type} show`;
    element.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}
