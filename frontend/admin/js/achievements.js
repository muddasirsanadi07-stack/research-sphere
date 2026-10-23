/**
 * Achievements View Controller
 * Fetches and populates the institutional achievements metrics
 */

async function initAchievementsView() {
    console.log("Initializing Achievements View...");
    try {
        const response = await fetch('/api/achievement-stats');
        if (!response.ok) throw new Error("Failed to fetch achievement stats");
        
        const data = await response.json();
        
        // Update Card Values
        updateElement('ach-journal-count', data.journals);
        updateElement('ach-patent-count', data.patents);
        updateElement('ach-granted-count', data.granted);
        updateElement('ach-proposal-count', data.proposals);
        updateElement('ach-proposal-sanctioned', data.proposalsSanctioned);
        updateElement('ach-consultancy-count', data.consultancy);
        updateElement('ach-ent-count', data.entrepreneurship);
        updateElement('ach-incentive-count', data.incentives);
        updateElement('ach-student-count', data.students);
        
    } catch (err) {
        console.error("Error populating achievements:", err);
    }
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
        // Handle numbers with thousands separator
        el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        
        // Add a small pulse animation
        el.classList.add('value-updated');
        setTimeout(() => el.classList.remove('value-updated'), 1000);
    }
}

// Global hook if needed
window.refreshAchievements = initAchievementsView;
