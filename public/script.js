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

// Variable global para almacenar pedidos y renderizar el PDF
let pedidosCargadosCache = [];

async function cargarPedidosDirector() {
    const listaContainer = document.getElementById('lista-pedidos');
    if (!listaContainer) return;

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();
        pedidosCargadosCache = pedidos;

        if (pedidos.length === 0) {
            listaContainer.innerHTML = '<p>No hay solicitudes registradas.</p>';
            return;
        }

        listaContainer.innerHTML = pedidos.map(p => `
            <div class="pedido-card">
                <h3 style="margin-bottom:8px; color:#1a1a1a;">${p.titulo || 'Sin título'}</h3>
                <p><strong>Programa / Área:</strong> ${p.programa || '-'} | ${p.areaResponsable || '-'}</p>
                <p><strong>Fecha y Horario:</strong> ${p.fecha || '-'} (${p.horario || '-'})</p>
                <p><strong>Sede / Lugar:</strong> ${p.lugar || '-'}</p>
                <p><strong>Solicitante:</strong> ${p.responsableNombre || '-'} (DNI: ${p.responsableDni || '-'}) - Tel: ${p.responsableTelefono || '-'}</p>
                <p><strong>Participantes Aprox:</strong> ${p.participantesAprox || 0} | <strong>Público General:</strong> ${p.publicoGeneral || 0}</p>
                <p><strong>Ambulancia:</strong> ${p.ambulancia || 'No'} ${p.ambulanciaHorario ? `(${p.ambulanciaHorario})` : ''} | <strong>Lluvia:</strong> ${p.suspendeLluvia || 'No'}</p>
                ${p.descripcion ? `<p><strong>Descripción:</strong> ${p.descripcion}</p>` : ''}
                ${p.objetivo ? `<p><strong>Objetivo:</strong> ${p.objetivo}</p>` : ''}
                ${p.necesidades ? `<p><strong>Necesidades Técnicas/Logística:</strong> ${p.necesidades}</p>` : ''}
                ${p.articulaciones ? `<p><strong>Articulaciones:</strong> ${p.articulaciones}</p>` : ''}
                ${p.transportePasajeros ? `<p><strong>Transporte:</strong> ${p.transportePasajeros}</p>` : ''}
                ${p.seguro ? `<p><strong>Seguro:</strong> ${p.seguro}</p>` : ''}
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
    if (!pedidosCargadosCache || pedidosCargadosCache.length === 0) {
        alert('No hay pedidos registrados para descargar.');
        return;
    }

    // Contenedor temporal de renderizado PDF con tamaño fijo A4
    const printArea = document.createElement('div');
    printArea.style.width = '790px';
    printArea.style.padding = '25px';
    printArea.style.backgroundColor = '#ffffff';
    printArea.style.fontFamily = 'Arial, sans-serif';
    printArea.style.boxSizing = 'border-box';
    printArea.style.color = '#333333';

    let contentHTML = `
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="font-size: 20px; margin: 0; color: #111;">Reporte Oficial de Pedidos de Eventos</h1>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Generado el: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</p>
        </div>
    `;

    pedidosCargadosCache.forEach((p, index) => {
        contentHTML += `
            <div style="border: 1px solid #ccc; border-radius: 6px; padding: 15px; margin-bottom: 18px; page-break-inside: avoid; background-color: #fafafa;">
                <h2 style="font-size: 16px; margin: 0 0 10px 0; color: #000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    ${index + 1}. ${p.titulo || 'Sin título'}
                </h2>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse; line-height: 1.5;">
                    <tr>
                        <td style="padding: 3px 0; width: 50%;"><strong>Área Responsable:</strong> ${p.areaResponsable || '-'}</td>
                        <td style="padding: 3px 0; width: 50%;"><strong>Programa:</strong> ${p.programa || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;"><strong>Fecha del Evento:</strong> ${p.fecha || '-'}</td>
                        <td style="padding: 3px 0;"><strong>Horario:</strong> ${p.horario || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;" colspan="2"><strong>Lugar / Sede:</strong> ${p.lugar || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;"><strong>Responsable:</strong> ${p.responsableNombre || '-'}</td>
                        <td style="padding: 3px 0;"><strong>DNI / Teléfono:</strong> ${p.responsableDni || '-'} / ${p.responsableTelefono || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;"><strong>Participantes Aprox:</strong> ${p.participantesAprox || 0}</td>
                        <td style="padding: 3px 0;"><strong>Público General:</strong> ${p.publicoGeneral || 0}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;"><strong>Ambulancia:</strong> ${p.ambulancia || 'No'} ${p.ambulanciaHorario ? `(${p.ambulanciaHorario})` : ''}</td>
                        <td style="padding: 3px 0;"><strong>Se suspende por lluvia:</strong> ${p.suspendeLluvia || 'No'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0;"><strong>Extensión ART:</strong> ${p.extensionArt || 'No'}</td>
                        <td style="padding: 3px 0;"><strong>Prensa / Difusión:</strong> ${p.prensa || 'No'} ${p.tipoDifusion ? `(${p.tipoDifusion})` : ''}</td>
                    </tr>
                </table>

                <div style="font-size: 12px; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                    <p style="margin: 3px 0;"><strong>Descripción:</strong> ${p.descripcion || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Objetivo:</strong> ${p.objetivo || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Necesidades Técnicas / Logística:</strong> ${p.necesidades || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Articulaciones:</strong> ${p.articulaciones || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Transporte de Pasajeros:</strong> ${p.transportePasajeros || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Seguro:</strong> ${p.seguro || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Situación Revista / Horario Docente:</strong> ${p.situacionRevista || '-'} / ${p.horarioDocente || '-'}</p>
                    <p style="margin: 3px 0;"><strong>Timing / Desarme:</strong> ${p.timingEvento || '-'} / ${p.desarmeEvento || '-'}</p>
                </div>
            </div>
        `;
    });

    printArea.innerHTML = contentHTML;
    document.body.appendChild(printArea);

    const opt = {
        margin:       0.4,
        filename:     `reporte-pedidos-${new Date().toISOString().slice(0, 10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printArea).save().then(() => {
        document.body.removeChild(printArea);
    }).catch(err => {
        if (document.body.contains(printArea)) {
            document.body.removeChild(printArea);
        }
        alert('Error al generar el archivo PDF.');
    });
}