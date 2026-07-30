const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
    }
}

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu-email@gmail.com',
        pass: 'tu-contraseña-o-app-password'
    }
});

async function startServer() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_FILE)) {
        const filebuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(filebuffer);
    } else {
        db = new SQL.Database();
    }

    // 1. Crear tabla usuarios si no existe
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dni TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            resetToken TEXT,
            resetTokenExpires TEXT
        );
    `);

    // 2. Verificar y agregar columnas de manera segura sin romper la ejecucion
    const columnsResult = db.exec("PRAGMA table_info(usuarios);");
    const existingColumns = columnsResult.length > 0 
        ? columnsResult[0].values.map(col => col[1]) 
        : [];

    if (!existingColumns.includes('email')) {
        try { db.run("ALTER TABLE usuarios ADD COLUMN email TEXT;"); } catch (e) {}
    }
    if (!existingColumns.includes('resetToken')) {
        try { db.run("ALTER TABLE usuarios ADD COLUMN resetToken TEXT;"); } catch (e) {}
    }
    if (!existingColumns.includes('resetTokenExpires')) {
        try { db.run("ALTER TABLE usuarios ADD COLUMN resetTokenExpires TEXT;"); } catch (e) {}
    }

    // 3. Crear tabla pedidos si no existe
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

    saveDatabase();
    console.log('Base de datos WASM inicializada correctamente.');

    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
}

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.post('/api/login', (req, res) => {
    const { dni, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM usuarios WHERE dni = :dni');
        stmt.bind({ ':dni': dni });

        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();

            if (bcrypt.compareSync(password, user.password)) {
                return res.json({
                    id: user.id,
                    nombre: user.nombre,
                    dni: user.dni,
                    email: user.email || null,
                    role: user.role
                });
            }
        } else {
            stmt.free();
        }

        res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM usuarios WHERE email = :email');
        stmt.bind({ ':email': email });

        if (!stmt.step()) {
            stmt.free();
            return res.status(404).json({ error: 'No existe una cuenta registrada con ese correo.' });
        }

        const user = stmt.getAsObject();
        stmt.free();

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000).toISOString();

        db.run('UPDATE usuarios SET resetToken = ?, resetTokenExpires = ? WHERE id = ?', [token, expires, user.id]);
        saveDatabase();

        const resetLink = `http://${req.headers.host}/reset-password.html?token=${token}`;

        await transporter.sendMail({
            from: '"Sistema Deportes CABA" <tu-email@gmail.com>',
            to: email,
            subject: 'Restablecimiento de Contraseña',
            html: `<p>Haz clic para restablecer tu contraseña: <a href="${resetLink}">Restablecer</a></p>`
        });

        res.json({ message: 'Correo enviado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
});

app.post('/api/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM usuarios WHERE resetToken = :token AND resetTokenExpires > :now');
        stmt.bind({ ':token': token, ':now': new Date().toISOString() });

        if (!stmt.step()) {
            stmt.free();
            return res.status(400).json({ error: 'El token es inválido o expiró.' });
        }

        const user = stmt.getAsObject();
        stmt.free();

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE usuarios SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?', [hashedPassword, user.id]);
        saveDatabase();

        res.json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al restablecer la contraseña.' });
    }
});

// ==========================================
// RUTAS DE PEDIDOS
// ==========================================

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
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

app.post('/api/pedidos', (req, res) => {
    const data = req.body;
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
            data.titulo, data.areaResponsable, data.programa, data.fecha, data.horario, data.lugar, data.descripcion,
            data.responsableNombre, data.responsableDni, data.responsableTelefono, data.objetivo,
            data.participantesAprox, data.publicoGeneral, data.articulaciones, data.necesidades,
            data.transportePasajeros, data.ambulancia, data.ambulanciaHorario, data.seguro, data.extensionArt,
            data.situacionRevista, data.horarioDocente, data.prensa, data.tipoDifusion, data.timingEvento,
            data.desarmeEvento, data.suspendeLluvia
        ]);

        saveDatabase();
        res.status(201).json({ message: 'Pedido creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar pedido' });
    }
});

startServer();