const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { iniciarJobCierreAutomatico } = require('./src/controllers/sesionController');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_desarrollo';

// Los clientes se autentican primero con un ticket corto emitido por la API.
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/ws/asistencia') return socket.destroy();
    const claims = jwt.verify(url.searchParams.get('ticket') || '', JWT_SECRET);
    if (claims.scope !== 'asistencia:live' || !claims.sesionId) return socket.destroy();
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.sesionId = claims.sesionId;
      wss.emit('connection', ws, request);
    });
  } catch {
    socket.destroy();
  }
});

app.set('wss', wss);

// Middleware de CORS antes de las rutas
app.use(cors({
  origin: 'http://localhost:5173', // Puerto por defecto de Vite
  credentials: true
}));

app.use(express.json());

// Importar rutas
try {
  const authRoutes = require('./src/routes/authRoutes');
  app.use('/api/auth', authRoutes);
} catch (error) {
  console.error('Error al cargar las rutas de autenticación:', error.message);
}

const cursoRoutes = require('./src/routes/cursoRoutes');
app.use('/api/cursos', cursoRoutes);

const asistenciaRoutes = require('./src/routes/asistenciaRoutes');
app.use('/api/asistencia', asistenciaRoutes);

app.use('/api/alumno', require('./src/routes/alumnoRoutes'));
app.use('/api/docente', require('./src/routes/docenteRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
  console.log(`=================================`);

  // Cierra automáticamente las sesiones cuyo horario ya venció
  // (reemplaza al botón manual "Cerrar Sesión" en la proyección).
  iniciarJobCierreAutomatico(wss);
});
