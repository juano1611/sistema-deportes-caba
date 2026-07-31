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

    // Botones del menú lateral / navegación movil
    const navItemsForm = document.querySelectorAll('[data-target="form-nuevo-pedido"]');
    const navItemsDirector = document.querySelectorAll('[data-target="director-pedidos-container"]');

    if (user.role === 'DIRECTOR') {
        // Ocultar sección de formulario
        if (formPedidoSection) {
            formPedidoSection.classList.add('hidden');
            formPedidoSection.classList.remove('active');
        }
        
        // Mostrar sección del director
        if (directorSection) {
            directorSection.classList.remove('hidden');
            directorSection.classList.add('active');
            cargarPedidosDirector();
        }

        // Ocultar del menú lateral/móvil los accesos al formulario
        navItemsForm.forEach(item => item.style.display = 'none');
        navItemsDirector.forEach(item => {
            item.style.display = 'block';
            item.classList.add('active');
        });

    } else {
        // Mostrar sección de formulario para docentes
        if (formPedidoSection) {
            formPedidoSection.classList.remove('hidden');
            formPedidoSection.classList.add('active');
        }
        
        // Ocultar sección del director
        if (directorSection) {
            directorSection.classList.add('hidden');
            directorSection.classList.remove('active');
        }

        // Ajustar visibilidad en el menú lateral/móvil
        navItemsForm.forEach(item => {
            item.style.display = 'block';
            item.classList.add('active');
        });
        navItemsDirector.forEach(item => item.style.display = 'none');
    }
}

function initNavigationTabs() {
    const navItems = document.querySelectorAll('.nav-list .nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const storedUser = sessionStorage.getItem('currentUser');
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            const targetId = item.getAttribute('data-target');

            // Bloqueo para evitar que el Director navegue hacia el formulario
            if (currentUser && currentUser.role === 'DIRECTOR' && targetId === 'form-nuevo-pedido') {
                return;
            }

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
                        loginError.textContent = data.msg || 'Error al iniciar sesión';
                        loginError.classList.remove('hidden');
                    }
                    return;
                }

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
                        registerError.textContent = data.msg || 'Error en el registro';
                        registerError.classList.remove('hidden');
                    }
                    return;
                }

                if (registerSuccess) {
                    registerSuccess.textContent = '¡Cuenta registrada correctamente!';
                    registerSuccess.classList.remove('hidden');
                }

                registerForm.reset();

                setTimeout(() => {
                    tabLoginBtn.click();
                    document.getElementById('username').value = dni;
                }, 1200);

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

function initPedidoForm() {
    const pedidoForm = document.getElementById('form-nuevo-pedido');
    const msg = document.getElementById('pedido-msg');

    if (pedidoForm) {
        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            
            if (currentUser.role === 'DIRECTOR') {
                alert('La cuenta de Director no tiene permisos para crear solicitudes.');
                return;
            }

            const nuevoPedido = {
                titulo: document.getElementById('ped-titulo').value,
                areaResponsable: document.getElementById('ped-area').value,
                programa: document.getElementById('ped-programa').value,
                fecha: document.getElementById('ped-fecha').value,
                horario: document.getElementById('ped-horario').value,
                lugar: document.getElementById('ped-lugar').value,
                descripcion: document.getElementById('ped-descripcion').value,
                objetivo: document.getElementById('ped-objetivo').value,
                responsableNombre: document.getElementById('ped-resp-nombre').value,
                responsableDni: currentUser.dni || document.getElementById('ped-resp-dni').value,
                responsableTelefono: document.getElementById('ped-resp-tel').value,
                participantesAprox: parseInt(document.getElementById('ped-part-aprox').value) || 0,
                publicoGeneral: parseInt(document.getElementById('ped-pub-gral').value) || 0,
                ambulancia: document.getElementById('ped-ambulancia').value,
                ambulanciaHorario: document.getElementById('ped-amb-horario').value,
                seguro: document.getElementById('ped-seguro').value,
                extensionArt: document.getElementById('ped-ext-art').value,
                transportePasajeros: document.getElementById('ped-transporte').value,
                articulaciones: document.getElementById('ped-articulaciones').value,
                necesidades: document.getElementById('ped-necesidades').value,
                situacionRevista: document.getElementById('ped-sit-revista').value,
                horarioDocente: document.getElementById('ped-horario-doc').value,
                prensa: document.getElementById('ped-prensa').value,
                tipoDifusion: document.getElementById('ped-difusion').value,
                timingEvento: document.getElementById('ped-timing').value,
                desarmeEvento: document.getElementById('ped-desarme').value,
                suspendeLluvia: document.getElementById('ped-lluvia').value
            };

            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...nuevoPedido })
                });

                const data = await res.json();

                if (res.ok) {
                    if (msg) {
                        msg.textContent = '¡Pedido de evento enviado con éxito!';
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 4000);
                    } else {
                        alert('¡Pedido de evento enviado con éxito!');
                    }
                    pedidoForm.reset();
                } else {
                    alert(data.msg || 'Ocurrió un error al intentar enviar el pedido.');
                }
            } catch (err) {
                console.error("Error al enviar pedido:", err);
                alert('Error de conexión con el servidor.');
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
            lista.innerHTML = '<p class="empty-msg">No hay solicitudes registradas.</p>';
            return;
        }

        lista.innerHTML = pedidos.map(p => `
            <div class="pedido-card">
                <div class="pedido-card-header">
                    <h4>${p.titulo}</h4>
                    <span class="pedido-date">${p.fecha || 'Sin fecha'} (${p.horario || ''})</span>
                </div>
                <p><strong>Sede:</strong> ${p.lugar || '-'}</p>
                <p><strong>Solicitante:</strong> ${p.responsableNombre} (DNI: ${p.responsableDni}) - Tel: ${p.responsableTelefono}</p>
                <p><strong>Participantes:</strong> ${p.participantesAprox} | <strong>Ambulancia:</strong> ${p.ambulancia} | <strong>Lluvia:</strong> ${p.suspendeLluvia}</p>
                ${p.descripcion ? `<p class="pedido-desc">${p.descripcion}</p>` : ''}
            </div>
        `).join('');
    } catch (e) {
        lista.innerHTML = '<p class="error-msg">Error al cargar la lista de solicitudes.</p>';
    }
}

function descargarReportePDF() {
    const elemento = document.getElementById('director-pedidos-container');
    if (!elemento) return;
    
    const opciones = {
        margin:       10,
        filename:     'Reporte_Eventos_DGDSYDD.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opciones).from(elemento).save();
    } else {
        alert('La librería html2pdf no está disponible.');
    }
}