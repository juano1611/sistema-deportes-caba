const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.sqlite');

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

let db;

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
    }
}

async function startServer() {
    try {
        const SQL = await initSqlJs();

        if (fs.existsSync(DB_FILE)) {
            const filebuffer = fs.readFileSync(DB_FILE);
            db = new SQL.Database(filebuffer);
        } else {
            db = new SQL.Database();
        }

        // Crear tablas
        db.run(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dni TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'DOCENTE'
            );
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                areaResponsable TEXT,
                programa TEXT,
                fecha TEXT,
                horario TEXT,
                lugar TEXT,
                descripcion TEXT,
                responsableNombre TEXT,
                responsableDni TEXT,
                responsableTelefono TEXT,
                objetivo TEXT,
                participantesAprox INTEGER,
                publicoGeneral INTEGER,
                articulaciones TEXT,
                necesidades TEXT,
                transportePasajeros TEXT,
                ambulancia TEXT,
                ambulanciaHorario TEXT,
                seguro TEXT,
                extensionArt TEXT,
                situacionRevista TEXT,
                horarioDocente TEXT,
                prensa TEXT,
                tipoDifusion TEXT,
                timingEvento TEXT,
                desarmeEvento TEXT,
                suspendeLluvia TEXT,
                fechaCreacion TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Comprobar y crear Director por defecto
        const userCheck = db.exec("SELECT COUNT(*) as count FROM usuarios;");
        const userCount = userCheck.length > 0 ? userCheck[0].values[0][0] : 0;

        if (userCount === 0) {
            const defaultPassword = bcrypt.hashSync('123456', 10);
            db.run(
                "INSERT INTO usuarios (dni, nombre, password, role) VALUES (?, ?, ?, ?)",
                ['23377971', 'Director DGDSYDD', defaultPassword, 'DIRECTOR']
            );
            console.log('Usuario Director creado -> DNI: 23377971');
        }

        saveDatabase();
        console.log('Base de datos inicializada correctamente.');

        app.listen(PORT, () => {
            console.log(`Servidor activo en el puerto ${PORT}`);
        });
    } catch (err) {
        console.error("Error al iniciar el servidor:", err);
    }
}

// CONTROLADORES DE AUTENTICACIÓN
function handleLogin(req, res) {
    const { dni, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM usuarios WHERE dni = :dni');
        stmt.bind({ ':dni': String(dni).trim() });

        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();

            if (bcrypt.compareSync(password, user.password)) {
                // Solo el DNI 23377971 obtiene el rol DIRECTOR
                const assignedRole = (user.dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';
                return res.json({
                    user: {
                        id: user.id,
                        nombre: user.nombre,
                        dni: user.dni,
                        role: assignedRole
                    }
                });
            }
        } else {
            stmt.free();
        }

        res.status(401).json({ msg: 'Usuario o contraseña incorrectos' });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
}

function handleRegister(req, res) {
    const { nombre, dni, password } = req.body;
    const cleanDni = String(dni).trim();

    try {
        const stmt = db.prepare('SELECT id FROM usuarios WHERE dni = :dni');
        stmt.bind({ ':dni': cleanDni });
        if (stmt.step()) {
            stmt.free();
            return res.status(400).json({ msg: 'El DNI ingresado ya se encuentra registrado.' });
        }
        stmt.free();

        // Asignación de rol según el DNI
        const role = (cleanDni === '23377971') ? 'DIRECTOR' : 'DOCENTE';
        const hashedPassword = bcrypt.hashSync(password, 10);

        db.run(
            'INSERT INTO usuarios (nombre, dni, password, role) VALUES (?, ?, ?, ?)',
            [nombre, cleanDni, hashedPassword, role]
        );
        saveDatabase();

        res.status(201).json({ msg: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ msg: 'Error al registrar usuario' });
    }
}

// RUTAS API DE AUTENTICACIÓN
app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);
app.post('/api/auth/register', handleRegister);
app.post('/api/register', handleRegister);

// RUTAS API DE PEDIDOS CON VALIDACIÓN DE ROLES

// Visualizar pedidos (Disponible para el Director)
app.get('/api/pedidos', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM pedidos ORDER BY id DESC');
        const pedidos = [];
        while (stmt.step()) {
            pedidos.push(stmt.getAsObject());
        }
        stmt.free();
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ msg: 'Error al obtener pedidos' });
    }
});

// Crear pedidos (Solo permitido para rol DOCENTE / DNI distinto a Director)
app.post('/api/pedidos', (req, res) => {
    const d = req.body;

    // Validación de seguridad: El DNI del director no debe registrar pedidos
    if (d.responsableDni === '23377971') {
        return res.status(403).json({ msg: 'El usuario Director solo tiene permisos de visualización.' });
    }

    try {
        db.run(`
            INSERT INTO pedidos (
                titulo, areaResponsable, programa, fecha, horario, lugar, descripcion,
                responsableNombre, responsableDni, responsableTelefono, objetivo,
                participantesAprox, publicoGeneral, articulaciones, necesidades,
                transportePasajeros, ambulancia, ambulanciaHorario, seguro, extensionArt,
                situacionRevista, horarioDocente, prensa, tipoDifusion, timingEvento,
                desarmeEvento, suspendeLluvia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            d.titulo || '', d.areaResponsable || '', d.programa || '', d.fecha || '', d.horario || '', d.lugar || '', d.descripcion || '',
            d.responsableNombre || '', d.responsableDni || '', d.responsableTelefono || '', d.objetivo || '',
            d.participantesAprox || 0, d.publicoGeneral || 0, d.articulaciones || '', d.necesidades || '',
            d.transportePasajeros || '', d.ambulancia || 'No', d.ambulanciaHorario || '', d.seguro || '', d.extensionArt || 'No',
            d.situacionRevista || '', d.horarioDocente || '', d.prensa || 'No', d.tipoDifusion || '', d.timingEvento || '',
            d.desarmeEvento || '', d.suspendeLluvia || 'No'
        ]);

        saveDatabase();
        res.status(201).json({ msg: 'Pedido creado exitosamente' });
    } catch (err) {
        console.error("Error al guardar pedido:", err);
        res.status(500).json({ msg: 'Error al guardar pedido' });
    }
});

// Fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

startServer();