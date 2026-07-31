document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initMobileMenu();
    initAuthEvents();
    initPedidoForm();
    checkSession();
});

/* ==========================================
   1. CHECK DE SESIÓN Y CONTROL DE PERMISOS
   ========================================== */
function checkSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            // Re-verificación estricta de rol basada en DNI en cliente
            user.role = (user.dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';
            
            renderUserProfile(user);
            applyRolePermissions(user);
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
        badge.textContent = user.role;
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

function applyRolePermissions(user) {
    const directorSection = document.getElementById('director-pedidos-container');
    
    if (user.role === 'DIRECTOR') {
        if (directorSection) {
            directorSection.classList.remove('hidden');
            cargarPedidosDirector();
        }
    } else {
        // SI ES DOCENTE: Se oculta la lista de pedidos cargados
        if (directorSection) {
            directorSection.classList.add('hidden');
        }
    }
}

/* ==========================================
   2. NAVEGACIÓN Y MENÚ
   ========================================== */
function initNavigationTabs() {
    const navItems = document.querySelectorAll('.nav-list .nav-item');
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
   3. EVENTOS DE AUTENTICACIÓN
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
                        loginError.textContent = data.msg || 'Usuario o contraseña incorrectos';
                        loginError.classList.remove('hidden');
                    }
                    return;
                }

                // Asegurar rol estricto
                data.user.role = (data.user.dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';

                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                renderUserProfile(data.user);
                applyRolePermissions(data.user);
                showPortal();

            } catch (err) {
                if (loginError) {
                    loginError.textContent = 'Error de conexión con el servidor';
                    loginError.classList.remove('hidden');
                }
            }
        });
    }

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
                    registerSuccess.textContent = '¡Cuenta creada con éxito en la base de datos!';
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

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            showLogin();
            closeMobileMenu();
        });
    }
}

/* ==========================================
   4. GESTIÓN DE PEDIDOS Y ROL DIRECTOR
   ========================================== */
function initPedidoForm() {
    const pedidoForm = document.getElementById('form-nuevo-pedido');
    const msg = document.getElementById('pedido-msg');

    if (pedidoForm) {
        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

            const nuevoPedido = {
                titulo: document.getElementById('ped-titulo').value,
                areaResponsable: document.getElementById('ped-area').value,
                fecha: document.getElementById('ped-fecha').value,
                lugar: document.getElementById('ped-lugar').value,
                descripcion: document.getElementById('ped-descripcion').value,
                responsableNombre: currentUser.nombre || 'Docente',
                responsableDni: currentUser.dni || ''
            };

            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoPedido)
                });

                if (res.ok) {
                    msg.textContent = '¡Pedido registrado correctamente!';
                    msg.classList.remove('hidden');
                    pedidoForm.reset();

                    if (currentUser.role === 'DIRECTOR') {
                        cargarPedidosDirector();
                    }

                    setTimeout(() => msg.classList.add('hidden'), 3000);
                }
            } catch (err) {
                console.error("Error enviando pedido:", err);
            }
        });
    }
}

async function cargarPedidosDirector() {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();

        if (pedidos.length === 0) {
            lista.innerHTML = '<p class="empty-msg">No hay pedidos registrados en el sistema.</p>';
            return;
        }

        lista.innerHTML = pedidos.map(p => `
            <div class="pedido-card">
                <div class="pedido-card-header">
                    <h4>${p.titulo}</h4>
                    <span class="pedido-date">${p.fecha || 'Sin fecha'}</span>
                </div>
                <p><strong>Lugar:</strong> ${p.lugar || 'No especificado'}</p>
                <p><strong>Área:</strong> ${p.areaResponsable || '-'}</p>
                <p><strong>Solicitante:</strong> ${p.responsableNombre || 'Docente'} (DNI: ${p.responsableDni || '-'})</p>
                ${p.descripcion ? `<p class="pedido-desc">${p.descripcion}</p>` : ''}
            </div>
        `).join('');
    } catch (e) {
        lista.innerHTML = '<p class="error-msg">Error al cargar la lista de pedidos.</p>';
    }
}