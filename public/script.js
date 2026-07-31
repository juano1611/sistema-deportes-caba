document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initMobileMenu();
    initAuthEvents();
    checkSession();
});

/* ==========================================
   1. CHECK DE SESIÓN AL CARGAR
   ========================================== */
function checkSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            renderUserProfile(user);
            showPortal();
        } catch (e) {
            sessionStorage.removeItem('currentUser');
            showLogin();
        }
    } else {
        showLogin();
    }
}

function showPortal() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('portal-view').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('portal-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
}

function renderUserProfile(user) {
    const badge = document.getElementById('user-badge');
    const nameSpan = document.getElementById('user-name');

    if (badge) {
        badge.textContent = user.role || 'DOCENTE';
        if (user.role === 'DIRECTOR') {
            badge.classList.add('badge-director');
        } else {
            badge.classList.remove('badge-director');
        }
    }
    if (nameSpan) {
        nameSpan.textContent = user.nombre || `DNI: ${user.dni}`;
    }
}

/* ==========================================
   2. NAVEGACIÓN POR PESTAÑAS
   ========================================== */
function initNavigationTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            item.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            closeMobileMenu();
        });
    });
}

/* ==========================================
   3. CONTROL DEL MENÚ MÓVIL
   ========================================== */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu(e) {
        if (e) e.stopPropagation();
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMobileMenu);
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

/* ==========================================
   4. EVENTOS DE LOGIN / REGISTRO / LOGOUT REALES
   ========================================== */
function initAuthEvents() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const btnLogout = document.getElementById('btn-logout');

    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    // Cambiar entre pestañas Login / Registro
    if (tabLoginBtn && tabRegisterBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            if (loginError) loginError.classList.add('hidden');
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            if (registerError) registerError.classList.add('hidden');
            if (registerSuccess) registerSuccess.classList.add('hidden');
        });
    }

    // FORMULARIO DE LOGIN REAL AL BACKEND
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginError) loginError.classList.add('hidden');

            const dni = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    if (loginError) {
                        loginError.textContent = data.msg || 'Error al iniciar sesión';
                        loginError.classList.remove('hidden');
                    }
                    return;
                }

                // Guardar usuario en sesión con el rol real que trae la BD
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                renderUserProfile(data.user);
                showPortal();

            } catch (err) {
                if (loginError) {
                    loginError.textContent = 'Error de conexión con el servidor';
                    loginError.classList.remove('hidden');
                }
            }
        });
    }

    // FORMULARIO DE REGISTRO REAL AL BACKEND
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (registerError) registerError.classList.add('hidden');
            if (registerSuccess) registerSuccess.classList.add('hidden');

            const nombre = document.getElementById('reg-nombre').value.trim();
            const dni = document.getElementById('reg-dni').value.trim();
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, dni, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    if (registerError) {
                        registerError.textContent = data.msg || 'Error al registrar usuario';
                        registerError.classList.remove('hidden');
                    }
                    return;
                }

                if (registerSuccess) {
                    registerSuccess.textContent = '¡Registro exitoso! Ya podés iniciar sesión.';
                    registerSuccess.classList.remove('hidden');
                }

                registerForm.reset();

                setTimeout(() => {
                    tabLoginBtn.click();
                    document.getElementById('username').value = dni;
                }, 1500);

            } catch (err) {
                if (registerError) {
                    registerError.textContent = 'Error de conexión con el servidor';
                    registerError.classList.remove('hidden');
                }
            }
        });
    }

    // BOTÓN CERRAR SESIÓN
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            showLogin();
            closeMobileMenu();
        });
    }
}