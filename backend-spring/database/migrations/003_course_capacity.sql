ALTER TABLE curso
    ADD COLUMN IF NOT EXISTS capacidad_alumnos SMALLINT NOT NULL DEFAULT 5;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_curso_capacidad_alumnos'
    ) THEN
        ALTER TABLE curso
            ADD CONSTRAINT chk_curso_capacidad_alumnos
            CHECK (capacidad_alumnos BETWEEN 1 AND 5);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION validar_aforo_matricula()
RETURNS TRIGGER AS $$
DECLARE
    aforo SMALLINT;
    matriculados INT;
BEGIN
    IF NEW.estado <> 'activa' THEN
        RETURN NEW;
    END IF;

    SELECT capacidad_alumnos INTO aforo
    FROM curso
    WHERE id = NEW.curso_id AND eliminado_en IS NULL
    FOR UPDATE;

    SELECT COUNT(*) INTO matriculados
    FROM matricula
    WHERE curso_id = NEW.curso_id
      AND estado = 'activa'
      AND id IS DISTINCT FROM NEW.id;

    IF aforo IS NULL OR matriculados >= aforo THEN
        RAISE EXCEPTION 'El curso alcanzó el máximo de % alumnos.', COALESCE(aforo, 5)
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_aforo_matricula ON matricula;
CREATE TRIGGER trg_validar_aforo_matricula
BEFORE INSERT OR UPDATE OF curso_id, estado ON matricula
FOR EACH ROW EXECUTE FUNCTION validar_aforo_matricula();
