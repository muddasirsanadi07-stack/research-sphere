/**
 * Research Repository Controller
 * Handles navigation, deep-linking, and category-specific data rendering
 */

let currentData = [];
let currentCategory = '';
let myCharts = {};

document.addEventListener('DOMContentLoaded', () => {
    initRepository();
});

// Helper for debouncing search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initRepository() {
    const navItems = document.querySelectorAll('.repo-nav-item');
    const searchInput = document.getElementById('repo-search-input');

    // 1. Handle Navigation Clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const category = item.getAttribute('data-category');
            if (currentCategory !== category) {
                currentCategory = category;
                loadCategory(category);
            }
        });
    });

    // 2. Global Search & Filter Listeners
    const debouncedFilter = debounce(() => applyFilters(), 250);

    if (searchInput) {
        searchInput.addEventListener('input', debouncedFilter);
    }

    document.addEventListener('change', (e) => {
        if (e.target.id === 'filter-dept') {
            applyFilters(); // Dropdowns can be immediate
        }
    });

    // 3. Handle Deep-linking or Default Load
    const hash = window.location.hash.substring(1) || 'hub';
    const initialItem = document.querySelector(`[data-category="${hash}"]`) || navItems[0];
    
    if (initialItem) {
        navItems.forEach(nav => nav.classList.remove('active'));
        initialItem.classList.add('active');
        currentCategory = initialItem.getAttribute('data-category');
        loadCategory(currentCategory);
    }
}

async function loadCategory(catId) {
    const contentArea = document.getElementById('repo-content');
    const viewTitle = document.getElementById('view-title');
    const breadcrumb = document.getElementById('breadcrumb-current');

    if (!contentArea) return;

    // Show loading state
    contentArea.innerHTML = '<div class="repo-loader"><div class="spinner"></div></div>';
    
    const titleMap = {
        'hub': 'Repository Hub',
        'journals': 'Journal Publications',
        'patents': 'Patents & IP',
        'granted': 'Granted Patents',
        'proposals': 'Project Proposals',
        'consultancy': 'Consultancy Projects',
        'entrepreneur': 'Entrepreneurship & Startups',
        'incentives': 'Research Incentives',
        'students': 'Student Publications'
    };
    
    const title = titleMap[catId] || 'Data Explorer';
    if (viewTitle) viewTitle.innerText = title;
    if (breadcrumb) breadcrumb.innerText = catId.charAt(0).toUpperCase() + catId.slice(1);

    try {
        const response = await fetch(`partials/repo-${catId === 'hub' ? 'hub' : 'category'}.html`);
        if (!response.ok) throw new Error('Partial not found');
        const html = await response.text();
        
        // Brief delay to ensure smooth transition
        setTimeout(async () => {
            contentArea.innerHTML = html;
            
            // Trigger data fetch based on category
            switch(catId) {
                case 'journals': await fetchAndRenderPublications(); break;
                case 'patents': await fetchAndRenderPatents(); break;
                case 'granted': await fetchAndRenderGrantedPatentTargets(); break;
                case 'proposals': await fetchAndRenderProposals(); break;
                case 'consultancy': await fetchAndRenderConsultancy(); break;
                case 'entrepreneur': await fetchAndRenderEntrepreneurship(); break;
                case 'incentives': await fetchAndRenderIncentives(); break;
                case 'students': await fetchAndRenderStudentPubs(); break;
                case 'hub': await refreshHubStats(); break;
            }
        }, 150);
    } catch (err) {
        contentArea.innerHTML = `<div class="error-state">Failed to load ${catId} view. ${err.message}</div>`;
    }
}

async function refreshHubStats() {
    try {
        const response = await fetch('/api/repo-stats');
        const stats = await response.json();
        const mappings = {
            '.hub-total-records': stats.total,
            '.hub-journals-count': stats.journals,
            '.hub-patents-count': stats.patents,
            '.hub-proposals-count': stats.proposals,
            '.hub-consultancy-count': stats.consultancy,
            '.hub-students-count': stats.students
        };

        Object.entries(mappings).forEach(([selector, val]) => {
            const el = document.querySelector(selector);
            if (el) animateValue(el, 0, val, 1000);
        });

        // Update Textual Hub Stats
        const topDeptEl = document.querySelector('.hub-top-dept');
        const topDescEl = document.querySelector('.hub-top-desc');
        const topCountEl = document.querySelector('.hub-top-count');
        const topProgressEl = document.querySelector('.hub-top-progress');
        const lastSyncEl = document.querySelector('.hub-last-sync');
        const lastDateEl = document.querySelector('.hub-last-date');

        if (topDeptEl) topDeptEl.innerText = stats.topDept || 'N/A';
        if (topDescEl) topDescEl.innerText = `${stats.topDept} leads with ${stats.topCount} research contributions.`;
        if (topCountEl) topCountEl.innerText = stats.topCount;
        if (topProgressEl) {
            // Assume 100 is the target/max for visual scaling
            const percentage = Math.min((stats.topCount / 100) * 100, 100);
            setTimeout(() => {
                topProgressEl.style.width = `${percentage}%`;
            }, 500);
        }
        if (lastSyncEl) lastSyncEl.innerText = stats.lastSync;
        if (lastDateEl) lastDateEl.innerText = stats.lastSyncDate;

    } catch (err) { console.error('Hub Stats Error:', err); }
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function applyFilters() {
    const searchTerm = document.getElementById('repo-search-input')?.value.toLowerCase() || '';
    const deptFilter = document.getElementById('filter-dept')?.value || '';

    const filtered = currentData.filter(item => {
        const matchesSearch = Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
        
        const matchesDept = !deptFilter || (item.department && item.department.includes(deptFilter));
        
        return matchesSearch && matchesDept;
    });

    // Removed initCategoryCharts from here to make charts static (performance fix)
    renderTable(filtered);
}

function renderTable(data) {
    if (currentCategory === 'journals') renderPublicationsTable(data);
    else if (currentCategory === 'patents') renderPatentsTable(data);
    else if (currentCategory === 'proposals') renderProposalsTable(data);
    else if (currentCategory === 'consultancy') renderConsultancyTable(data);
    else if (currentCategory === 'entrepreneur') renderEntrepreneurshipTable(data);
    else if (currentCategory === 'incentives') renderIncentivesTable(data);
    else if (currentCategory === 'students') renderStudentPubsTable(data);
    else if (currentCategory === 'granted') renderGrantedTargetsTable(data);
}

function initCategoryCharts(catId, data) {
    if (catId === 'hub') return;

    const ctxDist = document.getElementById('distChart');
    if (!ctxDist) return;

    // Aggregate data
    const distData = {};
    data.forEach(item => {
        const d = item.department || 'Other';
        if (catId === 'granted') {
            const val = parseFloat(String(item.consultancy || 0).replace(/,/g, '')) || 0;
            distData[d] = (distData[d] || 0) + val;
        } else {
            distData[d] = (distData[d] || 0) + 1;
        }
    });

    if (myCharts['dist']) myCharts['dist'].destroy();
    
    // Sort departments by value for a clearer ranking
    const sortedLabels = Object.keys(distData).sort((a, b) => distData[b] - distData[a]);
    const sortedValues = sortedLabels.map(l => distData[l]);

    myCharts['dist'] = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: catId === 'granted' ? 'Consultancy (₹)' : 'Records',
                data: sortedValues,
                backgroundColor: (context) => {
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                    return colors[context.dataIndex % colors.length];
                },
                borderRadius: 6,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 11, weight: '500' }, color: '#64748b' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '700' }, color: '#1e293b' }
                }
            }
        }
    });
}

async function fetchAndRenderPublications() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    try {
        const response = await fetch('/api/publications');
        currentData = await response.json();
        
        initCategoryCharts('journals', currentData);
        renderPublicationsTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch journals: ${err.message}</div>`;
    }
}

function renderPublicationsTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No records found matching your filters.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 180px;">Faculty</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 100px;">Type</th>
                    <th style="width: 35%;">Title of Paper</th>
                    <th class="date-col">Date</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((pub, index) => {
        const safeDate = (pub.date && pub.date !== "N/A") ? pub.date : "Date N/A";
        
        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${pub.faculty || 'N/A'}">${pub.faculty || 'N/A'}</td>
                <td><span class="badge-dept">${pub.department || 'N/A'}</span></td>
                <td><span class="badge-rank" style="background: ${pub.type === 'Journal' ? '#eff6ff' : '#fef2f2'}; color: ${pub.type === 'Journal' ? '#3b82f6' : '#ef4444'};">${pub.type || 'N/A'}</span></td>
                <td class="pub-title" title="${pub.title || 'Untitled'}">${pub.title || 'Untitled'}</td>
                <td class="date-col">${safeDate}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="7">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Involved</label>
                                <span style="white-space: normal; line-height: 1.4;">${(pub.students && pub.students !== "N/A") ? pub.students : "No students listed"}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Journal / Conference Name</label>
                                <span style="white-space: normal; line-height: 1.4;">${pub.journalName || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Ranking (Q1/Q2/SCI)</label>
                                <span class="badge-rank">${pub.ranking || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>WoS Indexed</label>
                                <span>${pub.indexing || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>ISSN / ISBN</label>
                                <span>${pub.issn || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Publication Proof</label>
                                ${pub.link && pub.link !== "N/A" ? `<a href="${pub.link}" target="_blank" class="btn-view-link"><i class="fa-solid fa-external-link"></i> View DOI</a>` : '<span>No link provided</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

// Removed duplicate toggleDetails (moved to end of file)

// Removed duplicate initCategoryCharts (maintained real implementation at line 128)

async function fetchAndRenderPatents() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    try {
        const response = await fetch('/api/patents');
        currentData = await response.json();
        
        initCategoryCharts('patents', currentData);
        renderPatentsTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch patents: ${err.message}</div>`;
    }
}

function renderPatentsTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No records found matching your filters.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 150px;">App No.</th>
                    <th style="width: 200px;">Inventors</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 120px;">Status</th>
                    <th style="width: 35%;">Title</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((pat, index) => {
        const statusStr = String(pat.status || '').toLowerCase();
        const statusColor = statusStr.includes('granted') ? '#10b981' : '#f59e0b';
        const statusBg = statusStr.includes('granted') ? '#d1fae5' : '#fef3c7';

        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold">${pat.appNo || 'N/A'}</td>
                <td style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${pat.inventor || 'N/A'}">${pat.inventor || 'N/A'}</td>
                <td><span class="badge-dept">${pat.department || 'N/A'}</span></td>
                <td><span class="badge-rank" style="background: ${statusBg}; color: ${statusColor};">${pat.status || 'N/A'}</span></td>
                <td class="pub-title" title="${pat.title || 'Untitled'}">${pat.title || 'Untitled'}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="7">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Applicant/s Name</label>
                                <span style="white-space: normal; line-height: 1.4;">${pat.applicant || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Patent Filed Date</label>
                                <span>${pat.filedDate || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Published/Granted Date</label>
                                <span>${pat.pubDate || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Publication Proof</label>
                                ${pat.link && pat.link !== "N/A" ? `<a href="${pat.link}" target="_blank" class="btn-view-link"><i class="fa-solid fa-external-link"></i> View Document</a>` : '<span>No link provided</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

async function fetchAndRenderGrantedPatentTargets() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    try {
        // Fetch Top Table Data
        const topRes = await fetch('/api/granted-patent-targets');
        const topData = await topRes.json();
        
        // Fetch Bottom Table Data
        const bottomRes = await fetch('/api/department-achievements');
        const bottomData = await bottomRes.json();

        initCategoryCharts('granted', bottomData); // Use bottomData for Consultancy chart
        renderGrantedPatentView(topData, bottomData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch granted patent data: ${err.message}</div>`;
    }
}

function renderGrantedPatentView(topData, bottomData) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    let html = `
        <!-- Table 1: Granted Patent Summary -->
        <div class="repo-section-header" style="margin: 30px 0 15px 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-award" style="color: #6366f1;"></i>
            <h3 style="margin: 0; font-size: 1.2rem; color: #1e293b;">Granted Patent Summary</h3>
        </div>
        <table class="repo-table" style="margin-bottom: 40px;">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 200px;">Department</th>
                    <th style="width: 150px;">Student Intake</th>
                    <th style="width: 150px;">Target</th>
                    <th style="width: auto;">Achieved</th>
                </tr>
            </thead>
            <tbody>
    `;

    topData.forEach((item, index) => {
        html += `
            <tr class="main-row">
                <td class="s-no-col">${index + 1}</td>
                <td><span class="badge-dept">${item.department || 'N/A'}</span></td>
                <td>${item.intake || '-'}</td>
                <td class="font-semibold" style="color: #6366f1;">${item.target || '-'}</td>
                <td class="font-semibold" style="color: #10b981;">${item.achieved || '-'}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    // Table 2: Detailed Achievement Overview
    html += `
        <div class="repo-section-header" style="margin: 40px 0 15px 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-chart-line" style="color: #10b981;"></i>
            <h3 style="margin: 0; font-size: 1.2rem; color: #1e293b;">Overall Departmental Achievement Overview</h3>
        </div>
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 150px;">Department</th>
                    <th style="width: 80px;">Faculty</th>
                    <th style="width: 80px;">Confs</th>
                    <th style="width: 80px;">Papers</th>
                    <th style="width: 100px;">Mandatory</th>
                    <th style="width: 100px;">Innovation</th>
                    <th style="width: 100px;">Proposals</th>
                    <th style="width: 110px;">Consultancy</th>
                    <th style="width: 110px;">E-Load</th>
                </tr>
            </thead>
            <tbody>
    `;

    bottomData.forEach((item, index) => {
        const formatCurrency = (val) => {
            const num = parseFloat(String(val).replace(/,/g, '')) || 0;
            return num > 0 ? "₹" + num.toLocaleString('en-IN') : "Nil";
        };

        html += `
            <tr class="main-row">
                <td class="s-no-col">${index + 1}</td>
                <td><span class="badge-dept">${item.department || 'N/A'}</span></td>
                <td style="text-align: center;">${item.facultyCount || 0}</td>
                <td style="text-align: center;">${item.presented || 0}</td>
                <td style="text-align: center;">${item.papers || 0}</td>
                <td style="text-align: center;">${item.mandatoryLoad || 0}</td>
                <td style="text-align: center;">${item.innovationLoad || 0}</td>
                <td style="text-align: center;">${item.proposals || 0}</td>
                <td class="font-semibold" style="color: #10b981;">${formatCurrency(item.consultancy)}</td>
                <td class="font-semibold" style="color: #3b82f6;">${formatCurrency(item.eLoad)}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    listContainer.innerHTML = html;
}


async function fetchAndRenderProposals() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    try {
        const response = await fetch('/api/proposals');
        currentData = await response.json();

        initCategoryCharts('proposals', currentData);
        renderProposalsTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch proposals: ${err.message}</div>`;
    }
}

function renderProposalsTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No records found matching your filters.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 180px;">Faculty</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 35%;">Title of Proposal</th>
                    <th style="width: 140px;">Amount Submitted</th>
                    <th style="width: 120px;">Status</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((prop, index) => {
        const formatCurrency = (val) => {
            const num = parseFloat(String(val).replace(/,/g, '')) || 0;
            return num > 0 ? "₹" + num.toLocaleString('en-IN') : val;
        };

        const statusLower = String(prop.status || '').toLowerCase();
        let statusColor = '#3b82f6';
        let statusBg = '#eff6ff';
        if (statusLower.includes('sanctioned') || statusLower.includes('approved')) {
            statusColor = '#10b981';
            statusBg = '#d1fae5';
        } else if (statusLower.includes('rejected')) {
            statusColor = '#ef4444';
            statusBg = '#fef2f2';
        } else if (statusLower.includes('pending') || statusLower.includes('submitted')) {
            statusColor = '#f59e0b';
            statusBg = '#fef3c7';
        }

        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${prop.faculty}">${prop.faculty || 'N/A'}</td>
                <td><span class="badge-dept">${prop.department || 'N/A'}</span></td>
                <td class="pub-title" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${prop.title}">${prop.title || 'Untitled'}</td>
                <td class="font-semibold">${formatCurrency(prop.submittedAmount)}</td>
                <td><span class="badge-rank" style="background: ${statusBg}; color: ${statusColor};">${prop.status || 'N/A'}</span></td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Expand</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="7">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Application ID</label>
                                <span style="color: #6366f1; font-weight: 600;">${prop.appId || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Agency Name & Type</label>
                                <span style="white-space: normal; line-height: 1.4;">${prop.agency || 'N/A'} (${prop.agencyType || 'N/A'})</span>
                            </div>
                            <div class="dossier-item">
                                <label>Submission Date</label>
                                <span>${prop.date || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Sanctioned / Received</label>
                                <span style="font-weight: 600; color: #10b981;">
                                    Sanctioned: ${formatCurrency(prop.sanctionedAmount)}<br>
                                    Received: ${formatCurrency(prop.receivedAmount || 0)}
                                </span>
                            </div>
                            <div class="dossier-item">
                                <label>Proof / Letter</label>
                                ${prop.link && prop.link !== "N/A" ? `<a href="${prop.link}" target="_blank" class="btn-view-link">View Sanction Order</a>` : '<span>N/A</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

// Removed redundant Proposals fetcher/renderer

async function fetchAndRenderConsultancy() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;
    try {
        const response = await fetch('/api/consultancy');
        currentData = await response.json();
        initCategoryCharts('consultancy', currentData);
        renderConsultancyTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch consultancy: ${err.message}</div>`;
    }
}

function renderConsultancyTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No consultancy records found.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 180px;">Faculty</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 180px;">Funding Agency</th>
                    <th style="width: 30%;">Title of Work</th>
                    <th style="width: 130px;">Amount Generated</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((item, index) => {
        const formatCurrency = (val) => {
            const num = parseFloat(String(val).replace(/,/g, '')) || 0;
            return num > 0 ? "₹" + num.toLocaleString('en-IN') : val;
        };

        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.faculty}">${item.faculty || 'N/A'}</td>
                <td><span class="badge-dept">${item.department || 'N/A'}</span></td>
                <td style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.agency}">${item.agency || 'N/A'}</td>
                <td class="pub-title" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.title}">${item.title || 'Untitled'}</td>
                <td class="font-semibold" style="color: #10b981;">${formatCurrency(item.amount)}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="7">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Month & Year</label>
                                <span>${item.date || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Reg. Amount / Participants</label>
                                <span>Reg: ${item.regAmount || 'N/A'} | Qty: ${item.participants || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Expenses Generated</label>
                                <span style="color: #ef4444;">${formatCurrency(item.expenses)}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Proof / Receipt</label>
                                ${item.link && item.link !== "N/A" ? `<a href="${item.link}" target="_blank" class="btn-view-link"><i class="fa-solid fa-external-link"></i> View Document</a>` : '<span>N/A</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

async function fetchAndRenderEntrepreneurship() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;
    try {
        const response = await fetch('/api/entrepreneurship');
        currentData = await response.json();
        initCategoryCharts('entrepreneur', currentData);
        renderEntrepreneurshipTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch data: ${err.message}</div>`;
    }
}

function renderEntrepreneurshipTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No entrepreneurship records found.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 180px;">Faculty</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 35%;">Startup / Training Program</th>
                    <th style="width: 130px;">Revenue Generated</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((item, index) => {
        const formatCurrency = (val) => {
            const num = parseFloat(String(val).replace(/,/g, '')) || 0;
            return num > 0 ? "₹" + num.toLocaleString('en-IN') : val;
        };

        const displayTitle = item.startup || item.training || 'Untitled';

        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.faculty}">${item.faculty || 'N/A'}</td>
                <td><span class="badge-dept">${item.department || 'N/A'}</span></td>
                <td class="pub-title" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${displayTitle}">${displayTitle}</td>
                <td class="font-semibold" style="color: #10b981;">${formatCurrency(item.revenue)}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="6">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Published / Filed Month</label>
                                <span>${item.date || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Reg. Amount / Participants</label>
                                <span>Reg: ${item.regAmount || 'N/A'} | Qty: ${item.participants || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Expenses Incurred</label>
                                <span style="color: #ef4444;">${formatCurrency(item.expenses)}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Proof / Receipt Link</label>
                                ${item.link && item.link !== "N/A" ? `<a href="${item.link}" target="_blank" class="btn-view-link"><i class="fa-solid fa-external-link"></i> View Record</a>` : '<span>N/A</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

async function fetchAndRenderIncentives() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;
    try {
        const response = await fetch('/api/incentives');
        currentData = await response.json();
        initCategoryCharts('incentives', currentData);
        renderIncentivesTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch incentives.</div>`;
    }
}

function renderIncentivesTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No incentive records found.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 180px;">Faculty</th>
                    <th style="width: 90px;">Dept</th>
                    <th style="width: 40%;">Conference / Workshop</th>
                    <th style="width: 130px;">Incentive Amt</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((item, index) => {
        const formatCurrency = (val) => {
            const num = parseFloat(String(val).replace(/,/g, '')) || 0;
            return num > 0 ? "₹" + num.toLocaleString('en-IN') : val;
        };

        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td class="font-semibold" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.faculty}">${item.faculty || 'N/A'}</td>
                <td><span class="badge-dept">${item.department || 'N/A'}</span></td>
                <td class="pub-title" style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.conference}">${item.conference || 'N/A'}</td>
                <td class="font-semibold" style="color: #10b981;">${formatCurrency(item.amount)}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="6">
                    <div class="pub-dossier">
                        <div class="dossier-grid">
                            <div class="dossier-item">
                                <label>Academic Year</label>
                                <span>${item.year || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Professional Body / Membership</label>
                                <span style="white-space: normal; line-height: 1.4;">${item.professionalBody || 'N/A'}</span>
                            </div>
                            <div class="dossier-item">
                                <label>Incentive Status</label>
                                <span class="badge-rank" style="background: #d1fae5; color: #10b981;">Disbursed</span>
                            </div>
                            <div class="dossier-item">
                                <label>Support Type</label>
                                <span>Conference/Workshop/Membership</span>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

async function fetchAndRenderStudentPubs() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;
    try {
        const response = await fetch('/api/student-pubs');
        currentData = await response.json();
        initCategoryCharts('students', currentData);
        renderStudentPubsTable(currentData);
    } catch (err) {
        listContainer.innerHTML = `<div class="error-state">Failed to fetch student pubs.</div>`;
    }
}

function renderStudentPubsTable(data) {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer || !data) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No student publication records found.</div>';
        return;
    }

    let tableHtml = `
        <table class="repo-table">
            <thead>
                <tr>
                    <th style="width: 60px;">S.No</th>
                    <th style="width: 250px;">Department</th>
                    <th style="width: 150px;">Student Intake</th>
                    <th style="width: 200px;">Target (Pubs)</th>
                    <th style="width: auto;">Achieved</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((item, index) => {
        tableHtml += `
            <tr class="main-row" onclick="toggleDetails(${index})">
                <td class="s-no-col">${index + 1}</td>
                <td><span class="badge-dept" style="font-size: 0.95rem;">${item.department || 'N/A'}</span></td>
                <td>${item.intake || '-'}</td>
                <td class="font-semibold" style="color: #6366f1;">${item.target || '-'}</td>
                <td class="font-semibold" style="color: #10b981;">${item.achieved || '-'}</td>
                <td><button class="btn-expand"><i class="fa-solid fa-chevron-down"></i> Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="6">
                    <div class="pub-dossier" style="background: #f8fafc; border-left: 4px solid #6366f1;">
                        <div style="padding: 10px;">
                            <h4 style="margin-bottom: 5px; color: #1e293b;">Departmental Publication Tracking</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">
                                This record tracks the total publication target vs achievement for final year students.
                            </p>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    listContainer.innerHTML = tableHtml;
}

function toggleDetails(index) {
    const row = document.getElementById(`details-${index}`);
    if (!row) return;
    const btn = row.previousElementSibling.querySelector('.btn-expand i');
    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        if (btn) btn.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        row.style.display = 'none';
        if (btn) btn.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

function handleLogout() {
    window.location.href = '../login.html';
}
