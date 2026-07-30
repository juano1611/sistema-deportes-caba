const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

// Conexión asíncrona a la base de datos
async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
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

    await db.exec(`
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

    console.log('Base de datos conectada correctamente.');
}

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu-email@gmail.com',
        pass: 'tu-contraseña-o-app-password'
    }
});

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.post('/api/login', async (req, res) => {
    const { dni, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM usuarios WHERE dni = ?', [dni]);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        res.json({
            id: user.id,
            nombre: user.nombre,
            dni: user.dni,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) {
            return res.status(404).json({ error: 'No existe una cuenta registrada con ese correo electrónico.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000).toISOString();

        await db.run('UPDATE usuarios SET resetToken = ?, resetTokenExpires = ? WHERE id = ?', [token, expires, user.id]);

        const resetLink = `http://${req.headers.host}/reset-password.html?token=${token}`;

        const mailOptions = {
            from: '"Sistema Deportes CABA" <tu-email@gmail.com>',
            to: email,
            subject: 'Restablecimiento de Contraseña',
            html: `
                <h2>Solicitud de cambio de contraseña</h2>
                <p>Hola ${user.nombre},</p>
                <p>Haz clic en el siguiente botón para restablecer tu contraseña:</p>
                <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a>
                <p>Este enlace expirará en 1 hora.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await db.get('SELECT * FROM usuarios WHERE resetToken = ? AND resetTokenExpires > ?', [token, new Date().toISOString()]);
        if (!user) {
            return res.status(400).json({ error: 'El token es inválido o ha expirado.' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await db.run('UPDATE usuarios SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ message: 'Tu contraseña ha sido restablecida exitosamente.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al restablecer contraseña.' });
    }
});

// ==========================================
// RUTAS DE PEDIDOS
// ==========================================

app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await db.all('SELECT * FROM pedidos ORDER BY id DESC');
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
});

app.post('/api/pedidos', async (req, res) => {
    const data = req.body;
    try {
        await db.run(`
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

        res.status(201).json({ message: 'Pedido creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar el pedido' });
    }
});

// Inicializar DB y luego arrancar servidor
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
    });
}).catch(err => {
    console.error('Error al iniciar la base de datos:', err);
});