/**
 * Home View Logic - Local Excel Data Binding & Inline Editing
 */

function startHomeLogic() {
    console.log("Home Logic Starting (Excel Mode)...");
    if (document.getElementById('targetVsAchievementChart')) {
        initHomeCharts();
    }
    fetchLocalData();
}

document.addEventListener('partialsLoaded', startHomeLogic);
if (document.getElementById('journalCount')) startHomeLogic();

async function fetchLocalData() {
    try {
        const response = await fetch('/api/consolidated-stats');
        const data = await response.json();
        
        // Map Nested Stats to UI
        const mappings = {
            'journalCount': data.papers.journal,
            'conferenceCount': data.papers.conference,
            'totalPapers': data.papers.total,
            'patentFiledCount': data.patents.filed,
            'patentGrantedCount': data.patents.granted,
            'proposalAmount': data.financials.sanctioned,
            'consultancyAmount': data.financials.consultancy,
            'msme-value': data.vault.msme,
            'kapila-value': data.vault.kapila,
            'college-value': data.vault.college,
            'vault-total-value': data.vault.total,
            'q1-value': data.quarterly.q1,
            'q2-value': data.quarterly.q2,
            'q3-value': data.quarterly.q3,
            'q4-value': data.quarterly.q4
        };

        Object.entries(mappings).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) {
                const isLakhs = id.toLowerCase().includes('amount') || id.toLowerCase().includes('value');
                el.innerText = val + (isLakhs && !String(val).includes('₹') ? " L" : "");
            }
        });
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

function getElementIdForMetric(metric) {
    const map = {
        'Journal': 'journalCount',
        'Conference': 'conferenceCount',
        'Total': 'totalPapers', // Note: Simple mapping, can be refined
        'Filed/Published': 'patentFiledCount',
        'Granted': 'patentGrantedCount',
        'Total Amount': 'proposalAmount',
        'College Recv': 'college-value',
        'Received Amount': 'consultancyAmount',
        'E-load Amount': 'eloadAmount',
        'Q1': 'q1-value',
        'Q2': 'q2-value',
        'Q3': 'q3-value',
        'Q4': 'q4-value'
    };
    return map[metric];
}

function makeEditable(el) {
    if (el.querySelector('input')) return;

    const originalValue = el.innerText.replace(" L", "");
    const input = document.createElement('input');
    input.type = 'number';
    input.value = originalValue;
    input.style.width = "60px";
    input.style.padding = "2px";
    input.style.borderRadius = "4px";
    input.style.border = "1px solid #7c6af7";

    el.innerText = "";
    el.appendChild(input);
    input.focus();

    input.onblur = () => cancelEdit(el, originalValue);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') saveEdit(el, input.value);
        if (e.key === 'Escape') cancelEdit(el, originalValue);
    };
}

async function saveEdit(el, newValue) {
    const category = el.dataset.category;
    const metric = el.dataset.metric;
    const unit = el.dataset.unit;

    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, metric, newValue })
        });

        if (response.ok) {
            el.innerText = newValue + (unit === 'Lakhs' ? " L" : "");
            showToast(`Updated ${metric} to ${newValue}`);
        }
    } catch (err) {
        console.error("Save Error:", err);
    }
}

function cancelEdit(el, originalValue) {
    const unit = el.dataset.unit;
    el.innerText = originalValue + (unit === 'Lakhs' ? " L" : "");
}

function showToast(msg) {
    console.log("TOAST:", msg);
    // You can add a visual toast notification here later
}

// ... initHomeCharts function remains the same ...
function initHomeCharts() { /* ... Chart logic ... */ }
