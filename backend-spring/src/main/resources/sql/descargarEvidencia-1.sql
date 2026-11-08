SELECT j.archivo_contenido, j.archivo_mime, j.archivo_nombre, j.alumno_id, c.docente_id
       FROM justificacion j JOIN curso c ON c.id = j.curso_id WHERE j.id = :p1
