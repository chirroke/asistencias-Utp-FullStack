-- Ejecutar una vez desde pgAdmin, conectado a la base asistencia.
CREATE TABLE IF NOT EXISTS password_reset_code (
    usuario_id UUID PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    codigo_hash CHAR(64) NOT NULL,
    token_reset_hash CHAR(64),
    expira_en TIMESTAMPTZ NOT NULL,
    solicitado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verificado_en TIMESTAMPTZ,
    intentos SMALLINT NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 5)
);
