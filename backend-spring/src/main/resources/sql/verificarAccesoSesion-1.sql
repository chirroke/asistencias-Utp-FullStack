SELECT s.id, s.estado, s.fecha, s.hora_inicio, s.hora_fin_programada, s.hora_cierre_real,
            s.curso_id, c.docente_id
     FROM sesion_clase s JOIN curso c ON c.id = s.curso_id WHERE s.id = :p1
