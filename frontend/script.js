// ResearchSphere Landing Page Scripts

document.addEventListener('DOMContentLoaded', () => {

    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 2. Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        };

        const revealObserver = new IntersectionObserver(revealCallback, {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // 3. Preloader Handling
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => preloader.remove(), 600);
        }
    });

    // 4. Load Stats from Backend
    loadStats();
});


/**
 * Fetch stats from backend (MongoDB)
 */
async function loadStats() {
    const pubEl = document.getElementById("pubCount");
    const grantEl = document.getElementById("grantCount");
    const innovationEl = document.getElementById("innovationScore");

    // Ensure elements exist
    if (!pubEl || !grantEl || !innovationEl) return;

    try {
        const response = await fetch("http://localhost:5000/api/stats");

        if (!response.ok) throw new Error("API not responding");

        const data = await response.json();

        // Animate numbers with "+"
        animateValue(pubEl, 0, data.publications, 1000, "+");
        animateValue(grantEl, 0, data.grants, 1000, "+");

        // Innovation (percentage)
        innovationEl.innerText = `${data.innovation}%`;

    } catch (err) {
        console.warn("⚠️ Using fallback stats (API not reachable)", err);

        // Fallback values
        pubEl.innerText = "150+";
        grantEl.innerText = "40+";
        innovationEl.innerText = "90%";
    }
}


/**
 * Animate numbers smoothly
 */
function animateValue(element, start, end, duration, suffix = "") {
    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;

        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);

        element.innerText = value + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };

    window.requestAnimationFrame(step);
}