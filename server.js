const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Servir archivos estáticos deshabilitando ETag para forzar la actualización permanente
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
    profesoresAsignados: [String],
    prensa: String,
    tipoDifusion: String,
    suspendeLluvia: String,
    fechaReprogramacion: String
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', PedidoSchema);

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
        return res.status(201).json({ msg: 'Pedido registrado correctamente' });
    } catch (err) {
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