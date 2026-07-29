const API_BASE_URL = '/api';
let authUser = JSON.parse(localStorage.getItem('ba_sport_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initAuthToggles();
    initFormEvents();
    
    if (authUser) {
        renderPortalView();
    } else {
        showLoginView();
    }
});

// NAVEGACIÓN ENTRE SECCIONES
function initNavigationTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// ALTERNAR ENTRE LOGIN Y REGISTRO
function initAuthToggles() {
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }
}

// MANEJO DE EVENTOS
function initFormEvents() {
    // Iniciar Sesión
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dni = document.getElementById('login-dni').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni, password })
                });
                const data = await response.json();

                if (response.ok) {
                    authUser = data.user;
                    localStorage.setItem('ba_sport_user', JSON.stringify(authUser));
                    renderPortalView();
                } else {
                    alert(data.msg || 'Credenciales incorrectas');
                }
            } catch (err) {
                alert('Error de conexión con el servidor backend.');
            }
        });
    }

    // Registro de Usuario
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value;
            const dni = document.getElementById('reg-dni').value;
            const password = document.getElementById('reg-password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, dni, password })
                });
                const data = await response.json();

                if (response.ok) {
                    alert('¡Registro exitoso! Ya podés iniciar sesión.');
                    registerForm.reset();
                    document.getElementById('show-login').click();
                } else {
                    alert(data.msg || 'Error al registrar usuario.');
                }
            } catch (err) {
                alert('Error al conectar con el servidor.');
            }
        });
    }

    // Cerrar Sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('ba_sport_user');
            authUser = null;
            showLoginView();
        });
    }

    // Enviar Pedido de Evento
    const formPedido = document.getElementById('form-pedido');
    if (formPedido) {
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                titulo: document.getElementById('p-titulo').value,
                areaResponsable: document.getElementById('p-area').value,
                programa: document.getElementById('p-programa').value,
                fecha: document.getElementById('p-fecha').value,
                horario: document.getElementById('p-horario').value,
                lugar: document.getElementById('p-lugar').value,
                descripcion: document.getElementById('p-descripcion').value,
                responsableNombre: document.getElementById('p-resp-nombre').value,
                responsableDni: document.getElementById('p-resp-dni').value,
                responsableTelefono: document.getElementById('p-resp-tel').value,
                objetivo: document.getElementById('p-objetivo').value,
                participantesAprox: document.getElementById('p-cant-part').value,
                publicoGeneral: document.getElementById('p-publico').value,
                articulaciones: document.getElementById('p-articulaciones').value,
                necesidades: document.getElementById('p-necesidades').value,
                transportePasajeros: document.getElementById('p-transporte').value,
                ambulancia: document.getElementById('p-ambulancia').value,
                ambulanciaHorario: document.getElementById('p-ambulancia-horario').value,
                seguro: document.getElementById('p-seguro').value,
                extensionArt: document.getElementById('p-art').value,
                situacionRevista: document.getElementById('p-revista').value,
                horarioDocente: document.getElementById('p-horario-docente').value,
                prensa: document.getElementById('p-prensa').value,
                tipoDifusion: document.getElementById('p-difusion').value,
                timingEvento: document.getElementById('p-timing').value,
                desarmeEvento: document.getElementById('p-desarme').value,
                suspendeLluvia: document.getElementById('p-lluvia').value,
            };

            try {
                const res = await fetch(`${API_BASE_URL}/pedidos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert('¡Solicitud guardada con éxito en la base de datos!');
                    formPedido.reset();
                    loadPedidosData();
                }
            } catch (err) {
                alert('Error al registrar la solicitud.');
            }
        });
    }

    // Exportar PDF
    const btnPdf = document.getElementById('btn-descargar-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            const elemento = document.getElementById('pdf-export-area');
            const headerPdf = elemento.querySelector('.pdf-only-header');
            if (headerPdf) headerPdf.style.display = 'block';

            const opt = {
                margin:       10,
                filename:     'Reporte_Requerimientos_DGDSYDD.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            html2pdf().from(elemento).set(opt).save().then(() => {
                if (headerPdf) headerPdf.style.display = 'none';
            });
        });
    }
}

// CONTROL DE VISTAS
function showLoginView() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('portal-container').classList.add('hidden');
}

function renderPortalView() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('portal-container').classList.remove('hidden');

    const badge = document.getElementById('user-badge');
    badge.innerText = authUser.role;
    document.getElementById('user-name').innerText = authUser.nombre;

    if (authUser.role === 'DIRECTOR') {
        badge.className = "badge director";
        document.getElementById('director-view-container').classList.remove('hidden');
        document.getElementById('form-docente-container').classList.add('hidden');
    } else {
        badge.className = "badge";
        document.getElementById('director-view-container').classList.add('hidden');
        document.getElementById('form-docente-container').classList.remove('hidden');
    }

    loadPedidosData();
}

// CARGA DE DATOS DESDE BASE DE DATOS SQLITE
async function loadPedidosData() {
    try {
        const response = await fetch(`${API_BASE_URL}/pedidos`);
        const listado = await response.json();

        const tbody = document.getElementById('table-pedidos-body');
        tbody.innerHTML = '';
        
        const calendarContainer = document.getElementById('calendar-list-container');
        calendarContainer.innerHTML = '';

        if (!listado || listado.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay solicitudes registradas en la base de datos.</td></tr>`;
            calendarContainer.innerHTML = `<p class="placeholder-box">No hay eventos activos en la base de datos.</p>`;
            return;
        }

        listado.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.titulo}</strong><br><small style="color:#64748B;">${item.areaResponsable} - ${item.programa}</small></td>
                <td>${item.fecha} (${item.horario})<br><strong>Lugar:</strong> ${item.lugar}</td>
                <td>${item.responsableNombre}<br><small>DNI: ${item.responsableDni}<br>Tel: ${item.responsableTelefono}</small></td>
                <td style="color:#DC2626; font-weight:600;">${item.necesidades}</td>
                <td>
                    Ambulancia: ${item.ambulancia} (${item.ambulanciaHorario || 'N/C'})<br>
                    Seguro: ${item.seguro} | ART: ${item.extensionArt}
                </td>
                <td><strong>${item.suspendeLluvia}</strong></td>
            `;
            tbody.appendChild(tr);

            const calCard = document.createElement('div');
            calCard.className = 'calendar-card';
            calCard.innerHTML = `
                <h4>📅 ${item.fecha} - ${item.titulo}</h4>
                <p style="font-size:0.9rem; margin-top:4px;"><strong>Lugar:</strong> ${item.lugar} | <strong>Horario:</strong> ${item.horario} hs</p>
                <p style="font-size:0.85rem; color:#64748B; margin-top:4px;">${item.descripcion}</p>
            `;
            calendarContainer.appendChild(calCard);
        });

    } catch (err) {
        console.error('Error al obtener datos:', err);
    }
    
}