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

    // 7. Initialize Stats after partials are ready
    document.addEventListener('partialsLoaded', () => {
        fetchAndPopulateDashboardStats();
    });

    // 8. Listen for View Changes
    let analyticsLoaded = false;
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'admin-analytics-view' && !analyticsLoaded) {
            initAdvancedAnalytics();
            analyticsLoaded = true;
        }
        if (e.detail.viewId === 'admin-achievements-view') {
            initAchievementsView();
        }
    });
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

async function fetchAndPopulateDashboardStats() {
    try {
        const response = await fetch('/api/consolidated-stats');
        const data = await response.json();
        
        // Research Papers
        if (document.getElementById('journalCount')) document.getElementById('journalCount').textContent = data.papers.journal;
        if (document.getElementById('conferenceCount')) document.getElementById('conferenceCount').textContent = data.papers.conference;
        if (document.getElementById('totalPapers')) document.getElementById('totalPapers').textContent = data.papers.total;
        
        // Patents
        if (document.getElementById('patentFiledCount')) document.getElementById('patentFiledCount').textContent = data.patents.filed;
        if (document.getElementById('patentGrantedCount')) document.getElementById('patentGrantedCount').textContent = data.patents.granted;
        if (document.getElementById('totalPatents')) document.getElementById('totalPatents').textContent = data.patents.total;
        
        // Financials
        if (document.getElementById('proposalAmount')) document.getElementById('proposalAmount').textContent = `₹ ${data.financials.sanctioned}`;
        if (document.getElementById('consultancyAmount')) document.getElementById('consultancyAmount').textContent = `₹ ${data.financials.consultancy}`;
        
        // Funding Vault
        if (document.getElementById('msme-value')) document.getElementById('msme-value').textContent = `₹ ${data.vault.msme}`;
        if (document.getElementById('kapila-value')) document.getElementById('kapila-value').textContent = `₹ ${data.vault.kapila}`;
        if (document.getElementById('college-value')) document.getElementById('college-value').textContent = `₹ ${data.vault.college}`;
        if (document.getElementById('vault-total-value')) document.getElementById('vault-total-value').textContent = data.vault.total;
        
        // Quarterly
        if (document.getElementById('q1-value')) document.getElementById('q1-value').textContent = data.quarterly.q1 || "0";
        if (document.getElementById('q2-value')) document.getElementById('q2-value').textContent = data.quarterly.q2 || "0";
        if (document.getElementById('q3-value')) document.getElementById('q3-value').textContent = data.quarterly.q3 || "0";
        if (document.getElementById('q4-value')) document.getElementById('q4-value').textContent = data.quarterly.q4 || "0";
        
    } catch (err) {
        console.error("Error fetching consolidated stats:", err);
    }
}

// ==========================================
// ADVANCED ANALYTICS ENGINE (Chart.js & AI Insights)
// ==========================================
const normalizeDept = (dept) => {
    if (!dept) return 'Unknown';
    const d = String(dept).toUpperCase().trim();
    if (d === 'CHME' || d === 'CHE') return 'CHEMISTRY';
    if (d === 'PHY') return 'PHYSICS';
    if (d === 'MAT') return 'MATHS';
    return d;
};

async function initAdvancedAnalytics() {
    try {
        // 1. Fetch Data Concurrently
        const [consultancyRes, proposalsRes, consolidatedRes, studentRes, targetRes, entRes, milesRes] = await Promise.all([
            fetch('/api/consultancy').catch(() => null),
            fetch('/api/proposals').catch(() => null),
            fetch('/api/consolidated-stats').catch(() => null),
            fetch('/api/student-pubs').catch(() => null),
            fetch('/api/target-achieved').catch(() => null),
            fetch('/api/entrepreneurship').catch(() => null),
            fetch('/api/recent-milestones').catch(() => null)
        ]);

        const consultancyData = consultancyRes && consultancyRes.ok ? await consultancyRes.json() : [];
        const proposalsData = proposalsRes && proposalsRes.ok ? await proposalsRes.json() : [];
        const consolidatedData = consolidatedRes && consolidatedRes.ok ? await consolidatedRes.json() : null;
        const studentData = studentRes && studentRes.ok ? await studentRes.json() : [];
        const targetData = targetRes && targetRes.ok ? await targetRes.json() : null;
        const entData = entRes && entRes.ok ? await entRes.json() : [];
        const milestonesData = milesRes && milesRes.ok ? await milesRes.json() : [];

        // --- Populate Top KPI Cards ---
        if (targetData) {
            if (document.getElementById('kpi-target')) document.getElementById('kpi-target').textContent = targetData.totalTarget.toLocaleString();
            if (document.getElementById('kpi-achieved')) document.getElementById('kpi-achieved').textContent = targetData.totalAchieved.toLocaleString();
            if (document.getElementById('kpi-rate')) document.getElementById('kpi-rate').textContent = `${targetData.achievementRate}%`;
            if (document.getElementById('kpi-top-dept')) document.getElementById('kpi-top-dept').textContent = targetData.topDepartment;
        }

        // --- Heatmap & Smart Insights ---
        const tickerContainer = document.getElementById('smart-insight-ticker');
        const heatmapBody = document.getElementById('heatmap-tbody');
        let insights = [];

        if (targetData && targetData.achievementPercentages) {
            let heatmapHtml = "";
            for (const [dept, metrics] of Object.entries(targetData.achievementPercentages)) {
                
                // Heatmap Color Logic
                const getColor = (val) => {
                    if (val >= 100) return 'background: rgba(16, 185, 129, 0.15); color: #047857; font-weight: bold; border-radius: 4px;';
                    if (val >= 60) return 'background: rgba(245, 158, 11, 0.15); color: #b45309; font-weight: bold; border-radius: 4px;';
                    return 'background: rgba(239, 68, 68, 0.15); color: #b91c1c; font-weight: bold; border-radius: 4px;';
                };

                heatmapHtml += `
                    <tr>
                        <td style="padding: 8px; font-weight: 600; color: #1e293b; text-align: left;">${dept}</td>
                        <td style="padding: 8px;"><div style="padding: 4px; ${getColor(metrics.R)}">${Math.round(metrics.R)}%</div></td>
                        <td style="padding: 8px;"><div style="padding: 4px; ${getColor(metrics.C)}">${Math.round(metrics.C)}%</div></td>
                        <td style="padding: 8px;"><div style="padding: 4px; ${getColor(metrics.P)}">${Math.round(metrics.P)}%</div></td>
                        <td style="padding: 8px;"><div style="padding: 4px; ${getColor(metrics.I)}">${Math.round(metrics.I)}%</div></td>
                        <td style="padding: 8px;"><div style="padding: 4px; ${getColor(metrics.E)}">${Math.round(metrics.E)}%</div></td>
                    </tr>
                `;

                // Smart AI Rules
                if (metrics.R > 120) insights.push(`🟢 ${dept} is exceeding Research (R) targets by ${Math.round(metrics.R - 100)}% — share their strategy!`);
                if (metrics.E < 10) insights.push(`🔴 ${dept} has critically low Entrepreneurship (E) conversion (${Math.round(metrics.E)}%) — intervention required.`);
                if (metrics.P > 100 && metrics.C < 50) insights.push(`🟡 ${dept} has strong IP but weak consultancy — suggest commercializing patents.`);
            }
            if (heatmapBody) heatmapBody.innerHTML = heatmapHtml;
        }

        // Proposal Insights
        let rejectedProps = 0;
        let ubaGrants = 0;
        proposalsData.forEach(p => {
            const status = String(p.status || "").toLowerCase();
            if (status.includes("reject")) rejectedProps++;
            if (String(p.agencyName || "").toLowerCase().includes("uba") && status.includes("grant")) ubaGrants++;
        });
        
        if (proposalsData.length > 0) {
            const rejectRate = Math.round((rejectedProps / proposalsData.length) * 100);
            if (rejectRate > 50) insights.push(`🔴 Proposal rejection rate is high (${rejectRate}%). Consider faculty grant-writing workshops.`);
            if (ubaGrants > 0) insights.push(`🟢 UBA is currently your most successful funding agency (${ubaGrants} grants).`);
        }

        // Render Ticker
        if (tickerContainer && insights.length > 0) {
            // Duplicate array to make scrolling seamless
            const displayInsights = [...insights, ...insights];
            tickerContainer.innerHTML = displayInsights.map(i => `<span style="margin-right: 40px;">${i}</span>`).join('');
        }

        // --- Interactive Department Viewer Logic ---
        const deptSelector = document.getElementById('dept-selector');
        const deptDataView = document.getElementById('dept-data-view');
        const deptPlaceholder = document.getElementById('dept-placeholder-msg');

        if (deptSelector && targetData && targetData.deptScores) {
            // Populate Dropdown
            let optionsHtml = '<option value="">Select Department...</option>';
            for (const dept of Object.keys(targetData.deptScores)) {
                if(dept.toLowerCase() !== 'total') {
                    optionsHtml += `<option value="${dept}">${dept}</option>`;
                }
            }
            deptSelector.innerHTML = optionsHtml;

            // Handle Selection
            deptSelector.addEventListener('change', (e) => {
                const selectedDept = e.target.value;
                if (!selectedDept) {
                    deptDataView.style.display = 'none';
                    deptPlaceholder.style.display = 'block';
                    return;
                }

                // Show data view
                deptDataView.style.display = 'block';
                deptPlaceholder.style.display = 'none';

                // Get Data
                const scores = targetData.deptScores[selectedDept];
                const percs = targetData.achievementPercentages ? targetData.achievementPercentages[selectedDept] : null;

                // Overall calculations
                const tgt = scores ? scores.target : 0;
                const ach = scores ? scores.achieved : 0;
                const rate = tgt > 0 ? Math.round((ach / tgt) * 100) : 0;

                // Update UI Elements
                document.getElementById('dept-view-name').textContent = selectedDept;
                document.getElementById('dept-view-target').textContent = tgt.toFixed(1);
                document.getElementById('dept-view-achieved').textContent = ach.toFixed(1);
                document.getElementById('dept-overall-rate').textContent = `${rate}%`;

                // Update Ring Color based on rate
                const ringColor = rate >= 100 ? '#10b981' : (rate >= 60 ? '#f59e0b' : '#ef4444');
                document.getElementById('dept-overall-rate').parentElement.parentElement.style.background = `conic-gradient(${ringColor} 0%, ${ringColor} ${rate}%, #e2e8f0 ${rate}%, #e2e8f0 100%)`;
                document.getElementById('dept-overall-rate').style.color = ringColor;

                // Update RCPIE percentages
                if (percs) {
                    const updateMetric = (id, val) => {
                        const el = document.getElementById(id);
                        if(el) {
                            el.textContent = `${Math.round(val)}%`;
                            el.style.color = val >= 100 ? '#10b981' : (val >= 60 ? '#f59e0b' : '#ef4444');
                        }
                    };
                    updateMetric('dept-val-r', percs.R);
                    updateMetric('dept-val-c', percs.C);
                    updateMetric('dept-val-p', percs.P);
                    updateMetric('dept-val-i', percs.I);
                    updateMetric('dept-val-e', percs.E);
                }
            });
        }

        // --- Chart 1: Financial Health (Modern Area Stream) ---
        const finCtx = document.getElementById('financialHealthChart');
        if (finCtx) {
            const deptFinance = {};
            consultancyData.forEach(c => {
                const dept = normalizeDept(c.department);
                if (!deptFinance[dept]) deptFinance[dept] = { rev: 0, prop: 0 };
                deptFinance[dept].rev += parseFloat(String(c.amount).replace(/[^0-9.-]+/g, "")) || 0;
            });
            proposalsData.forEach(p => {
                const dept = normalizeDept(p.department);
                if (!deptFinance[dept]) deptFinance[dept] = { rev: 0, prop: 0 };
                deptFinance[dept].prop += parseFloat(String(p.sanctionedAmount).replace(/[^0-9.-]+/g, "")) || 0;
            });

            const labels = Object.keys(deptFinance).filter(d => d !== 'Unknown' && (deptFinance[d].rev > 0 || deptFinance[d].prop > 0));
            const revData = labels.map(d => deptFinance[d].rev);
            const propData = labels.map(d => deptFinance[d].prop);

            const gradient1 = finCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gradient1.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
            gradient1.addColorStop(1, 'rgba(16, 185, 129, 0)');

            const gradient2 = finCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gradient2.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
            gradient2.addColorStop(1, 'rgba(99, 102, 241, 0)');

            new Chart(finCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Consultancy Flow (₹)',
                            data: revData,
                            fill: true,
                            backgroundColor: gradient1,
                            borderColor: '#10b981',
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#10b981'
                        },
                        {
                            label: 'Proposals Flow (₹)',
                            data: propData,
                            fill: true,
                            backgroundColor: gradient2,
                            borderColor: '#6366f1',
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#6366f1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', align: 'end' },
                        tooltip: { backgroundColor: '#1e293b', padding: 12 }
                    },
                    scales: {
                        y: { 
                            type: 'logarithmic',
                            beginAtZero: false, 
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { 
                                callback: function(value, index, values) {
                                    if (value === 10 || value === 100 || value === 1000 || value === 10000 || value === 100000 || value === 1000000 || value === 10000000) {
                                        return '₹' + (value >= 100000 ? (value/100000).toFixed(0) + 'L' : (value/1000).toFixed(0) + 'k');
                                    }
                                    return null;
                                }
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // --- Live Milestone Feed Population ---
        const feedContainer = document.getElementById('live-milestone-feed');
        if (feedContainer && milestonesData && milestonesData.length > 0) {
            let html = '';
            milestonesData.forEach(m => {
                html += `
                    <div style="flex: 0 0 auto; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.85rem; color: #475569; display: flex; align-items: center; gap: 10px; cursor: default; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: ${m.color}15; color: ${m.color}; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid ${m.icon}"></i>
                        </div>
                        <div>
                            <span style="font-weight: 700; color: #1e293b; margin-right: 5px;">${m.dept}</span> 
                            ${m.text}
                        </div>
                    </div>
                `;
            });
            feedContainer.innerHTML = html;
        } else if (feedContainer) {
            feedContainer.innerHTML = `<div style="font-size: 0.85rem; color: #94a3b8; padding: 10px;">Waiting for new milestones...</div>`;
        }

        // --- Chart 2: Departmental Radar ---
        const radarCtx = document.getElementById('deptRadarChart');
        if (radarCtx && targetData && targetData.achievementPercentages) {
            const depts = Object.keys(targetData.achievementPercentages).slice(0, 5); // Top 5
            
            const rScores = depts.map(d => targetData.achievementPercentages[d].R || 0);
            const pScores = depts.map(d => targetData.achievementPercentages[d].P || 0);
            const fScores = depts.map(d => targetData.achievementPercentages[d].E || 0);

            new Chart(radarCtx, {
                type: 'radar',
                data: {
                    labels: depts,
                    datasets: [
                        {
                            label: 'Research Output (R %)',
                            data: rScores,
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            borderColor: '#6366f1',
                            pointBackgroundColor: '#6366f1'
                        },
                        {
                            label: 'Patents (P %)',
                            data: pScores,
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            borderColor: '#f59e0b',
                            pointBackgroundColor: '#f59e0b'
                        },
                        {
                            label: 'Entrepreneurship (E %)',
                            data: fScores,
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            borderColor: '#10b981',
                            pointBackgroundColor: '#10b981'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    elements: { line: { tension: 0.3 } }
                }
            });
        }

        // --- Chart 3: Proposal Funnel (Doughnut style representation) ---
        const funnelCtx = document.getElementById('proposalFunnelChart');
        if (funnelCtx && proposalsData.length > 0) {
            let submitted = proposalsData.length;
            let rejected = 0;
            let sanctioned = 0;
            let pending = 0;

            proposalsData.forEach(p => {
                const status = String(p.status || "").toLowerCase();
                if (status.includes("reject")) rejected++;
                else if (status.includes("sanction") || status.includes("grant")) sanctioned++;
                else pending++;
            });

            new Chart(funnelCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Rejected', 'Pending', 'Sanctioned'],
                    datasets: [{
                        data: [rejected, pending, sanctioned],
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: { 
                        legend: { position: 'bottom' },
                        title: { display: true, text: `Total Submitted: ${submitted}` }
                    }
                }
            });
        }

        // --- Chart 4: Top Consultancy/Startup Stars (Polar Area) ---
        const polarCtx = document.getElementById('startupPolarChart');
        if (polarCtx) {
            // Combine both datasets
            const combined = [];
            
            consultancyData.forEach(c => {
                const amt = parseFloat(String(c.amount).replace(/[^0-9.-]+/g, "")) || 0;
                if (amt > 0) combined.push({ name: String(c.faculty || "Unknown").split(' ')[0], amount: amt, type: 'Consultancy' });
            });

            entData.forEach(e => {
                const amt = parseFloat(String(e.revenue).replace(/[^0-9.-]+/g, "")) || 0;
                if (amt > 0) combined.push({ name: e.faculty.split(' ')[0], amount: amt, type: 'Startup' });
            });

            const sorted = combined.sort((a, b) => b.amount - a.amount).slice(0, 5);

            const labels = sorted.map(s => `${s.name} (${s.type})`);
            const data = sorted.map(s => s.amount);

            new Chart(polarCtx, {
                type: 'polarArea',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(236, 72, 153, 0.7)',
                            'rgba(99, 102, 241, 0.7)',
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(14, 165, 233, 0.7)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

    } catch (err) {
        console.error("Error initializing advanced analytics:", err);
    }
}
