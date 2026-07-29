const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
// Cambiamos al puerto 5001 para evitar conflictos de puertos en uso en Windows
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para ver peticiones entrantes en la consola
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Conexión persistente a SQLite
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('-> Conectado a la base de datos SQLite.');
        initDB();
    }
});

// Crear tablas e insertar Director
function initDB() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dni TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
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
            )
        `);

        // Comprobar y crear Director
        db.get('SELECT * FROM usuarios WHERE dni = ?', ['23377971'], async (err, row) => {
            if (err) {
                console.error('Error verificando usuario Director:', err.message);
                return;
            }
            if (!row) {
                const hashedPassword = await bcrypt.hash('123', 10);
                db.run(
                    'INSERT INTO usuarios (dni, nombre, password, role) VALUES (?, ?, ?, ?)',
                    ['23377971', 'Director DGDSYDD', hashedPassword, 'DIRECTOR'],
                    (err) => {
                        if (!err) console.log('-> Usuario Director creado con éxito.');
                    }
                );
            }
        });
    });
}

// --- RUTAS ---

app.post('/api/auth/register', async (req, res) => {
    const { dni, nombre, password } = req.body;
    if (!dni || !password || !nombre) {
        return res.status(400).json({ msg: 'Por favor completa todos los campos.' });
    }

    db.get('SELECT * FROM usuarios WHERE dni = ?', [dni], async (err, row) => {
        if (err) return res.status(500).json({ msg: 'Error en la base de datos.' });
        if (row) {
            return res.status(400).json({ msg: 'El DNI ya se encuentra registrado.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const role = (dni === '23377971') ? 'DIRECTOR' : 'DOCENTE';

            db.run(
                'INSERT INTO usuarios (dni, nombre, password, role) VALUES (?, ?, ?, ?)',
                [dni, nombre, hashedPassword, role],
                function (err) {
                    if (err) return res.status(500).json({ msg: 'Error al registrar el usuario.' });
                    console.log(`-> Usuario registrado: ${nombre} (${dni})`);
                    res.json({ user: { id: this.lastID, dni, nombre, role } });
                }
            );
        } catch (error) {
            res.status(500).json({ msg: 'Error procesando la contraseña.' });
        }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { dni, password } = req.body;

    db.get('SELECT * FROM usuarios WHERE dni = ?', [dni], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ msg: 'El usuario no existe.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Contraseña incorrecta.' });
        }

        res.json({ user: { id: user.id, dni: user.dni, nombre: user.nombre, role: user.role } });
    });
});

app.get('/api/pedidos', (req, res) => {
    db.all('SELECT * FROM pedidos ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ msg: 'Error al obtener pedidos.' });
        res.json(rows);
    });
});

app.post('/api/pedidos', (req, res) => {
    const data = req.body;
    const query = `
        INSERT INTO pedidos (
            titulo, areaResponsable, programa, fecha, horario, lugar, descripcion,
            responsableNombre, responsableDni, responsableTelefono, objetivo,
            participantesAprox, publicoGeneral, articulaciones, necesidades,
            transportePasajeros, ambulancia, ambulanciaHorario, seguro, extensionArt,
            situacionRevista, horarioDocente, prensa, tipoDifusion, timingEvento,
            desarmeEvento, suspendeLluvia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, Object.values(data), function (err) {
        if (err) return res.status(500).json({ msg: 'Error al procesar el pedido.' });
        res.json({ msg: 'Pedido registrado con éxito.' });
    });
});

// Capturar errores no controlados para evitar cierres inesperados
process.on('uncaughtException', (err) => {
    console.error('ERROR NO CONTROLADO CAPTURADO:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('PROMESA RECHAZADA CAPTURADA:', err);
});

// MANTENER EL SERVIDOR ESCUCHANDO CONTINUAMENTE
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`SERVIDOR CORRIENDO EN http://localhost:${PORT}`);
    console.log('====================================================');
});