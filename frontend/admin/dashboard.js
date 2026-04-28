/**
 * Main Dashboard Controller - Shell Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if user is logged in
    const userDataStr = localStorage.getItem('researchSphereUser');
    
    if (!userDataStr) {
        window.location.href = '../login.html';
        return;
    }

    const userData = JSON.parse(userDataStr);
    
    // 2. Apply Role Class to Body
    document.body.classList.add(`role-${userData.role}`);
    document.documentElement.setAttribute('data-user-role', userData.role);

    // 3. Populate User Info
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');
    
    if (userNameEl) userNameEl.textContent = userData.name;
    if (userRoleEl) userRoleEl.textContent = userData.role;
    if (userAvatarEl) userAvatarEl.textContent = userData.name.charAt(0).toUpperCase();

    // 3. Handle Sidebar Navigation (View Switching)
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardViews = document.querySelectorAll('.dashboard-view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            e.preventDefault();

            // Update Active Nav Item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch Views
            dashboardViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) {
                    view.classList.add('active');
                    // Trigger a view-specific refresh if needed
                    document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
                }
            });
        });
    });

    // 4. Handle Sidebar Toggle
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.replace('fa-bars', 'fa-indent');
            } else {
                icon.classList.replace('fa-indent', 'fa-bars');
            }
        });
    }

    // 5. Handle Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('researchSphereUser');
            window.location.href = '../login.html';
        });
    }

    // 6. Load Modular Partials
    loadPartials();
});

async function loadPartials() {
    const views = {
        'home-content-container': 'partials/home.html',
        'achievements-content-container': 'partials/achievements.html',
        'analytics-content-container': 'partials/analytics.html',
        'manage-content-container': 'partials/manage.html',
        'settings-content-container': 'partials/settings.html'
    };

    const loadTasks = Object.entries(views).map(async ([id, path]) => {
        const container = document.getElementById(id);
        if (container) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const html = await response.text();
                    container.innerHTML = html;
                }
            } catch (err) {
                console.error(`Error loading ${path}:`, err);
            }
        }
    });

    await Promise.all(loadTasks);
    
    // Dispatch event so view-specific scripts know the DOM is ready
    document.dispatchEvent(new CustomEvent('partialsLoaded'));
}
