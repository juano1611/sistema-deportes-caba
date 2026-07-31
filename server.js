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

// Servir la carpeta de archivos estáticos 'public'
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// CONEXIÓN A BASE DE DATOS REMOTA (MongoDB Atlas)
// -------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://juano1611:juano1611@cluster0.lldgqos.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado con éxito a MongoDB Cloud'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// -------------------------------------------------------------
// MODELOS DE BASE DE DATOS
// -------------------------------------------------------------

// Modelo de Usuario
const UsuarioSchema = new mongoose.Schema({
    dni: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'DOCENTE' }
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Modelo de Pedido
const PedidoSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
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
    articulaciones: String,
    necesidades: String,
    transportePasajeros: String,
    ambulancia: String,
    ambulanciaHorario: String,
    seguro: String,
    extensionArt: String,
    situacionRevista: String,
    horarioDocente: String,
    prensa: String,
    tipoDifusion: String,
    timingEvento: String,
    desarmeEvento: String,
    suspendeLluvia: String
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', PedidoSchema);

// -------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN
// -------------------------------------------------------------

// Registro de usuario
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

        const nuevoUsuario = new Usuario({
            dni,
            nombre,
            password: hashedPassword,
            role
        });

        await nuevoUsuario.save();

        return res.status(201).json({ msg: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error("Error en registro:", err);
        return res.status(500).json({ msg: 'Error interno del servidor' });
    }
});

// Inicio de sesión
app.post('/api/auth/login', async (req, res) => {
    const { dni, password } = req.body;

    if (!dni || !password) {
        return res.status(400).json({ msg: 'Ingresá DNI y contraseña' });
    }

    try {
        const user = await Usuario.findOne({ dni });
        if (!user) {
            return res.status(401).json({ msg: 'Usuario no encontrado' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }

        return res.json({
            msg: 'Login exitoso',
            user: {
                id: user._id,
                dni: user.dni,
                nombre: user.nombre,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Error en login:", err);
        return res.status(500).json({ msg: 'Error interno del servidor' });
    }
});

// Obtener todos los usuarios registrados
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '-password').sort({ createdAt: -1 });
        return res.json(usuarios);
    } catch (err) {
        return res.status(500).json({ msg: 'Error al consultar usuarios' });
    }
});

// -------------------------------------------------------------
// RUTAS DE PEDIDOS DE EVENTOS
// -------------------------------------------------------------

// Crear un pedido
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
        console.error("Error al insertar pedido:", err);
        return res.status(500).json({ msg: 'Error al guardar el pedido' });
    }
});

// Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ createdAt: -1 });
        return res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos:", err);
        return res.status(500).json({ msg: 'Error al consultar la base de datos' });
    }
});

// Enrutamiento para SPA (Cualquier otra ruta devuelve el index.html de public)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});