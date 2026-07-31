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

// Servir archivos estáticos desde la raíz o la carpeta correspondiente
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
                fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        saveDatabase();

        // -------------------------------------------------------------
        // RUTAS DE AUTENTICACIÓN Y USUARIOS
        // -------------------------------------------------------------

        // Registro de usuario
        app.post('/api/auth/register', async (req, res) => {
            const { nombre, dni, password } = req.body;

            if (!nombre || !dni || !password) {
                return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
            }

            try {
                const stmtCheck = db.prepare('SELECT id FROM usuarios WHERE dni = ?');
                stmtCheck.bind([dni]);
                if (stmtCheck.step()) {
                    stmtCheck.free();
                    return res.status(400).json({ msg: 'El DNI ya se encuentra registrado' });
                }
                stmtCheck.free();

                const hashedPassword = await bcrypt.hash(password, 10);
                const role = (dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';

                db.run(
                    'INSERT INTO usuarios (dni, nombre, password, role) VALUES (?, ?, ?, ?)',
                    [dni, nombre, hashedPassword, role]
                );
                saveDatabase();

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
                const stmt = db.prepare('SELECT * FROM usuarios WHERE dni = ?');
                stmt.bind([dni]);

                if (!stmt.step()) {
                    stmt.free();
                    return res.status(401).json({ msg: 'Usuario no encontrado' });
                }

                const row = stmt.getAsObject();
                stmt.free();

                const match = await bcrypt.compare(password, row.password);
                if (!match) {
                    return res.status(401).json({ msg: 'Contraseña incorrecta' });
                }

                const user = {
                    id: row.id,
                    dni: row.dni,
                    nombre: row.nombre,
                    role: row.role
                };

                return res.json({ msg: 'Login exitoso', user });
            } catch (err) {
                console.error("Error en login:", err);
                return res.status(500).json({ msg: 'Error interno del servidor' });
            }
        });

        // OBTENER TODOS LOS USUARIOS (Para consultar desde cualquier lado)
        app.get('/api/usuarios', (req, res) => {
            try {
                const stmt = db.prepare('SELECT id, dni, nombre, role FROM usuarios ORDER BY id DESC');
                const usuarios = [];

                while (stmt.step()) {
                    usuarios.push(stmt.getAsObject());
                }
                stmt.free();

                return res.json(usuarios);
            } catch (err) {
                console.error("Error al consultar usuarios:", err);
                return res.status(500).json({ msg: 'Error al consultar usuarios' });
            }
        });

        // -------------------------------------------------------------
        // RUTAS DE PEDIDOS DE EVENTOS
        // -------------------------------------------------------------

        // Crear un pedido
        app.post('/api/pedidos', (req, res) => {
            const p = req.body;

            if (!p.titulo || !p.fecha || !p.lugar) {
                return res.status(400).json({ msg: 'Campos requeridos faltantes' });
            }

            try {
                db.run(`
                    INSERT INTO pedidos (
                        titulo, areaResponsable, programa, fecha, horario, lugar,
                        descripcion, responsableNombre, responsableDni, responsableTelefono,
                        objetivo, participantesAprox, publicoGeneral, articulaciones,
                        necesidades, transportePasajeros, ambulancia, ambulanciaHorario,
                        seguro, extensionArt, situacionRevista, horarioDocente,
                        prensa, tipoDifusion, timingEvento, desarmeEvento, suspendeLluvia
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    p.titulo, p.areaResponsable, p.programa, p.fecha, p.horario, p.lugar,
                    p.descripcion, p.responsableNombre, p.responsableDni, p.responsableTelefono,
                    p.objetivo, p.participantesAprox, p.publicoGeneral, p.articulaciones,
                    p.necesidades, p.transportePasajeros, p.ambulancia, p.ambulanciaHorario,
                    p.seguro, p.extensionArt, p.situacionRevista, p.horarioDocente,
                    p.prensa, p.tipoDifusion, p.timingEvento, p.desarmeEvento, p.suspendeLluvia
                ]);

                saveDatabase();
                return res.status(201).json({ msg: 'Pedido registrado correctamente' });
            } catch (err) {
                console.error("Error al insertar pedido:", err);
                return res.status(500).json({ msg: 'Error al guardar el pedido' });
            }
        });

        // Obtener todos los pedidos (Vista Director)
        app.get('/api/pedidos', (req, res) => {
            try {
                const stmt = db.prepare('SELECT * FROM pedidos ORDER BY id DESC');
                const pedidos = [];

                while (stmt.step()) {
                    pedidos.push(stmt.getAsObject());
                }
                stmt.free();

                return res.json(pedidos);
            } catch (err) {
                console.error("Error al obtener pedidos:", err);
                return res.status(500).json({ msg: 'Error al consultar la base de datos' });
            }
        });

        // Iniciar el servidor Express
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });

    } catch (err) {
        console.error("Error al iniciar el servidor SQLite/Express:", err);
    }
}

startServer();