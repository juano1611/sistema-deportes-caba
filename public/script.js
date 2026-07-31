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
                    loginError.textContent = data.msg || 'Error al iniciar sesión';
                    loginError.classList.remove('hidden');
                    return;
                }

                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                renderUserProfile(data.user);
                applyRolePermissions(data.user);
                showPortal();
                loginForm.reset();
            } catch (err) {
                loginError.textContent = 'Error de conexión con el servidor';
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
                    registerError.textContent = data.msg || 'Error en el registro';
                    registerError.classList.remove('hidden');
                    return;
                }

                registerSuccess.textContent = '¡Cuenta creada! Ya podés iniciar sesión.';
                registerSuccess.classList.remove('hidden');
                registerForm.reset();
            } catch (err) {
                registerError.textContent = 'Error de conexión con el servidor';
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
    const form = document.getElementById('form-nuevo-pedido');
    const msg = document.getElementById('pedido-msg');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) msg.classList.add('hidden');

        const pedidoData = {
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
            participantesAprox: parseInt(document.getElementById('ped-part-aprox').value) || 0,
            publicoGeneral: parseInt(document.getElementById('ped-pub-gral').value) || 0,
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
                body: JSON.stringify(pedidoData)
            });

            const data = await res.json();

            if (res.ok) {
                if (msg) {
                    msg.textContent = '¡Pedido de evento enviado con éxito!';
                    msg.classList.remove('hidden');
                }
                form.reset();
                cargarCalendarioEventos();
            } else {
                alert(data.msg || 'Error al enviar el pedido');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión con el servidor');
        }
    });
}

// Cache global de pedidos cargados
let listaPedidosCache = [];

// -------------------------------------------------------------------
// VISTA DIRECTOR: TARJETAS ULTRA COMPACTAS Y LIMPIAS EN PANTALLA
// -------------------------------------------------------------------
async function cargarPedidosDirector() {
    const listaContainer = document.getElementById('lista-pedidos');
    if (!listaContainer) return;

    listaContainer.innerHTML = '<p>Cargando solicitudes...</p>';

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            listaContainer.innerHTML = '<p>No hay solicitudes de eventos registradas aún.</p>';
            listaPedidosCache = [];
            return;
        }

        listaPedidosCache = pedidos;

        listaContainer.innerHTML = pedidos.map(p => {
            let fechaFormateada = p.fecha || 'Sin Fecha';
            if (p.fecha && p.fecha.includes('-')) {
                const parts = p.fecha.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            return `
                <div class="pedido-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.03);">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #edf2f7; padding-bottom:8px; margin-bottom:10px;">
                        <h4 style="font-size:16px; color:#1a202c; margin:0; font-weight:700;">${escapeHtml(p.titulo)}</h4>
                        <span style="background:#ebf8ff; color:#2b6cb0; font-size:12px; font-weight:bold; padding:4px 8px; border-radius:4px;">📅 ${escapeHtml(fechaFormateada)}</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:8px; font-size:13px; color:#4a5568;">
                        <div><strong>🏢 Área:</strong> ${escapeHtml(p.areaResponsable || '-')}</div>
                        <div><strong>📍 Lugar:</strong> ${escapeHtml(p.lugar || '-')}</div>
                        <div><strong>⏰ Horario:</strong> ${escapeHtml(p.horario || '-')}</div>
                        <div><strong>👤 Responsable:</strong> ${escapeHtml(p.responsableNombre || '-')}</div>
                        <div><strong>📞 Teléfono:</strong> ${escapeHtml(p.responsableTelefono || '-')}</div>
                        <div><strong>👥 Participantes Est.:</strong> ${p.participantesAprox ?? 0} personas</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        listaContainer.innerHTML = '<p class="auth-error">Error al cargar las solicitudes.</p>';
    }
}

// -------------------------------------------------------------------
// MÓDULO CALENDARIO DE EVENTOS
// -------------------------------------------------------------------
async function cargarCalendarioEventos() {
    const tabCalendario = document.getElementById('tab-calendario');
    if (!tabCalendario) return;

    let calContainer = document.getElementById('calendario-lista');
    if (!calContainer) {
        const panel = tabCalendario.querySelector('.panel');
        if (panel) {
            panel.innerHTML = `
                <h2>Calendario General de Eventos</h2>
                <p class="section-desc">Cronograma oficial ordenado cronológicamente por fecha.</p>
                <div id="calendario-lista" class="calendario-grid"></div>
            `;
            calContainer = document.getElementById('calendario-lista');
        }
    }

    if (!calContainer) return;
    calContainer.innerHTML = '<p>Cargando eventos del calendario...</p>';

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            calContainer.innerHTML = '<p>No hay eventos agendados en el calendario.</p>';
            return;
        }

        pedidos.sort((a, b) => {
            if (!a.fecha) return 1;
            if (!b.fecha) return -1;
            return new Date(a.fecha) - new Date(b.fecha);
        });

        calContainer.innerHTML = pedidos.map(p => {
            let fechaFormateada = p.fecha || 'Sin Fecha';
            if (p.fecha && p.fecha.includes('-')) {
                const parts = p.fecha.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            return `
                <div class="event-cal-card">
                    <div class="event-cal-date">
                        <span class="cal-icon">📅</span>
                        <strong>${escapeHtml(fechaFormateada)}</strong>
                        <span class="cal-time">${escapeHtml(p.horario || '')}</span>
                    </div>
                    <div class="event-cal-info">
                        <h3>${escapeHtml(p.titulo)}</h3>
                        <p><strong>📍 Lugar:</strong> ${escapeHtml(p.lugar || 'A confirmar')}</p>
                        <p><strong>🏢 Área:</strong> ${escapeHtml(p.areaResponsable || '-')}</p>
                        <p><strong>👤 Responsable:</strong> ${escapeHtml(p.responsableNombre || '-')} (${escapeHtml(p.responsableTelefono || '-')})</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error al cargar calendario:", err);
        calContainer.innerHTML = '<p class="auth-error">Error al cargar el calendario.</p>';
    }
}

// -------------------------------------------------------------------
// GENERACIÓN DE PDF FORMAL, MAQUETADO CON TABLAS ESTRUCTURADAS
// -------------------------------------------------------------------
function descargarReportePDF() {
    if (!listaPedidosCache || listaPedidosCache.length === 0) {
        alert('No hay eventos registrados para exportar.');
        return;
    }

    const container = document.createElement('div');
    container.style.padding = '15px';
    container.style.fontFamily = 'Helvetica, Arial, sans-serif';
    container.style.color = '#1a202c';

    // Encabezado institucional GCBA
    let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #fcd116; padding-bottom: 12px; margin-bottom: 20px;">
            <div>
                <span style="background: #fcd116; color: #000; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 14px;">BA</span>
                <span style="font-size: 16px; font-weight: bold; margin-left: 8px; color: #1d2b36;">Gobierno de la Ciudad de Buenos Aires</span>
                <div style="font-size: 12px; color: #4a5568; margin-top: 4px;">Subsecretaría de Deportes | DGDSyDD</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #718096;">
                <div><strong>REPORTE OFICIAL DE SOLICITUDES</strong></div>
                <div>Generado: ${new Date().toLocaleDateString('es-AR')}</div>
            </div>
        </div>
    `;

    listaPedidosCache.forEach((p, idx) => {
        let fechaFormateada = p.fecha || 'Sin Fecha';
        if (p.fecha && p.fecha.includes('-')) {
            const parts = p.fecha.split('-');
            fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        htmlContent += `
            <div style="page-break-inside: avoid; border: 1px solid #cbd5e0; border-radius: 8px; margin-bottom: 25px; overflow: hidden; background: #ffffff;">
                <div style="background: #1d2b36; color: #ffffff; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 15px; font-weight: bold;">#${idx + 1} - ${escapeHtml(p.titulo)}</span>
                    <span style="background: #fcd116; color: #000000; font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">FECHA: ${escapeHtml(fechaFormateada)}</span>
                </div>

                <div style="padding: 15px;">
                    <!-- Seccion 1 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">1. Información General del Evento</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                        <tr>
                            <td style="width: 50%; padding: 3px 0;"><strong>Área Responsable:</strong> ${escapeHtml(p.areaResponsable || '-')}</td>
                            <td style="width: 50%; padding: 3px 0;"><strong>Programa:</strong> ${escapeHtml(p.programa || '-')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>Horario:</strong> ${escapeHtml(p.horario || '-')}</td>
                            <td style="padding: 3px 0;"><strong>Lugar / Sede:</strong> ${escapeHtml(p.lugar || '-')}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 3px 0;"><strong>Descripción:</strong> ${escapeHtml(p.descripcion || '-')}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 3px 0;"><strong>Objetivo:</strong> ${escapeHtml(p.objetivo || '-')}</td>
                        </tr>
                    </table>

                    <!-- Seccion 2 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">2. Datos del Responsable Directo</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                        <tr>
                            <td style="width: 33%; padding: 3px 0;"><strong>Nombre:</strong> ${escapeHtml(p.responsableNombre || '-')}</td>
                            <td style="width: 33%; padding: 3px 0;"><strong>DNI:</strong> ${escapeHtml(p.responsableDni || '-')}</td>
                            <td style="width: 34%; padding: 3px 0;"><strong>Teléfono:</strong> ${escapeHtml(p.responsableTelefono || '-')}</td>
                        </tr>
                    </table>

                    <!-- Seccion 3 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">3. Estimación de Concurrencia</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                        <tr>
                            <td style="width: 50%; padding: 3px 0;"><strong>Participantes Estimados:</strong> ${p.participantesAprox ?? 0}</td>
                            <td style="width: 50%; padding: 3px 0;"><strong>Público General Est.:</strong> ${p.publicoGeneral ?? 0}</td>
                        </tr>
                    </table>

                    <!-- Seccion 4 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">4. Salud, Seguro y Logística</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                        <tr>
                            <td style="width: 50%; padding: 3px 0;"><strong>Requiere Ambulancia:</strong> ${escapeHtml(p.ambulancia || 'No')}</td>
                            <td style="width: 50%; padding: 3px 0;"><strong>Horario Ambulancia:</strong> ${escapeHtml(p.ambulanciaHorario || '-')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>Seguro / Cobertura:</strong> ${escapeHtml(p.seguro || '-')}</td>
                            <td style="padding: 3px 0;"><strong>Extensión ART:</strong> ${escapeHtml(p.extensionArt || '-')}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 3px 0;"><strong>Transporte de Pasajeros:</strong> ${escapeHtml(p.transportePasajeros || '-')}</td>
                        </tr>
                    </table>

                    <!-- Seccion 5 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">5. Articulaciones e Infraestructura</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                        <tr>
                            <td style="width: 50%; padding: 3px 0;"><strong>Articulaciones:</strong> ${escapeHtml(p.articulaciones || '-')}</td>
                            <td style="width: 50%; padding: 3px 0;"><strong>Necesidades Técnicas / Sonido:</strong> ${escapeHtml(p.necesidades || '-')}</td>
                        </tr>
                    </table>

                    <!-- Seccion 6 -->
                    <div style="font-size: 11px; font-weight: bold; color: #0056b3; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase;">6. Docentes, Prensa y Contingencia</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <tr>
                            <td style="width: 50%; padding: 3px 0;"><strong>Situación Revista Docente:</strong> ${escapeHtml(p.situacionRevista || '-')}</td>
                            <td style="width: 50%; padding: 3px 0;"><strong>Horario Docente:</strong> ${escapeHtml(p.horarioDocente || '-')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>Cobertura Prensa:</strong> ${escapeHtml(p.prensa || 'No')}</td>
                            <td style="padding: 3px 0;"><strong>Tipo de Difusión:</strong> ${escapeHtml(p.tipoDifusion || '-')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>Montaje / Desarme:</strong> ${escapeHtml(p.timingEvento || '-')} / ${escapeHtml(p.desarmeEvento || '-')}</td>
                            <td style="padding: 3px 0;"><strong>¿Se suspende por lluvia?:</strong> ${escapeHtml(p.suspendeLluvia || '-')}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlContent;

    const opt = {
        margin:       8,
        filename:     'reporte_oficial_eventos_dgdsydd.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save();
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}