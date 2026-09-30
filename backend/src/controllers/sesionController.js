const pool = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_desarrollo';
const DURACION_SESION_MIN = 120; // duración de la clase si no se especifica

const emitirActualizacion = (req, sesionId, tipo = 'asistencia_actualizada') => {
  const wss = req.app.get('wss');
  if (!wss) return;
  const mensaje = JSON.stringify({ type: tipo, sesionId });
  for (const cliente of wss.clients) {
    if (cliente.readyState === 1 && cliente.sesionId === sesionId) cliente.send(mensaje);
  }
};

const verificarAccesoSesion = async (sesionId, user) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.estado, s.fecha, s.hora_inicio, s.hora_fin_programada, s.hora_cierre_real,
            s.curso_id, c.docente_id
     FROM sesion_clase s JOIN curso c ON c.id = s.curso_id WHERE s.id = $1`,
    [sesionId]
  );
  if (!rows.length) return { status: 404 };
  if (user.rol !== 'admin' && rows[0].docente_id !== user.id) return { status: 403 };
  return { sesion: rows[0] };
};

// -----------------------------------------------------------------------
// POST /api/asistencia/abrir-sesion   { curso_id }
// Crea (o reutiliza) la sesión de clase activa de HOY para ese curso.
// -----------------------------------------------------------------------
const abrirSesion = async (req, res) => {
  const { curso_id } = req.body;
  if (!curso_id) return res.status(400).json({ error: 'curso_id es requerido' });

  try {
    // El curso se busca PRIMERO y siempre se devuelve junto a la sesión:
    // la pantalla de proyección depende de esto para pintar el título
    // (antes solo dependía de datos que le pasaba React Router por
    // "state", y esos se pierden si la página se recarga).
    const curso = await pool.query(
      `SELECT id, nombre, seccion, tolerancia_marcado_min, docente_id FROM curso WHERE id = $1 AND eliminado_en IS NULL`,
      [curso_id]
    );
    if (curso.rows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    if (req.user.rol !== 'admin' && curso.rows[0].docente_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes acceso a este curso' });
    }

    // Si ya hay una sesión activa hoy para este curso, se reutiliza
    // (evita crear una fila nueva cada vez que el docente entra a la pantalla).
    const existente = await pool.query(
      `SELECT * FROM sesion_clase WHERE curso_id = $1 AND estado = 'activa' LIMIT 1`,
      [curso_id]
    );
    if (existente.rows.length > 0) {
      return res.status(200).json({ sesion: existente.rows[0], curso: curso.rows[0] });
    }

    const legacyTolerance = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'sesion_clase'
         AND column_name = 'tolerancia_tardanza_min'`
    );
    const insert = legacyTolerance.rowCount
      ? await pool.query(
        `INSERT INTO sesion_clase
           (curso_id, fecha, hora_inicio, hora_fin_programada, estado, tolerancia_marcado_min, tolerancia_tardanza_min, creado_por)
         VALUES ($1, CURRENT_DATE, now(), now() + ($2 || ' minutes')::interval, 'activa', $3, $3, $4)
         RETURNING *`,
        [curso_id, DURACION_SESION_MIN, curso.rows[0].tolerancia_marcado_min, req.user.id]
      )
      : await pool.query(
        `INSERT INTO sesion_clase
           (curso_id, fecha, hora_inicio, hora_fin_programada, estado, tolerancia_marcado_min, creado_por)
         VALUES ($1, CURRENT_DATE, now(), now() + ($2 || ' minutes')::interval, 'activa', $3, $4)
         RETURNING *`,
        [curso_id, DURACION_SESION_MIN, curso.rows[0].tolerancia_marcado_min, req.user.id]
      );

    res.status(201).json({ sesion: insert.rows[0], curso: curso.rows[0] });
  } catch (error) {
    console.error('Error al abrir la sesión:', error);
    res.status(500).json({ error: 'Error al abrir la sesión de clase' });
  }
};

// -----------------------------------------------------------------------
// POST /api/asistencia/generar-qr   { sesion_id }
// Rota el token de la sesión ya abierta (no crea una fila nueva cada vez).
// Devuelve el PAYLOAD del QR como texto (no como imagen), así el frontend
// lo dibuja con QRCodeSVG sin pasarse del límite de datos de un QR.
// -----------------------------------------------------------------------
const generarQR = async (req, res) => {
  const { sesion_id, duracion_segundos = 20 } = req.body;
  if (!sesion_id) return res.status(400).json({ error: 'sesion_id es requerido' });
  if (!Number.isInteger(duracion_segundos) || duracion_segundos < 5 || duracion_segundos > 60) {
    return res.status(400).json({ error: 'duracion_segundos debe estar entre 5 y 60' });
  }

  try {
    const tokenQR = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${sesion_id}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`)
      .digest('hex')
      .slice(0, 32);

    const expiraEn = new Date(Date.now() + duracion_segundos * 1000);

    const acceso = await verificarAccesoSesion(sesion_id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    const { rows } = await pool.query(
      `UPDATE sesion_clase
         SET token_qr = $1, expira_en = $2
       WHERE id = $3 AND estado = 'activa'
       RETURNING id, expira_en`,
      [tokenQR, expiraEn, sesion_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'La sesión no existe o ya no está activa' });
    }

    // Esto es lo que se dibuja en el QR: un texto corto, no una imagen.
    const qrPayload = JSON.stringify({ sesion_id, token: tokenQR });

    res.json({
      qr_code: qrPayload,
      expira_en: rows[0].expira_en,
    });
  } catch (error) {
    console.error('Error al generar código QR:', error);
    res.status(500).json({ error: 'Error al generar el código QR' });
  }
};

// -----------------------------------------------------------------------
// GET /api/asistencia/sesion/:id/asistencia-vivo
// Roster REAL: todos los matriculados del curso de esa sesión, marcando
// quién ya está presente y quién sigue pendiente.
// -----------------------------------------------------------------------
const obtenerAsistenciaVivo = async (req, res) => {
  const { id } = req.params;

  try {
    const acceso = await verificarAccesoSesion(id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    const query = `
      SELECT
        u.id,
        al.codigo_alumno AS codigo,
        u.nombres || ' ' || u.apellidos AS nombre,
        a.estado,
        to_char(a.registrado_en, 'HH24:MI:SS') AS hora,
        a.puntaje_facial
      FROM sesion_clase s
      JOIN matricula m       ON m.curso_id = s.curso_id AND m.estado = 'activa'
      JOIN alumno al         ON al.usuario_id = m.alumno_id
      JOIN usuario u         ON u.id = al.usuario_id
      LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
      WHERE s.id = $1
      ORDER BY (a.registrado_en IS NULL), a.registrado_en;
    `;
    const { rows } = await pool.query(query, [id]);

    const alumnos = rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      iniciales: r.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
      estado: r.estado ?? 'pendiente',
      hora: r.hora,
      similitud: r.puntaje_facial ? `${(r.puntaje_facial * 100).toFixed(1)}%` : undefined,
    }));

    res.json({ alumnos });
  } catch (error) {
    console.error('Error al obtener asistencia en vivo:', error);
    res.status(500).json({ error: 'Error al obtener la asistencia en vivo' });
  }
};

const emitirTicketWebSocket = async (req, res) => {
  try {
    const acceso = await verificarAccesoSesion(req.params.id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    if (acceso.sesion.estado !== 'activa') return res.status(409).json({ error: 'La sesión ya está cerrada' });
    const ticket = jwt.sign(
      { scope: 'asistencia:live', sesionId: req.params.id },
      JWT_SECRET,
      { expiresIn: '60s' }
    );
    res.json({ ticket });
  } catch (error) {
    console.error('Error al emitir ticket WebSocket:', error);
    res.status(500).json({ error: 'No se pudo preparar la conexión en vivo' });
  }
};

const obtenerHistorialCurso = async (req, res) => {
  const { cursoId } = req.params;
  const { desde, hasta } = req.query;
  if ((desde && Number.isNaN(Date.parse(desde))) || (hasta && Number.isNaN(Date.parse(hasta)))) {
    return res.status(400).json({ error: 'Las fechas desde y hasta deben tener formato válido' });
  }
  try {
    const curso = await pool.query('SELECT id, docente_id FROM curso WHERE id = $1 AND eliminado_en IS NULL', [cursoId]);
    if (!curso.rowCount) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol !== 'admin' && curso.rows[0].docente_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes acceso a este curso' });
    }
    const { rows } = await pool.query(
      `SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin_programada, s.hora_cierre_real, s.estado,
              COUNT(a.id) FILTER (WHERE a.estado = 'presente') AS presentes,
              COUNT(m.alumno_id) AS matriculados
       FROM sesion_clase s
       LEFT JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
       LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       WHERE s.curso_id = $1 AND ($2::date IS NULL OR s.fecha >= $2::date) AND ($3::date IS NULL OR s.fecha <= $3::date)
       GROUP BY s.id
       ORDER BY s.fecha DESC, s.hora_inicio DESC`,
      [cursoId, desde || null, hasta || null]
    );
    res.json({ sesiones: rows.map((s) => ({ ...s, presentes: Number(s.presentes), matriculados: Number(s.matriculados) })) });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial del curso' });
  }
};

const obtenerDetalleSesion = async (req, res) => {
  try {
    const acceso = await verificarAccesoSesion(req.params.id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    const { rows } = await pool.query(
      `SELECT u.id AS alumno_id, al.codigo_alumno AS codigo,
              u.nombres || ' ' || u.apellidos AS nombre, a.estado,
              a.origen, a.registrado_en
       FROM sesion_clase s JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
       JOIN alumno al ON al.usuario_id = m.alumno_id JOIN usuario u ON u.id = al.usuario_id
       LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       WHERE s.id = $1 ORDER BY u.apellidos, u.nombres`,
      [req.params.id]
    );
    res.json({ sesion: acceso.sesion, alumnos: rows.map((a) => ({ ...a, estado: a.estado || 'pendiente' })) });
  } catch (error) {
    console.error('Error al obtener detalle de sesión:', error);
    res.status(500).json({ error: 'No se pudo obtener el detalle de la sesión' });
  }
};

// -----------------------------------------------------------------------
// POST /api/asistencia/manual   { sesion_id, alumno_id, motivo }
// El docente marca presente a un alumno que no pudo escanear el QR.
// -----------------------------------------------------------------------
const registrarManual = async (req, res) => {
  const { sesion_id, alumno_id, motivo } = req.body;
  if (!sesion_id || !alumno_id) {
    return res.status(400).json({ error: 'sesion_id y alumno_id son requeridos' });
  }
  if (req.body.estado && req.body.estado !== 'presente') {
    return res.status(400).json({ error: 'El registro manual del docente solo puede marcar presente. Las faltas y justificaciones tienen flujos separados.' });
  }

  try {
    const acceso = await verificarAccesoSesion(sesion_id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    if (acceso.sesion.estado !== 'activa') return res.status(409).json({ error: 'La sesión ya está cerrada' });
    const matricula = await pool.query(
      `SELECT 1 FROM sesion_clase s JOIN matricula m ON m.curso_id = s.curso_id AND m.alumno_id = $2 AND m.estado = 'activa' WHERE s.id = $1`,
      [sesion_id, alumno_id]
    );
    if (!matricula.rowCount) return res.status(404).json({ error: 'El alumno no tiene matrícula activa en este curso' });
    const { rows } = await pool.query(
      `INSERT INTO asistencia (sesion_id, alumno_id, estado, origen, creado_por)
       VALUES ($1, $2, 'presente', 'manual_docente', $3)
       ON CONFLICT (sesion_id, alumno_id)
       DO UPDATE SET estado = 'presente', origen = 'manual_docente'
       WHERE asistencia.estado <> 'justificada'
       RETURNING *`,
      [sesion_id, alumno_id, req.user.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Esta asistencia ya tiene una justificación aprobada y no se puede cambiar desde el registro manual.' });

    await pool.query(
      `INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES ($1, 'corregir_asistencia', 'asistencia', $2, $3)`,
      [req.user.id, rows[0].id, JSON.stringify({ motivo: motivo || null, estado: 'presente' })]
    );

    emitirActualizacion(req, sesion_id);

    res.status(201).json({ asistencia: rows[0] });
  } catch (error) {
    console.error('Error al registrar asistencia manual:', error);
    res.status(500).json({ error: 'Error al registrar la asistencia manual' });
  }
};

// -----------------------------------------------------------------------
// POST /api/asistencia/checkin-docente   { sesion_id }
// Deja constancia de la hora de check-in del docente, sin clasificar tardanzas.
// -----------------------------------------------------------------------
const checkinDocente = async (req, res) => {
  const { sesion_id } = req.body;
  if (!sesion_id) return res.status(400).json({ error: 'sesion_id es requerido' });

  try {
    const acceso = await verificarAccesoSesion(sesion_id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    if (acceso.sesion.estado !== 'activa') return res.status(409).json({ error: 'La sesión ya está cerrada' });
    const previo = await pool.query(
      `SELECT creado_en AS registrado_en FROM bitacora_auditoria
       WHERE usuario_id = $1 AND accion = 'checkin_docente' AND entidad = 'sesion_clase' AND entidad_id = $2::text
       ORDER BY creado_en LIMIT 1`, [req.user.id, sesion_id]
    );
    if (previo.rowCount) return res.json({ registrado_en: previo.rows[0].registrado_en, ya_registrado: true });
    const registradoEn = new Date();

    await pool.query(
      `INSERT INTO bitacora_auditoria (usuario_id, accion, entidad, entidad_id, datos_despues)
       VALUES ($1, 'checkin_docente', 'sesion_clase', $2, $3)`,
      [req.user.id, sesion_id, JSON.stringify({ registrado_en: registradoEn })]
    );

    res.status(201).json({ registrado_en: registradoEn });
  } catch (error) {
    console.error('Error en check-in docente:', error);
    res.status(500).json({ error: 'Error al registrar el check-in' });
  }
};

const obtenerCheckinDocente = async (req, res) => {
  try {
    const acceso = await verificarAccesoSesion(req.params.id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    const { rows } = await pool.query(
      `SELECT creado_en AS registrado_en FROM bitacora_auditoria
       WHERE usuario_id = $1 AND accion = 'checkin_docente' AND entidad = 'sesion_clase' AND entidad_id = $2::text
       ORDER BY creado_en LIMIT 1`, [req.user.id, req.params.id]
    );
    res.json({ registrado: rows.length > 0, registrado_en: rows[0]?.registrado_en || null });
  } catch (error) {
    console.error('Error al consultar check-in docente:', error.message);
    res.status(500).json({ error: 'No se pudo consultar el check-in' });
  }
};

// -----------------------------------------------------------------------
// Cierre de una sesión (la usa el job automático de app.js).
// Marca falta a los que quedaron pendientes.
// -----------------------------------------------------------------------
const cerrarSesionInterna = async (sesionId, tipoCierre = 'automatico', cerradaPor = null) => {
  await pool.query(
    `INSERT INTO asistencia (sesion_id, alumno_id, estado, origen)
     SELECT s.id, m.alumno_id, 'falta', 'cierre_automatico'
     FROM sesion_clase s
     JOIN matricula m ON m.curso_id = s.curso_id AND m.estado = 'activa'
     WHERE s.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM asistencia a WHERE a.sesion_id = s.id AND a.alumno_id = m.alumno_id
       )`,
    [sesionId]
  );

  await pool.query(
    `UPDATE sesion_clase
       SET estado = 'cerrada', hora_cierre_real = now(), tipo_cierre = $2, cerrada_por = $3
     WHERE id = $1`,
    [sesionId, tipoCierre, cerradaPor]
  );
};

const cerrarSesionManual = async (req, res) => {
  const { id } = req.params;
  try {
    const acceso = await verificarAccesoSesion(id, req.user);
    if (acceso.status) return res.status(acceso.status).json({ error: 'Sesión no encontrada o sin acceso' });
    if (acceso.sesion.estado !== 'activa') return res.status(409).json({ error: 'La sesión ya está cerrada' });
    await cerrarSesionInterna(id, 'manual', req.user.id);
    emitirActualizacion(req, id, 'sesion_cerrada');
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error al cerrar la sesión:', error);
    res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
};

// Revisa cada cierto tiempo si alguna sesión activa ya venció su horario
// (esto es lo que reemplaza al botón manual: el cierre es automático).
const iniciarJobCierreAutomatico = (wss) => {
  setInterval(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT id FROM sesion_clase WHERE estado = 'activa' AND hora_fin_programada < now()`
      );
      for (const { id } of rows) {
        await cerrarSesionInterna(id, 'automatico');
        if (wss) {
          const mensaje = JSON.stringify({ type: 'sesion_cerrada', sesionId: id });
          for (const cliente of wss.clients) {
            if (cliente.readyState === 1 && cliente.sesionId === id) cliente.send(mensaje);
          }
        }
        console.log(`Sesión ${id} cerrada automáticamente por vencimiento de horario.`);
      }
    } catch (error) {
      console.error('Error en el job de cierre automático:', error);
    }
  }, 30 * 1000); // cada 30s
};

module.exports = {
  abrirSesion,
  generarQR,
  obtenerAsistenciaVivo,
  emitirTicketWebSocket,
  obtenerHistorialCurso,
  obtenerDetalleSesion,
  cerrarSesionManual,
  registrarManual,
  checkinDocente,
  obtenerCheckinDocente,
  iniciarJobCierreAutomatico,
};
