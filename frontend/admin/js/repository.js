/**
 * Research Repository Controller
 * Handles navigation, deep-linking, and category-specific data rendering
 */

document.addEventListener('DOMContentLoaded', () => {
    initRepository();
});

function initRepository() {
    const navItems = document.querySelectorAll('.repo-nav-item');
    const contentArea = document.getElementById('repo-content');
    const viewTitle = document.getElementById('view-title');
    const breadcrumb = document.getElementById('breadcrumb-current');

    // 1. Handle Navigation Clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const category = item.getAttribute('data-category');
            loadCategory(category);
        });
    });

    // 2. Handle Deep-linking (from Dashboard)
    const hash = window.location.hash.substring(1) || 'hub';
    const initialItem = document.querySelector(`[data-category="${hash}"]`) || navItems[0];
    initialItem.click();

    // 3. Load Category View
    async function loadCategory(catId) {
        contentArea.innerHTML = '<div class="repo-loader"><div class="spinner"></div></div>';
        
        // Update Title & Breadcrumb
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
        viewTitle.innerText = title;
        breadcrumb.innerText = catId.charAt(0).toUpperCase() + catId.slice(1);

        try {
            // In a real app, we'd fetch specific data. 
            // For now, we simulate partial loading.
            const response = await fetch(`partials/repo-${catId === 'hub' ? 'hub' : 'category'}.html`);
            if (!response.ok) throw new Error('Partial not found');
            const html = await response.text();
            
            setTimeout(async () => {
                contentArea.innerHTML = html;
                if (catId === 'journals') {
                    await fetchAndRenderPublications();
                }
                initCategoryCharts(catId);
            }, 300); // Smooth transition delay
        } catch (err) {
            contentArea.innerHTML = `<div class="error-state">Failed to load ${catId} data explorer.</div>`;
        }
    }
}

async function fetchAndRenderPublications() {
    const listContainer = document.querySelector('.repo-data-list');
    if (!listContainer) return;

    try {
        const response = await fetch('http://localhost:5005/api/publications');
        const data = await response.json();

        let tableHtml = `
            <table class="repo-table">
                <thead>
                    <tr>
                        <th>Faculty</th>
                        <th>Dept</th>
                        <th>Type</th>
                        <th>Title of Paper</th>
                        <th>Date</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(pub => {
            tableHtml += `
                <tr>
                    <td class="font-semibold">${pub.faculty || 'N/A'}</td>
                    <td><span class="badge-dept">${pub.department || 'N/A'}</span></td>
                    <td>${pub.type}</td>
                    <td class="pub-title">${pub.title || 'Untitled'}</td>
                    <td>${pub.date || 'N/A'}</td>
                    <td><a href="${pub.link}" target="_blank" class="btn-view-link"><i class="fa-solid fa-link"></i> View</a></td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        listContainer.innerHTML = tableHtml;

    } catch (err) {
        listContainer.innerHTML = '<div class="error-msg">Failed to load live publication records.</div>';
    }
}

function initCategoryCharts(catId) {
    // Placeholder for category-specific analytics (e.g., Year-on-Year Growth)
    console.log(`Initializing analytics for: ${catId}`);
}

// Global handle for logout or back to dash
function handleLogout() {
    window.location.href = '../login.html';
}
