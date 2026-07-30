document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initMobileMenu();
    initAuthEvents();
});

/* ==========================================
   1. NAVEGACIÓN POR PESTAÑAS (TABS)
   ========================================== */
function initNavigationTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            // Remueve clase activa de todas las pestañas
            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activa la pestaña clickeada
            item.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Si está en pantalla celular, cierra el menú lateral al seleccionar una opción
            closeMobileMenu();
        });
    });
}

/* ==========================================
   2. CONTROL DEL MENÚ MÓVIL (DESPLEGABLE)
   ========================================== */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        // Cierra el menú al hacer click afuera (en la sobrecapa)
        overlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

/* ==========================================
   3. EVENTOS DE LOGIN / LOGOUT
   ========================================== */
function initAuthEvents() {
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const loginView = document.getElementById('login-view');
    const portalView = document.getElementById('portal-view');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simulación de login exitoso
            loginView.classList.add('hidden');
            portalView.classList.remove('hidden');
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            portalView.classList.add('hidden');
            loginView.classList.remove('hidden');
            closeMobileMenu();
        });
    }
}