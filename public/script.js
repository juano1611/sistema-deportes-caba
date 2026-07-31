document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initMobileMenu();
    initAuthEvents();
    initPedidoForm();
    checkSession();
});

function checkSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
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
    cargarCalendarioEventos();
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
    const formPedidoSection = document.getElementById('form-nuevo-pedido');

    if (user.role === 'DIRECTOR') {
        if (formPedidoSection) formPedidoSection.classList.add('hidden');
        if (directorSection) {
            directorSection.classList.remove('hidden');
            cargarPedidosDirector();
        }
    } else {
        if (formPedidoSection) formPedidoSection.classList.remove('hidden');
        if (directorSection) directorSection.classList.add('hidden');
    }
}

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

            if (targetId === 'tab-calendario') {
                cargarCalendarioEventos();
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
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
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
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');

            const dni = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    loginError.textContent = data.msg || 'Error de autenticación';
                    loginError.classList.remove('hidden');
                    return;
                }

                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                renderUserProfile(data.user);
                applyRolePermissions(data.user);
                showPortal();
            } catch (err) {
                loginError.textContent = 'Error al conectar con el servidor';
                loginError.classList.remove('hidden');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerError.classList.add('hidden');
            registerSuccess.classList.add('hidden');

            const nombre = document.getElementById('reg-nombre').value.trim();
            const dni = document.getElementById('reg-dni').value.trim();
            const password = document.getElementById('reg-password').value.trim();

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, dni, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    registerError.textContent = data.msg || 'Error al registrar';
                    registerError.classList.remove('hidden');
                    return;
                }

                registerSuccess.textContent = 'Registro exitoso. Ahora podés iniciar sesión.';
                registerSuccess.classList.remove('hidden');
                registerForm.reset();
            } catch (err) {
                registerError.textContent = 'Error al conectar con el servidor';
                registerError.classList.remove('hidden');
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            showLogin();
        });
    }
}

function initPedidoForm() {
    const formPedido = document.getElementById('form-nuevo-pedido');
    const msgBox = document.getElementById('pedido-msg');

    if (formPedido) {
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (msgBox) msgBox.classList.add('hidden');

            const nuevoPedido = {
                titulo: document.getElementById('ped-titulo').value.trim(),
                areaResponsable: document.getElementById('ped-area').value.trim(),
                programa: document.getElementById('ped-programa').value.trim(),
                fecha: document.getElementById('ped-fecha').value,
                horario: document.getElementById('ped-horario').value.trim(),
                lugar: document.getElementById('ped-lugar').value.trim(),
                descripcion: document.getElementById('ped-descripcion').value.trim(),
                objetivo: document.getElementById('ped-objetivo').value.trim(),
                responsableNombre: document.getElementById('ped-resp-nombre').value.trim(),
                responsableDni: document.getElementById('ped-resp-dni').value.trim(),
                responsableTelefono: document.getElementById('ped-resp-tel').value.trim(),
                participantesAprox: Number(document.getElementById('ped-part-aprox').value),
                publicoGeneral: Number(document.getElementById('ped-pub-gral').value),
                ambulancia: document.getElementById('ped-ambulancia').value,
                ambulanciaHorario: document.getElementById('ped-amb-horario').value.trim(),
                seguro: document.getElementById('ped-seguro').value.trim(),
                extensionArt: document.getElementById('ped-ext-art').value,
                transportePasajeros: document.getElementById('ped-transporte').value.trim(),
                articulaciones: document.getElementById('ped-articulaciones').value.trim(),
                necesidades: document.getElementById('ped-necesidades').value.trim(),
                situacionRevista: document.getElementById('ped-sit-revista').value.trim(),
                horarioDocente: document.getElementById('ped-horario-doc').value.trim(),
                prensa: document.getElementById('ped-prensa').value,
                tipoDifusion: document.getElementById('ped-difusion').value.trim(),
                timingEvento: document.getElementById('ped-timing').value.trim(),
                desarmeEvento: document.getElementById('ped-desarme').value.trim(),
                suspendeLluvia: document.getElementById('ped-lluvia').value
            };

            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoPedido)
                });

                const data = await res.json();

                if (!res.ok) {
                    alert(data.msg || 'Error al guardar el pedido');
                    return;
                }

                if (msgBox) {
                    msgBox.textContent = '✅ Solicitud enviada correctamente';
                    msgBox.classList.remove('hidden');
                }
                formPedido.reset();
            } catch (err) {
                alert('Error al conectar con el servidor');
            }
        });
    }
}

async function cargarPedidosDirector() {
    const listaContainer = document.getElementById('lista-pedidos');
    if (!listaContainer) return;

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();

        if (pedidos.length === 0) {
            listaContainer.innerHTML = '<p>No hay solicitudes registradas.</p>';
            return;
        }

        listaContainer.innerHTML = pedidos.map(p => `
            <div class="pedido-card">
                <h3>${p.titulo}</h3>
                <p><strong>Fecha:</strong> ${p.fecha} - <strong>Horario:</strong> ${p.horario}</p>
                <p><strong>Lugar:</strong> ${p.lugar}</p>
                <p><strong>Área:</strong> ${p.areaResponsable || 'N/A'}</p>
                <p><strong>Responsable:</strong> ${p.responsableNombre || 'N/A'} (DNI: ${p.responsableDni || 'N/A'}) - Tel: ${p.responsableTelefono || 'N/A'}</p>
                <p><strong>Descripción:</strong> ${p.descripcion || 'Sin descripción'}</p>
            </div>
        `).join('');
    } catch (err) {
        listaContainer.innerHTML = '<p>Error al obtener el historial de solicitudes.</p>';
    }
}

async function cargarCalendarioEventos() {
    // Espacio para renderizar vista de calendario si es requerido
}

function descargarReportePDF() {
    const element = document.getElementById('lista-pedidos');
    if (!element) return;
    
    const opt = {
        margin:       0.5,
        filename:     'reporte-eventos.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}