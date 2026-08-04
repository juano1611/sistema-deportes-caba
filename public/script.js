document.addEventListener('DOMContentLoaded', () => {
    initNavigationTabs();
    initMobileMenu();
    initAuthEvents();
    initPedidoForm();
    initEditForm();
    checkSession();
});

function switchTab(targetTabId) {
    const navItems = document.querySelectorAll('.nav-list .nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(i => i.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const itemToActivate = document.querySelector(`.nav-item[data-target="${targetTabId}"]`);
    if (itemToActivate) itemToActivate.classList.add('active');

    const contentToActivate = document.getElementById(targetTabId);
    if (contentToActivate) contentToActivate.classList.add('active');

    if (targetTabId === 'tab-calendario') {
        cargarCalendarioEventos();
    }
}

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
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            switchTab(targetId);
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

function generarCamposProfesores(cantidad) {
    const container = document.getElementById('contenedor-profesores');
    if (!container) return;
    
    container.innerHTML = '';
    const num = parseInt(cantidad) || 0;

    for (let i = 1; i <= num; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.marginTop = '8px';
        div.innerHTML = `
            <label style="font-size: 13px; font-weight: 600;">Nombre y Apellido del Profesor/a ${i}:</label>
            <input type="text" class="input-profesor" placeholder="Ej: Juan Pérez">
        `;
        container.appendChild(div);
    }
}

function toggleReprogramacion(valor) {
    const box = document.getElementById('campo-reprogramacion');
    if (!box) return;
    
    if (valor === 'Sí') {
        box.classList.remove('hidden');
    } else {
        box.classList.add('hidden');
        const inputFecha = document.getElementById('ped-fecha-reprogramacion');
        if (inputFecha) inputFecha.value = '';
    }
}

function initPedidoForm() {
    const formPedido = document.getElementById('form-nuevo-pedido');
    const msgBox = document.getElementById('pedido-msg');

    if (formPedido) {
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (msgBox) msgBox.classList.add('hidden');

            const inputsProfesores = document.querySelectorAll('.input-profesor');
            const listaProfesores = Array.from(inputsProfesores)
                .map(input => input.value.trim())
                .filter(v => v !== '');

            const publicoVal = document.getElementById('ped-pub-gral') ? document.getElementById('ped-pub-gral').value : '';

            const nuevoPedido = {
                titulo: document.getElementById('ped-titulo').value.trim(),
                gerencia: document.getElementById('ped-area').value.trim(),
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
                publicoGeneral: publicoVal !== '' ? Number(publicoVal) : 0,
                ambulancia: document.getElementById('ped-ambulancia').value,
                ambulanciaHorario: document.getElementById('ped-amb-horario').value.trim(),
                
                transportePasajeros: document.getElementById('ped-transporte') ? document.getElementById('ped-transporte').value.trim() : '',
                transporteSalida: document.getElementById('ped-transporte-salida') ? document.getElementById('ped-transporte-salida').value.trim() : '',
                transporteRegreso: document.getElementById('ped-transporte-regreso') ? document.getElementById('ped-transporte-regreso').value.trim() : '',
                transporteRespNombre: document.getElementById('ped-transporte-resp-nombre') ? document.getElementById('ped-transporte-resp-nombre').value.trim() : '',
                transporteRespTel: document.getElementById('ped-transporte-resp-tel') ? document.getElementById('ped-transporte-resp-tel').value.trim() : '',

                necesidades: document.getElementById('ped-necesidades').value.trim(),
                
                extensionArt: document.getElementById('ped-ext-art') ? document.getElementById('ped-ext-art').value : 'No',
                horarioDocente: document.getElementById('ped-horario-doc').value.trim(),
                profesoresAsignados: listaProfesores,

                prensa: document.getElementById('ped-prensa') ? document.getElementById('ped-prensa').value : 'No',
                tipoDifusion: document.getElementById('ped-difusion') ? document.getElementById('ped-difusion').value.trim() : '',

                suspendeLluvia: document.getElementById('ped-lluvia').value,
                fechaReprogramacion: document.getElementById('ped-fecha-reprogramacion') ? document.getElementById('ped-fecha-reprogramacion').value : ''
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
                const contProf = document.getElementById('contenedor-profesores');
                if (contProf) contProf.innerHTML = '';
                toggleReprogramacion('No');
                cargarCalendarioEventos();
            } catch (err) {
                alert('Error al conectar con el servidor');
            }
        });
    }
}

let pedidosCargadosCache = [];

async function cargarPedidosDirector() {
    const listaContainer = document.getElementById('lista-pedidos');
    if (!listaContainer) return;

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();
        pedidosCargadosCache = pedidos;

        if (pedidos.length === 0) {
            listaContainer.innerHTML = '<p>No hay solicitudes vigentes o pendientes.</p>';
            return;
        }

        listaContainer.innerHTML = pedidos.map(p => {
            const listaProfsStr = (p.profesoresAsignados && p.profesoresAsignados.length > 0) 
                ? p.profesoresAsignados.join(', ') 
                : 'Sin especificar';

            return `
                <div class="pedido-card">
                    <div class="pedido-card-header">
                        <h4>${p.titulo || 'Sin título'}</h4>
                        <div class="card-actions">
                            <button class="btn-action btn-pdf-single" onclick="descargarReporteEventoPDF('${p._id}')">📄 PDF</button>
                            <button class="btn-action btn-edit" onclick="abrirModalEdicion('${p._id}')">✏️ Editar</button>
                            <button class="btn-action btn-delete" onclick="eliminarPedido('${p._id}')">🗑️ Eliminar</button>
                        </div>
                    </div>
                    <div class="pedido-card-body-grid">
                        <p><strong>Gerencia / Programa:</strong> ${p.gerencia || p.areaResponsable || '-'} | ${p.programa || '-'}</p>
                        <p><strong>Fecha y Horario:</strong> ${p.fecha || '-'} (${p.horario || '-'})</p>
                        <p><strong>Sede / Lugar:</strong> ${p.lugar || '-'}</p>
                        <p><strong>Solicitante:</strong> ${p.responsableNombre || '-'} (DNI: ${p.responsableDni || '-'}) - Tel: ${p.responsableTelefono || '-'}</p>
                        <p><strong>Participantes Est.:</strong> ${p.participantesAprox || 0} | <strong>Público:</strong> ${p.publicoGeneral ?? '-'}</p>
                        <p><strong>Transporte:</strong> ${p.transportePasajeros || 'No'} (Salida: ${p.transporteSalida || '-'} / Regreso: ${p.transporteRegreso || '-'})</p>
                        <p><strong>Resp. Transporte:</strong> ${p.transporteRespNombre || '-'} (${p.transporteRespTel || '-'})</p>
                        <p><strong>Ambulancia:</strong> ${p.ambulancia || 'No'} ${p.ambulanciaHorario ? `(${p.ambulanciaHorario})` : ''} | <strong>ART:</strong> ${p.extensionArt || 'No'}</p>
                        <p><strong>Profesores:</strong> ${listaProfsStr} (Horario: ${p.horarioDocente || '-'})</p>
                        <p><strong>Prensa/Difusión:</strong> ${p.prensa || 'No'} ${p.tipoDifusion ? `- ${p.tipoDifusion}` : ''}</p>
                        <p><strong>Lluvia:</strong> ${p.suspendeLluvia || 'No'} ${p.fechaReprogramacion ? `(Reprograma: ${p.fechaReprogramacion})` : ''}</p>
                    </div>
                    ${p.necesidades ? `<p style="font-size:13px; margin-top:6px;"><strong>Necesidades Técnicas:</strong> ${p.necesidades}</p>` : ''}
                    ${p.descripcion ? `<p style="font-size:13px; margin-top:4px;"><strong>Descripción:</strong> ${p.descripcion}</p>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        listaContainer.innerHTML = '<p>Error al obtener el historial de solicitudes.</p>';
    }
}

async function cargarCalendarioEventos() {
    const calContainer = document.getElementById('calendario-container');
    if (!calContainer) return;

    try {
        const res = await fetch('/api/pedidos');
        const pedidos = await res.json();

        if (pedidos.length === 0) {
            calContainer.innerHTML = '<p class="no-events">No hay eventos próximos programados en el calendario.</p>';
            return;
        }

        pedidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        calContainer.innerHTML = pedidos.map(p => {
            const fechaFormateada = p.fecha ? p.fecha.split('-').reverse().join('/') : 'Sin fecha';

            return `
                <div class="event-cal-card">
                    <div class="event-cal-date">
                        <span>📅 ${fechaFormateada}</span>
                        <span class="cal-time">⏰ ${p.horario || 'Horario no especificado'}</span>
                    </div>
                    <div class="event-cal-info">
                        <h3>${p.titulo || 'Sin título'}</h3>
                        <p>📍 <strong>Lugar:</strong> ${p.lugar || '-'}</p>
                        <p>🏢 <strong>Gerencia/Programa:</strong> ${p.gerencia || p.areaResponsable || '-'} ${p.programa ? `(${p.programa})` : ''}</p>
                        <p>👤 <strong>Responsable:</strong> ${p.responsableNombre || '-'}</p>
                        ${p.descripcion ? `<p class="cal-desc">📝 ${p.descripcion}</p>` : ''}
                    </div>
                    <span class="tag-proximo">Próximo</span>
                </div>
            `;
        }).join('');
    } catch (err) {
        calContainer.innerHTML = '<p>Error al cargar el calendario de eventos.</p>';
    }
}

function abrirModalEdicion(id) {
    const pedido = pedidosCargadosCache.find(p => p._id === id);
    if (!pedido) return;

    document.getElementById('edit-id').value = pedido._id;
    document.getElementById('edit-titulo').value = pedido.titulo || '';
    document.getElementById('edit-area').value = pedido.gerencia || pedido.areaResponsable || '';
    document.getElementById('edit-programa').value = pedido.programa || '';
    document.getElementById('edit-fecha').value = pedido.fecha || '';
    document.getElementById('edit-horario').value = pedido.horario || '';
    document.getElementById('edit-lugar').value = pedido.lugar || '';
    document.getElementById('edit-resp-nombre').value = pedido.responsableNombre || '';
    document.getElementById('edit-resp-dni').value = pedido.responsableDni || '';
    document.getElementById('edit-resp-tel').value = pedido.responsableTelefono || '';
    document.getElementById('edit-part-aprox').value = pedido.participantesAprox || 0;
    document.getElementById('edit-pub-gral').value = pedido.publicoGeneral ?? '';
    document.getElementById('edit-ambulancia').value = pedido.ambulancia || 'No';
    document.getElementById('edit-amb-horario').value = pedido.ambulanciaHorario || '';
    
    document.getElementById('edit-transporte').value = pedido.transportePasajeros || '';
    document.getElementById('edit-transporte-salida').value = pedido.transporteSalida || '';
    document.getElementById('edit-transporte-regreso').value = pedido.transporteRegreso || '';
    document.getElementById('edit-transporte-resp-nombre').value = pedido.transporteRespNombre || '';
    document.getElementById('edit-transporte-resp-tel').value = pedido.transporteRespTel || '';

    document.getElementById('edit-necesidades').value = pedido.necesidades || '';
    document.getElementById('edit-ext-art').value = pedido.extensionArt || 'No';
    document.getElementById('edit-horario-doc').value = pedido.horarioDocente || '';
    
    const profs = (pedido.profesoresAsignados && Array.isArray(pedido.profesoresAsignados)) 
        ? pedido.profesoresAsignados.join(', ') 
        : '';
    document.getElementById('edit-profesores').value = profs;

    document.getElementById('edit-prensa').value = pedido.prensa || 'No';
    document.getElementById('edit-difusion').value = pedido.tipoDifusion || '';

    document.getElementById('edit-lluvia').value = pedido.suspendeLluvia || 'No';
    document.getElementById('edit-fecha-reprogramacion').value = pedido.fechaReprogramacion || '';

    document.getElementById('edit-descripcion').value = pedido.descripcion || '';
    document.getElementById('edit-objetivo').value = pedido.objetivo || '';

    document.getElementById('modal-editar').classList.remove('hidden');
}

function cerrarModalEdicion() {
    document.getElementById('modal-editar').classList.add('hidden');
}

function initEditForm() {
    const editForm = document.getElementById('form-editar-pedido');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;

            const profsInput = document.getElementById('edit-profesores').value.trim();
            const profesoresArray = profsInput ? profsInput.split(',').map(s => s.trim()).filter(Boolean) : [];

            const datosActualizados = {
                titulo: document.getElementById('edit-titulo').value.trim(),
                gerencia: document.getElementById('edit-area').value.trim(),
                programa: document.getElementById('edit-programa').value.trim(),
                fecha: document.getElementById('edit-fecha').value,
                horario: document.getElementById('edit-horario').value.trim(),
                lugar: document.getElementById('edit-lugar').value.trim(),
                responsableNombre: document.getElementById('edit-resp-nombre').value.trim(),
                responsableDni: document.getElementById('edit-resp-dni').value.trim(),
                responsableTelefono: document.getElementById('edit-resp-tel').value.trim(),
                participantesAprox: Number(document.getElementById('edit-part-aprox').value),
                publicoGeneral: document.getElementById('edit-pub-gral').value !== '' ? Number(document.getElementById('edit-pub-gral').value) : 0,
                ambulancia: document.getElementById('edit-ambulancia').value,
                ambulanciaHorario: document.getElementById('edit-amb-horario').value.trim(),
                
                transportePasajeros: document.getElementById('edit-transporte').value.trim(),
                transporteSalida: document.getElementById('edit-transporte-salida').value.trim(),
                transporteRegreso: document.getElementById('edit-transporte-regreso').value.trim(),
                transporteRespNombre: document.getElementById('edit-transporte-resp-nombre').value.trim(),
                transporteRespTel: document.getElementById('edit-transporte-resp-tel').value.trim(),

                necesidades: document.getElementById('edit-necesidades').value.trim(),
                extensionArt: document.getElementById('edit-ext-art').value,
                horarioDocente: document.getElementById('edit-horario-doc').value.trim(),
                profesoresAsignados: profesoresArray,

                prensa: document.getElementById('edit-prensa').value,
                tipoDifusion: document.getElementById('edit-difusion').value.trim(),

                suspendeLluvia: document.getElementById('edit-lluvia').value,
                fechaReprogramacion: document.getElementById('edit-fecha-reprogramacion').value,

                descripcion: document.getElementById('edit-descripcion').value.trim(),
                objetivo: document.getElementById('edit-objetivo').value.trim()
            };

            try {
                const res = await fetch(`/api/pedidos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosActualizados)
                });

                if (res.ok) {
                    alert('✅ Pedido modificado con éxito');
                    cerrarModalEdicion();
                    cargarPedidosDirector();
                    cargarCalendarioEventos();
                } else {
                    alert('Error al modificar el pedido');
                }
            } catch (err) {
                alert('Error al conectar con el servidor');
            }
        });
    }
}

async function eliminarPedido(id) {
    if (!confirm('¿Estás seguro/a de eliminar este evento de la base de datos?')) return;

    try {
        const res = await fetch(`/api/pedidos/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('🗑️ Pedido eliminado correctamente');
            cargarPedidosDirector();
            cargarCalendarioEventos();
        } else {
            alert('Error al eliminar el pedido');
        }
    } catch (err) {
        alert('Error al conectar con el servidor');
    }
}

// SISTEMA VECTORIAL PURO CON JSPDF - IMPOSIBLE QUE SALGA EN BLANCO
function descargarReporteEventoPDF(id) {
    const p = pedidosCargadosCache.find(item => item._id === id);
    if (!p) {
        alert('No se encontraron los datos del evento.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const profesores = (p.profesoresAsignados && p.profesoresAsignados.length > 0)
        ? p.profesoresAsignados.join(', ')
        : 'Sin especificar';

    const fechaHoy = new Date().toLocaleDateString('es-AR');

    // Encabezado
    doc.setFillColor(0, 43, 102); // Azul BA
    doc.rect(15, 12, 180, 2, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(0, 43, 102);
    doc.text("REPORTE DE SOLICITUD DE EVENTO", 15, 22);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Dirección General de Deporte Social y Desarrollo Deportivo - CABA", 15, 27);
    doc.text(`Emisión: ${fechaHoy}`, 195, 27, { align: 'right' });

    // Tarjeta contenedora
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 32, 180, 245, 3, 3, 'FD');

    // Título del evento
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 32, 180, 12, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 43, 102);
    doc.text(p.titulo || 'Sin Título', 20, 40);

    // Grid de datos
    let y = 52;
    doc.setFontSize(9.5);

    function addRow(label1, val1, label2, val2) {
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        doc.text(label1, 20, y);
        doc.setFont("Helvetica", "normal");
        doc.text(String(val1 || '-'), 20 + doc.getTextWidth(label1) + 2, y);

        if (label2) {
            doc.setFont("Helvetica", "bold");
            doc.text(label2, 110, y);
            doc.setFont("Helvetica", "normal");
            doc.text(String(val2 || '-'), 110 + doc.getTextWidth(label2) + 2, y);
        }
        y += 8;
    }

    addRow("Gerencia:", p.gerencia || p.areaResponsable, "Programa:", p.programa);
    addRow("Fecha Evento:", p.fecha, "Horario:", p.horario);
    
    doc.setFont("Helvetica", "bold");
    doc.text("Lugar / Sede:", 20, y);
    doc.setFont("Helvetica", "normal");
    doc.text(String(p.lugar || '-'), 45, y);
    y += 8;

    addRow("Solicitante:", p.responsableNombre, "DNI / Tel:", `${p.responsableDni || '-'} / ${p.responsableTelefono || '-'}`);
    addRow("Participantes Est.:", p.participantesAprox, "Público General:", p.publicoGeneral ?? 'N/A');
    addRow("Ambulancia:", `${p.ambulancia || 'No'} ${p.ambulanciaHorario ? `(${p.ambulanciaHorario})` : ''}`, "Extensión ART:", p.extensionArt || 'No');
    addRow("Transporte:", p.transportePasajeros || 'No', "Salida/Regreso:", `${p.transporteSalida || '-'} / ${p.transporteRegreso || '-'}`);

    if (p.transporteRespNombre) {
        addRow("Resp. Micro:", `${p.transporteRespNombre} (Tel: ${p.transporteRespTel || '-'})`);
    }

    doc.setFont("Helvetica", "bold");
    doc.text("Profesores:", 20, y);
    doc.setFont("Helvetica", "normal");
    const profLines = doc.splitTextToSize(`${profesores} (Horario: ${p.horarioDocente || '-'})`, 135);
    doc.text(profLines, 42, y);
    y += (profLines.length * 6) + 2;

    addRow("Prensa / Redes:", `${p.prensa || 'No'} ${p.tipoDifusion ? `(${p.tipoDifusion})` : ''}`, "Suspende por Lluvia:", `${p.suspendeLluvia || 'No'} ${p.fechaReprogramacion ? `(Reprog: ${p.fechaReprogramacion})` : ''}`);

    // Línea divisoria
    doc.setDrawColor(203, 213, 225);
    doc.line(20, y, 190, y);
    y += 8;

    function addBlock(title, text) {
        if (!text) return;
        doc.setFont("Helvetica", "bold");
        doc.text(title, 20, y);
        y += 5;
        doc.setFont("Helvetica", "normal");
        const lines = doc.splitTextToSize(text, 165);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 4;
    }

    addBlock("Necesidades Técnicas e Infraestructura:", p.necesidades);
    addBlock("Descripción General:", p.descripcion);
    addBlock("Objetivos de la Jornada:", p.objetivo);

    // Guardar archivo
    const tituloSanitizado = (p.titulo || 'evento').toLowerCase().replace(/[^a-z0-9]/g, '-');
    doc.save(`evento-${tituloSanitizado}.pdf`);
}