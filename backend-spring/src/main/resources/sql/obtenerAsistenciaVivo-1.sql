SELECT
        u.id,
        al.codigo_alumno AS codigo,
        u.nombres || ' ' || u.apellidos AS nombre,
        a.estado,
        to_char(a.registrado_en, 'HH24:MI:SS') AS hora,
        a.puntaje_facial,
        encode(a.foto_marcacion, 'base64') AS foto_marcacion
      FROM sesion_clase s
      JOIN matricula m       ON m.curso_id = s.curso_id AND m.estado = 'activa'
      JOIN alumno al         ON al.usuario_id = m.alumno_id
      JOIN usuario u         ON u.id = al.usuario_id
      LEFT JOIN asistencia a ON a.sesion_id = s.id AND a.alumno_id = m.alumno_id
      WHERE s.id = :p1
      ORDER BY (a.registrado_en IS NULL), a.registrado_en;
