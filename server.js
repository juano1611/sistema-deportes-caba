const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración del correo de destino oficial
const MAIL_DESTINO = 'solicituddepedidos_dgdsydd@buenosaires.gob.ar';

// Configuración del transportador de correos (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// REGLA DEFINITIVA ANTI-CACHÉ
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Servir archivos estáticos deshabilitando ETag
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false
}));

// Conexión a MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://juano1611:juano1611@cluster0.lldgqos.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Conectado con éxito a MongoDB Cloud');
        eliminarEventosPasados();
    })
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

async function eliminarEventosPasados() {
    try {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        const fechaHoyStr = `${year}-${month}-${day}`;

        const resultado = await Pedido.deleteMany({ fecha: { $lt: fechaHoyStr } });
        if (resultado.deletedCount > 0) {
            console.log(`🧹 Limpieza automática: Se eliminaron ${resultado.deletedCount} evento(s) vencido(s).`);
        }
    } catch (err) {
        console.error('❌ Error al ejecutar la limpieza automática:', err);
    }
}

setInterval(eliminarEventosPasados, 12 * 60 * 60 * 1000);

// Modelos
const UsuarioSchema = new mongoose.Schema({
    dni: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'DOCENTE' }
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', UsuarioSchema);

const PedidoSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    gerencia: String,
    areaResponsable: String,
    programa: String,
    fecha: String,
    horario: String,
    lugar: String,
    descripcion: String,
    responsableNombre: String,
    responsableDni: String,
    responsableTelefono: String,
    objetivo: String,
    participantesAprox: Number,
    publicoGeneral: Number,
    necesidades: String,
    transportePasajeros: String,
    transporteSalida: String,
    transporteRegreso: String,
    transporteRespNombre: String,
    transporteRespTel: String,
    ambulancia: String,
    ambulanciaHorario: String,
    extensionArt: String,
    horarioDocente: String,
    profesoresAsignados: mongoose.Schema.Types.Mixed,
    prensa: String,
    tipoDifusion: String,
    suspendeLluvia: String,
    fechaReprogramacion: String
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', PedidoSchema);

// GENERADOR DE PDF EXHAUSTIVO EN BACKEND
function generarBufferPDF(p) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 35, size: 'A4' });
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            const fechaHoy = new Date().toLocaleDateString('es-AR');

            // Encabezado
            doc.rect(35, 30, 525, 3).fill('#002B66');
            doc.moveDown(0.5);

            doc.fillColor('#002B66').fontSize(15).font('Helvetica-Bold').text('REPORTE COMPLETO DE SOLICITUD DE EVENTO', 35, 40);
            doc.fontSize(8.5).font('Helvetica').fillColor('#666666').text('Dirección General de Deporte Social y Desarrollo Deportivo - CABA', 35, 58);
            doc.text(`Fecha de Emisión: ${fechaHoy}`, 380, 58, { align: 'right' });

            let y = 72;
            doc.rect(35, y, 525, 22).fill('#F1F5F9').stroke('#CBD5E1');
            doc.fillColor('#002B66').fontSize(11).font('Helvetica-Bold').text(p.titulo || 'Sin Título', 42, y + 6);

            y += 30;
            doc.fillColor('#1F2937').fontSize(9);

            function printRow(label1, val1, label2, val2) {
                doc.font('Helvetica-Bold').text(label1, 42, y);
                doc.font('Helvetica').text(String(val1 || '-'), 125, y);

                if (label2) {
                    doc.font('Helvetica-Bold').text(label2, 300, y);
                    doc.font('Helvetica').text(String(val2 || '-'), 390, y);
                }
                y += 15;
            }

            // 1. DATOS GENERALES
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('1. DATOS GENERALES Y UBICACIÓN', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Gerencia:', p.gerencia || p.areaResponsable, 'Programa:', p.programa);
            printRow('Fecha del Evento:', p.fecha, 'Horario de Jornada:', p.horario);
            printRow('Sede / Lugar:', p.lugar, '', '');

            y += 4;
            // 2. RESPONSABLE DE LA SOLICITUD
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('2. RESPONSABLE DE LA SOLICITUD', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Nombre y Apellido:', p.responsableNombre, 'DNI:', p.responsableDni);
            printRow('Teléfono Contacto:', p.responsableTelefono, '', '');

            y += 4;
            // 3. CONCURRENCIA ESTIMADA
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('3. ESTIMACIÓN DE CONCURRENCIA', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Participantes Est.:', p.participantesAprox, 'Público General Est.:', p.publicoGeneral ?? 'N/A');

            y += 4;
            // 4. LOGÍSTICA, EMERGENCIAS Y TRANSPORTE
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('4. LOGÍSTICA, EMERGENCIAS Y TRANSPORTE', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Requiere Ambulancia:', p.ambulancia || 'No', 'Horario Cobertura:', p.ambulanciaHorario || 'N/A');
            printRow('Transporte Pasajeros:', p.transportePasajeros || 'No', 'Lugar/Horario Salida:', p.transporteSalida || 'N/A');
            printRow('Lugar/Horario Regreso:', p.transporteRegreso || 'N/A', 'Responsable Micro:', `${p.transporteRespNombre || '-'} ${p.transporteRespTel ? `(${p.transporteRespTel})` : ''}`);

            y += 4;
            // 5. PERSONAL Y DOCENTES
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('5. PERSONAL Y COBERTURA DOCENTE', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Extensión de ART:', p.extensionArt || 'No', 'Horario Laboral Docente:', p.horarioDocente || 'N/A');

            doc.font('Helvetica-Bold').text('Detalle de Docentes:', 42, y);
            y += 12;

            if (p.profesoresAsignados && p.profesoresAsignados.length > 0) {
                p.profesoresAsignados.forEach((prof, idx) => {
                    doc.font('Helvetica');
                    let txt = (typeof prof === 'object') 
                        ? `${idx + 1}. ${prof.nombre} | Revista: ${prof.situacionRevista || 'S/D'} | Horario: ${prof.horarioLaboral || 'S/D'}` 
                        : `${idx + 1}. ${prof}`;
                    doc.text(txt, 50, y);
                    y += 13;
                });
            } else {
                doc.font('Helvetica').text('No se asignaron docentes específicos', 50, y);
                y += 13;
            }

            y += 4;
            // 6. PRENSA Y CONDICIÓN CLIMÁTICA
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text('6. PRENSA Y CONDICIÓN CLIMÁTICA', 35, y);
            y += 14;
            doc.fillColor('#1F2937').fontSize(9);
            printRow('Prensa / Cobertura:', p.prensa || 'No', 'Tipo de Difusión:', p.tipoDifusion || 'N/A');
            printRow('Suspende por Lluvia:', p.suspendeLluvia || 'No', 'Fecha Reprogramación:', p.fechaReprogramacion || 'N/A');

            y += 6;
            doc.moveTo(35, y).lineTo(560, y).strokeColor('#CBD5E1').stroke();
            y += 12;

            function printBlock(title, text) {
                if (!text) return;
                doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#002B66').text(title, 35, y);
                y += 12;
                doc.font('Helvetica').fontSize(9).fillColor('#1F2937').text(text, 35, y, { width: 525 });
                y += doc.heightOfString(text, { width: 525 }) + 10;
            }

            printBlock('7. NECESIDADES TÉCNICAS E INFRAESTRUCTURA', p.necesidades);
            printBlock('8. DESCRIPCIÓN GENERAL DEL EVENTO', p.descripcion);
            printBlock('9. OBJETIVOS DE LA JORNADA', p.objetivo);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ENVÍO DE EMAIL ASÍNCRONO
async function enviarEmailBackground(pedidoData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('ℹ️ Omitiendo envío de correo: EMAIL_USER y EMAIL_PASS no están configurados.');
        return;
    }
    try {
        const pdfBuffer = await generarBufferPDF(pedidoData);
        const tituloSanitizado = (pedidoData.titulo || 'evento').toLowerCase().replace(/[^a-z0-9]/g, '-');

        const mailOptions = {
            from: '"Portal de Eventos BA" <no-reply@buenosaires.gob.ar>',
            to: MAIL_DESTINO,
            subject: `📌 Nueva Solicitud de Evento: ${pedidoData.titulo}`,
            html: `
                <h2 style="color: #002B66;">NUEVA SOLICITUD DE EVENTO REGISTRADA</h2>
                <p>Se ha generado una nueva solicitud desde el Portal de Eventos BA con toda la información técnica.</p>
                <ul>
                    <li><strong>Título:</strong> ${pedidoData.titulo}</li>
                    <li><strong>Fecha:</strong> ${pedidoData.fecha}</li>
                    <li><strong>Lugar:</strong> ${pedidoData.lugar}</li>
                    <li><strong>Solicitante:</strong> ${pedidoData.responsableNombre} (DNI: ${pedidoData.responsableDni})</li>
                </ul>
                <p>Se adjunta a este correo el <strong>reporte en PDF con la totalidad de los campos completados</strong>.</p>
            `,
            attachments: [
                {
                    filename: `evento-${tituloSanitizado}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Email con PDF completo adjunto enviado exitosamente a ${MAIL_DESTINO}`);
    } catch (err) {
        console.error('⚠️ Error en segundo plano al enviar el email:', err.message);
    }
}

// Rutas Autenticación
app.post('/api/auth/register', async (req, res) => {
    const { nombre, dni, password } = req.body;
    if (!nombre || !dni || !password) {
        return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }
    try {
        const usuarioExiste = await Usuario.findOne({ dni });
        if (usuarioExiste) {
            return res.status(400).json({ msg: 'El DNI ya se encuentra registrado' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const role = (dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';

        const nuevoUsuario = new Usuario({ dni, nombre, password: hashedPassword, role });
        await nuevoUsuario.save();
        return res.status(201).json({ msg: 'Usuario registrado con éxito' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error interno del servidor' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { dni, password } = req.body;
    if (!dni || !password) {
        return res.status(400).json({ msg: 'Ingresá DNI y contraseña' });
    }
    try {
        const user = await Usuario.findOne({ dni });
        if (!user) return res.status(401).json({ msg: 'Usuario no encontrado' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ msg: 'Contraseña incorrecta' });

        return res.json({
            msg: 'Login exitoso',
            user: { id: user._id, dni: user.dni, nombre: user.nombre, role: user.role }
        });
    } catch (err) {
        return res.status(500).json({ msg: 'Error interno del servidor' });
    }
});

// Rutas Pedidos
app.post('/api/pedidos', async (req, res) => {
    const p = req.body;
    if (!p.titulo || !p.fecha || !p.lugar) {
        return res.status(400).json({ msg: 'Campos requeridos faltantes' });
    }
    try {
        const nuevoPedido = new Pedido(p);
        await nuevoPedido.save();

        res.status(201).json({ msg: 'Pedido registrado correctamente' });

        enviarEmailBackground(nuevoPedido.toObject());
    } catch (err) {
        console.error('❌ Error al guardar el pedido:', err);
        return res.status(500).json({ msg: 'Error al guardar el pedido' });
    }
});

app.get('/api/pedidos', async (req, res) => {
    try {
        await eliminarEventosPasados();
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        const fechaHoyStr = `${year}-${month}-${day}`;

        const pedidos = await Pedido.find({ fecha: { $gte: fechaHoyStr } }).sort({ fecha: 1 });
        return res.json(pedidos);
    } catch (err) {
        return res.status(500).json({ msg: 'Error al consultar la base de datos' });
    }
});

app.put('/api/pedidos/:id', async (req, res) => {
    try {
        const pedidoActualizado = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pedidoActualizado) return res.status(404).json({ msg: 'Pedido no encontrado' });
        return res.json({ msg: 'Pedido actualizado con éxito', pedido: pedidoActualizado });
    } catch (err) {
        return res.status(500).json({ msg: 'Error al actualizar el pedido' });
    }
});

app.delete('/api/pedidos/:id', async (req, res) => {
    try {
        const pedidoEliminado = await Pedido.findByIdAndDelete(req.params.id);
        if (!pedidoEliminado) return res.status(404).json({ msg: 'Pedido no encontrado' });
        return res.json({ msg: 'Pedido eliminado correctamente' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error al eliminar el pedido' });
    }
});

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});