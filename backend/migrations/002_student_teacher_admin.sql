ALTER TABLE justificacion ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(200);
ALTER TABLE justificacion ADD COLUMN IF NOT EXISTS archivo_mime VARCHAR(100);
ALTER TABLE justificacion ADD COLUMN IF NOT EXISTS archivo_contenido BYTEA;

ALTER TYPE origen_asistencia ADD VALUE IF NOT EXISTS 'qr_dinamico';

CREATE TABLE IF NOT EXISTS incidencia_docente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES usuario(id),
    sesion_id UUID NOT NULL REFERENCES sesion_clase(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('falla_pc', 'problema_red', 'otro')),
    descripcion TEXT NOT NULL,
    archivo_nombre VARCHAR(200) NOT NULL,
    archivo_mime VARCHAR(100) NOT NULL,
    archivo_contenido BYTEA NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    revisada_por UUID REFERENCES usuario(id),
    revisada_en TIMESTAMPTZ,
    comentario_admin TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
