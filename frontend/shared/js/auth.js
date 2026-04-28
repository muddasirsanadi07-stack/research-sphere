/**
 * Authentication & Role Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const roleBtns = document.querySelectorAll('.role-btn');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    let selectedRole = 'faculty'; // Default

    // Function to set role
    const setRole = (role) => {
        selectedRole = role;
        roleBtns.forEach(btn => {
            if (btn.getAttribute('data-role') === role) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        // Auto-fill demo email
        if (emailInput) emailInput.value = `demo@${selectedRole}.com`;
        if (passwordInput) passwordInput.value = 'password123';
    };

    // Handle Role Selection Clicks
    roleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setRole(btn.getAttribute('data-role'));
        });
    });

    // Check for Role in URL (e.g., login.html?role=admin)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam) {
        setRole(roleParam);
    } else {
        setRole('faculty'); // Default initialization
    }

    // Handle Login Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if(email && password) {
            // Provide visual feedback
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
            
            // Save user session data
            const userData = {
                role: selectedRole,
                email: email,
                name: `Demo ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`,
                isLoggedIn: true
            };
            
            localStorage.setItem('researchSphereUser', JSON.stringify(userData));
            
            // Small delay for better UX (feedback)
            setTimeout(() => {
                if (selectedRole === 'admin') {
                    window.location.href = 'admin/dashboard.html';
                } else {
                    window.location.href = 'faculty/dashboard.html';
                }
            }, 600);
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Please enter both email and password.';
        }
    });
});
