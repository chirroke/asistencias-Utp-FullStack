const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const pool = require('../src/config/db');
const controller = require('../src/controllers/sesionController');

after(async () => pool.end());

const respuesta = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('flujo docente: sesión, QR, WebSocket, asistencia manual, historial y cierre', async () => {
  const client = await pool.connect();
  const queryOriginal = pool.query.bind(pool);
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    pool.query = client.query.bind(client);

    const testId = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
    const docente = await client.query(
      `INSERT INTO usuario (correo, contrasena_hash, nombres, apellidos, rol)
       VALUES ($1, 'integration-test-hash', 'Docente', 'Temporal', 'docente') RETURNING id`,
      [`integration-${testId}@utp.edu.pe`]
    );
    const periodo = await client.query(
      `INSERT INTO periodo_academico (codigo, fecha_inicio, fecha_fin, activo)
       VALUES ($1, CURRENT_DATE, CURRENT_DATE + 120, TRUE) RETURNING id`,
      [`T${testId}`]
    );

    const courseSchema = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'curso'`
    );
    const availableCourseColumns = new Set(courseSchema.rows.map((row) => row.column_name));
    const courseColumns = ['periodo_id', 'docente_id', 'codigo', 'nombre', 'seccion', 'tolerancia_marcado_min', 'umbral_riesgo_pct'];
    const courseValues = [periodo.rows[0].id, docente.rows[0].id, `T${testId}`, 'Curso de integración', '01', 15, 30];
    if (availableCourseColumns.has('tolerancia_tardanza_min')) {
      courseColumns.push('tolerancia_tardanza_min');
      courseValues.push(15);
    }
    const courseParams = courseValues.map((_, i) => `$${i + 1}`).join(', ');
    const curso = await client.query(
      `INSERT INTO curso (${courseColumns.join(', ')}) VALUES (${courseParams}) RETURNING id`,
      courseValues
    );
    const alumnoUser = await client.query(
      `INSERT INTO usuario (correo, contrasena_hash, nombres, apellidos, rol)
       VALUES ($1, 'integration-test-hash', 'Alumno', 'Temporal', 'alumno') RETURNING id`,
      [`integration-alumno-${testId}@utp.edu.pe`]
    );
    await client.query(
      `INSERT INTO alumno (usuario_id, codigo_alumno) VALUES ($1, $2)`,
      [alumnoUser.rows[0].id, `T${testId}`]
    );
    await client.query(
      `INSERT INTO matricula (curso_id, alumno_id, estado) VALUES ($1, $2, 'activa')`,
      [curso.rows[0].id, alumnoUser.rows[0].id]
    );

    const eventos = [];
    const socket = { readyState: 1, sesionId: null, send: (message) => eventos.push(JSON.parse(message)) };
    const req = {
      user: { id: docente.rows[0].id, rol: 'docente' },
      body: { curso_id: curso.rows[0].id },
      params: {}, query: {},
      app: { get: () => ({ clients: new Set([socket]) }) },
    };

    let res = respuesta();
    await controller.abrirSesion(req, res);
    assert.ok([200, 201].includes(res.statusCode), res.body?.error);
    const sesionId = res.body.sesion.id;
    socket.sesionId = sesionId;

    res = respuesta();
    req.body = { sesion_id: sesionId, duracion_segundos: 20 };
    await controller.generarQR(req, res);
    assert.equal(res.statusCode, 200, res.body?.error);
    assert.equal(JSON.parse(res.body.qr_code).sesion_id, sesionId);

    res = respuesta();
    req.params = { id: sesionId };
    await controller.emitirTicketWebSocket(req, res);
    assert.ok(res.body.ticket);

    res = respuesta();
    req.body = { sesion_id: sesionId, alumno_id: alumnoUser.rows[0].id, motivo: 'Prueba' };
    await controller.registrarManual(req, res);
    assert.equal(res.statusCode, 201, res.body?.error);
    assert.equal(eventos.at(-1)?.sesionId, sesionId);

    res = respuesta();
    await controller.obtenerAsistenciaVivo(req, res);
    assert.equal(res.statusCode, 200, res.body?.error);
    assert.equal(res.body.alumnos.find((a) => a.id === alumnoUser.rows[0].id).estado, 'presente');

    res = respuesta();
    req.params = { cursoId: curso.rows[0].id };
    req.query = {};
    await controller.obtenerHistorialCurso(req, res);
    assert.equal(res.statusCode, 200, res.body?.error);
    assert.ok(res.body.sesiones.some((sesion) => sesion.id === sesionId));

    res = respuesta();
    req.params = { id: sesionId };
    await controller.obtenerDetalleSesion(req, res);
    assert.equal(res.statusCode, 200, res.body?.error);
    assert.equal(res.body.alumnos[0].estado, 'presente');

    res = respuesta();
    req.body = { sesion_id: sesionId, motivo: 'Prueba transaccional' };
    await controller.checkinDocente(req, res);
    assert.equal(res.statusCode, 201, res.body?.error);

    res = respuesta();
    await controller.cerrarSesionManual({ ...req, params: { id: sesionId } }, res);
    assert.equal(res.statusCode, 200, res.body?.error);
  } finally {
    if (transactionStarted) await client.query('ROLLBACK');
    pool.query = queryOriginal;
    client.release();
  }
});
