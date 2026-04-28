/**
 * Analytics Controller for RCPIE Achievement Analysis
 */

// Wait for partials to be loaded by the main dashboard controller
document.addEventListener('partialsLoaded', () => {
    // Only initialize if we are on the analytics view or if elements exist
    if (document.getElementById('rcpieBarChart')) {
        initRCPIECharts();
    }
});

function initRCPIECharts() {
    // 1. Target vs Achievement (Grouped Bar Chart)
    const rcpieCtx = document.getElementById('rcpieBarChart').getContext('2d');
    new Chart(rcpieCtx, {
        type: 'bar',
        data: {
            labels: ['R', 'C', 'P', 'I', 'E', 'M Paper', 'M Patent'],
            datasets: [
                {
                    label: 'Target',
                    data: [200, 180, 150, 100, 250, 80, 50],
                    backgroundColor: '#cbd5e1', // Light slate for target
                    borderRadius: 6,
                    barPercentage: 0.8,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Achieved',
                    data: [185, 160, 95, 120, 140, 75, 20],
                    backgroundColor: '#7c6af7', // Brand purple for achievement
                    borderRadius: 6,
                    barPercentage: 0.8,
                    categoryPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { usePointStyle: true, padding: 20, font: { weight: '600' } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)', borderDash: [5, 5] }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // 2. Department Ranking (Horizontal Bar Chart)
    const deptCtx = document.getElementById('deptRankChart').getContext('2d');
    new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: [
                'AIML (118%)', 'CSE (110%)', 'ISE (102%)', 'AIDS (101%)', 
                'MAT (92%)', 'MCA (88%)', 'ECE (82%)', 'EEE (80%)', 
                'MBA (78%)', 'PHY (75%)', 'CHE (72%)', 'ME (65%)', 
                'Total (88%)'
            ],
            datasets: [{
                label: 'Achievement %',
                data: [118, 110, 102, 101, 92, 88, 82, 80, 78, 75, 72, 65, 88],
                backgroundColor: (context) => {
                    const val = context.dataset.data[context.dataIndex];
                    if (val >= 90) return '#10b981'; // Green
                    if (val >= 75) return '#f59e0b'; // Yellow
                    return '#ef4444'; // Red
                },
                borderRadius: 8,
                barThickness: 18
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    max: 130,
                    grid: { color: 'rgba(0,0,0,0.05)', borderDash: [5, 5] },
                    ticks: { callback: value => value + '%' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { weight: '700', size: 10 } }
                }
            }
        }
    });
}
