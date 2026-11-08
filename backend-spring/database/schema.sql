--
-- PostgreSQL database dump
--

\restrict ZKyXVIq0lBFZwshQQUXwhF8DxM6kH7t9Ydg1KwAEJ1aBhxnkjDzj2pO5Sz9Etv0

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: accion_auditoria; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accion_auditoria AS ENUM (
    'inicio_sesion',
    'cierre_sesion_usuario',
    'crear',
    'actualizar',
    'eliminar',
    'cerrar_sesion_clase',
    'aprobar_justificacion',
    'rechazar_justificacion',
    'corregir_asistencia',
    'exportar_reporte',
    'checkin_docente'
);


--
-- Name: estado_asistencia; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_asistencia AS ENUM (
    'presente',
    'falta',
    'justificada',
    'tardanza'
);


--
-- Name: estado_justificacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_justificacion AS ENUM (
    'pendiente',
    'aprobada',
    'rechazada'
);


--
-- Name: estado_matricula; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_matricula AS ENUM (
    'activa',
    'retirada'
);


--
-- Name: estado_sesion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_sesion AS ENUM (
    'programada',
    'activa',
    'cerrada'
);


--
-- Name: nivel_alerta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nivel_alerta AS ENUM (
    'advertencia',
    'critico'
);


--
-- Name: origen_asistencia; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.origen_asistencia AS ENUM (
    'qr_selfie',
    'cierre_automatico',
    'manual_docente',
    'qr_dinamico'
);


--
-- Name: resultado_intento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resultado_intento AS ENUM (
    'exito',
    'qr_expirado',
    'qr_invalido',
    'fuera_de_horario',
    'no_matriculado',
    'ya_registrado',
    'rostro_no_detectado',
    'rostro_no_coincide'
);


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'docente',
    'alumno',
    'admin'
);


--
-- Name: tipo_cierre; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_cierre AS ENUM (
    'manual',
    'automatico'
);


--
-- Name: validar_aforo_matricula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_aforo_matricula() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ DECLARE aforo SMALLINT; matriculados INT; BEGIN IF NEW.estado <> 'activa' THEN RETURN NEW; END IF; SELECT capacidad_alumnos INTO aforo FROM curso WHERE id=NEW.curso_id AND eliminado_en IS NULL FOR UPDATE; SELECT COUNT(*) INTO matriculados FROM matricula WHERE curso_id=NEW.curso_id AND estado='activa' AND id IS DISTINCT FROM NEW.id; IF aforo IS NULL OR matriculados >= aforo THEN RAISE EXCEPTION 'El curso alcanzó el máximo de % alumnos.', COALESCE(aforo,5) USING ERRCODE='23514'; END IF; RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerta_riesgo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerta_riesgo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    curso_id uuid NOT NULL,
    nivel public.nivel_alerta NOT NULL,
    porcentaje_asistencia numeric(5,2) NOT NULL,
    umbral_aplicado numeric(5,2) NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    leida_en timestamp with time zone,
    generada_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_alerta_porcentaje CHECK (((porcentaje_asistencia >= (0)::numeric) AND (porcentaje_asistencia <= (100)::numeric))),
    CONSTRAINT chk_alerta_umbral CHECK (((umbral_aplicado >= (0)::numeric) AND (umbral_aplicado <= (100)::numeric)))
);


--
-- Name: alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumno (
    usuario_id uuid NOT NULL,
    codigo_alumno character varying(20) NOT NULL,
    foto_referencia_url character varying(500),
    rostro_embedding text,
    rostro_modelo character varying(50),
    rostro_actualizado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    foto_referencia bytea
);


--
-- Name: asistencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sesion_id uuid NOT NULL,
    alumno_id uuid NOT NULL,
    estado public.estado_asistencia NOT NULL,
    origen public.origen_asistencia NOT NULL,
    registrado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    puntaje_facial numeric(5,4),
    minutos_tardanza integer,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    foto_marcacion bytea,
    CONSTRAINT chk_asistencia_minutos_tardanza CHECK (((minutos_tardanza IS NULL) OR (minutos_tardanza >= 0))),
    CONSTRAINT chk_asistencia_puntaje_facial CHECK (((puntaje_facial IS NULL) OR ((puntaje_facial >= (0)::numeric) AND (puntaje_facial <= (1)::numeric))))
);


--
-- Name: bitacora_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_auditoria (
    id bigint NOT NULL,
    usuario_id uuid,
    accion public.accion_auditoria NOT NULL,
    entidad character varying(50) NOT NULL,
    entidad_id character varying(64),
    datos_antes jsonb,
    datos_despues jsonb,
    direccion_ip inet,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bitacora_auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_auditoria_id_seq OWNED BY public.bitacora_auditoria.id;


--
-- Name: curso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    periodo_id uuid NOT NULL,
    docente_id uuid NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    seccion character varying(10) NOT NULL,
    tolerancia_marcado_min integer CONSTRAINT curso_tolerancia_tardanza_min_not_null NOT NULL,
    umbral_riesgo_pct numeric(5,2) NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    eliminado_en timestamp with time zone,
    tolerancia_tardanza_min integer CONSTRAINT curso_tolerancia_tardanza_min_not_null1 NOT NULL,
    capacidad_alumnos smallint DEFAULT 5 NOT NULL,
    CONSTRAINT chk_curso_capacidad_alumnos CHECK (((capacidad_alumnos >= 1) AND (capacidad_alumnos <= 5))),
    CONSTRAINT chk_curso_tolerancia CHECK ((tolerancia_marcado_min >= 0)),
    CONSTRAINT chk_curso_umbral_riesgo CHECK (((umbral_riesgo_pct >= (0)::numeric) AND (umbral_riesgo_pct <= (100)::numeric)))
);


--
-- Name: incidencia_docente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidencia_docente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    docente_id uuid NOT NULL,
    sesion_id uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    descripcion text NOT NULL,
    archivo_nombre character varying(200) NOT NULL,
    archivo_mime character varying(100) NOT NULL,
    archivo_contenido bytea NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    revisada_por uuid,
    revisada_en timestamp with time zone,
    comentario_admin text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT incidencia_docente_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[]))),
    CONSTRAINT incidencia_docente_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['falla_pc'::character varying, 'problema_red'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: intento_asistencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intento_asistencia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sesion_id uuid NOT NULL,
    alumno_id uuid NOT NULL,
    resultado public.resultado_intento NOT NULL,
    puntaje_facial numeric(5,4),
    selfie_url character varying(500),
    direccion_ip inet,
    info_dispositivo character varying(255),
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_intento_puntaje_facial CHECK (((puntaje_facial IS NULL) OR ((puntaje_facial >= (0)::numeric) AND (puntaje_facial <= (1)::numeric))))
);


--
-- Name: justificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.justificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    curso_id uuid NOT NULL,
    motivo text NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    archivo_url character varying(500),
    estado public.estado_justificacion NOT NULL,
    revisada_por uuid,
    revisada_en timestamp with time zone,
    comentario_docente text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    archivo_nombre character varying(200),
    archivo_mime character varying(100),
    archivo_contenido bytea,
    CONSTRAINT chk_justificacion_fechas CHECK ((fecha_fin >= fecha_inicio))
);


--
-- Name: justificacion_asistencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.justificacion_asistencia (
    justificacion_id uuid NOT NULL,
    asistencia_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: matricula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    curso_id uuid NOT NULL,
    alumno_id uuid NOT NULL,
    estado public.estado_matricula NOT NULL,
    retirada_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid
);


--
-- Name: parametro_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametro_sistema (
    clave character varying(50) NOT NULL,
    valor character varying(255) NOT NULL,
    descripcion character varying(255),
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_por uuid
);


--
-- Name: password_reset_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_code (
    usuario_id uuid NOT NULL,
    codigo_hash character(64) NOT NULL,
    token_reset_hash character(64),
    expira_en timestamp with time zone NOT NULL,
    solicitado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    verificado_en timestamp with time zone,
    intentos smallint DEFAULT 0 NOT NULL,
    CONSTRAINT password_reset_code_intentos_check CHECK (((intentos >= 0) AND (intentos <= 5)))
);


--
-- Name: periodo_academico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodo_academico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(10) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    CONSTRAINT chk_periodo_fechas CHECK ((fecha_fin >= fecha_inicio))
);


--
-- Name: sesion_clase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesion_clase (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    curso_id uuid NOT NULL,
    fecha date NOT NULL,
    hora_inicio timestamp with time zone NOT NULL,
    hora_fin_programada timestamp with time zone NOT NULL,
    hora_cierre_real timestamp with time zone,
    estado public.estado_sesion NOT NULL,
    tipo_cierre public.tipo_cierre,
    cerrada_por uuid,
    tolerancia_marcado_min integer,
    qr_secreto character varying(64),
    qr_ventana_seg integer,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    tolerancia_tardanza_min integer CONSTRAINT sesion_clase_tolerancia_tardanza_min_not_null1 NOT NULL,
    token_qr character varying(255),
    expira_en timestamp with time zone,
    CONSTRAINT chk_sesion_qr_ventana CHECK (((qr_ventana_seg IS NULL) OR (qr_ventana_seg > 0))),
    CONSTRAINT chk_sesion_tolerancia CHECK ((tolerancia_marcado_min >= 0))
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    correo character varying(150) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    rol public.rol_usuario NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    ultimo_acceso_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    actualizado_en timestamp with time zone,
    actualizado_por uuid,
    eliminado_en timestamp with time zone
);


--
-- Name: bitacora_auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_auditoria ALTER COLUMN id SET DEFAULT nextval('public.bitacora_auditoria_id_seq'::regclass);


--
-- Name: alerta_riesgo alerta_riesgo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_riesgo
    ADD CONSTRAINT alerta_riesgo_pkey PRIMARY KEY (id);


--
-- Name: alumno alumno_codigo_alumno_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_codigo_alumno_key UNIQUE (codigo_alumno);


--
-- Name: alumno alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_pkey PRIMARY KEY (usuario_id);


--
-- Name: asistencia asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT asistencia_pkey PRIMARY KEY (id);


--
-- Name: bitacora_auditoria bitacora_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_auditoria
    ADD CONSTRAINT bitacora_auditoria_pkey PRIMARY KEY (id);


--
-- Name: curso curso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_pkey PRIMARY KEY (id);


--
-- Name: incidencia_docente incidencia_docente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencia_docente
    ADD CONSTRAINT incidencia_docente_pkey PRIMARY KEY (id);


--
-- Name: intento_asistencia intento_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intento_asistencia
    ADD CONSTRAINT intento_asistencia_pkey PRIMARY KEY (id);


--
-- Name: justificacion_asistencia justificacion_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion_asistencia
    ADD CONSTRAINT justificacion_asistencia_pkey PRIMARY KEY (justificacion_id, asistencia_id);


--
-- Name: justificacion justificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT justificacion_pkey PRIMARY KEY (id);


--
-- Name: matricula matricula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_pkey PRIMARY KEY (id);


--
-- Name: parametro_sistema parametro_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametro_sistema
    ADD CONSTRAINT parametro_sistema_pkey PRIMARY KEY (clave);


--
-- Name: password_reset_code password_reset_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_code
    ADD CONSTRAINT password_reset_code_pkey PRIMARY KEY (usuario_id);


--
-- Name: periodo_academico periodo_academico_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT periodo_academico_codigo_key UNIQUE (codigo);


--
-- Name: periodo_academico periodo_academico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT periodo_academico_pkey PRIMARY KEY (id);


--
-- Name: sesion_clase sesion_clase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_clase
    ADD CONSTRAINT sesion_clase_pkey PRIMARY KEY (id);


--
-- Name: asistencia uq_asistencia_sesion_alumno; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT uq_asistencia_sesion_alumno UNIQUE (sesion_id, alumno_id);


--
-- Name: matricula uq_matricula_curso_alumno; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT uq_matricula_curso_alumno UNIQUE (curso_id, alumno_id);


--
-- Name: usuario usuario_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_correo_key UNIQUE (correo);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: idx_alerta_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_alumno ON public.alerta_riesgo USING btree (alumno_id);


--
-- Name: idx_alerta_curso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_curso ON public.alerta_riesgo USING btree (curso_id);


--
-- Name: idx_asistencia_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencia_alumno ON public.asistencia USING btree (alumno_id);


--
-- Name: idx_asistencia_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencia_sesion ON public.asistencia USING btree (sesion_id);


--
-- Name: idx_bitacora_entidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_entidad ON public.bitacora_auditoria USING btree (entidad, entidad_id);


--
-- Name: idx_bitacora_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_usuario ON public.bitacora_auditoria USING btree (usuario_id);


--
-- Name: idx_curso_docente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curso_docente ON public.curso USING btree (docente_id);


--
-- Name: idx_curso_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curso_periodo ON public.curso USING btree (periodo_id);


--
-- Name: idx_intento_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intento_alumno ON public.intento_asistencia USING btree (alumno_id);


--
-- Name: idx_intento_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intento_sesion ON public.intento_asistencia USING btree (sesion_id);


--
-- Name: idx_justificacion_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_justificacion_alumno ON public.justificacion USING btree (alumno_id);


--
-- Name: idx_justificacion_curso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_justificacion_curso ON public.justificacion USING btree (curso_id);


--
-- Name: idx_matricula_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matricula_alumno ON public.matricula USING btree (alumno_id);


--
-- Name: idx_matricula_curso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matricula_curso ON public.matricula USING btree (curso_id);


--
-- Name: idx_sesion_curso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesion_curso ON public.sesion_clase USING btree (curso_id);


--
-- Name: idx_sesion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesion_fecha ON public.sesion_clase USING btree (fecha);


--
-- Name: matricula trg_validar_aforo_matricula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_aforo_matricula BEFORE INSERT OR UPDATE OF curso_id, estado ON public.matricula FOR EACH ROW EXECUTE FUNCTION public.validar_aforo_matricula();


--
-- Name: alerta_riesgo fk_alerta_alumno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_riesgo
    ADD CONSTRAINT fk_alerta_alumno FOREIGN KEY (alumno_id) REFERENCES public.alumno(usuario_id);


--
-- Name: alerta_riesgo fk_alerta_curso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_riesgo
    ADD CONSTRAINT fk_alerta_curso FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: alumno fk_alumno_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT fk_alumno_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: alumno fk_alumno_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT fk_alumno_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: alumno fk_alumno_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT fk_alumno_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: asistencia fk_asistencia_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT fk_asistencia_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: asistencia fk_asistencia_alumno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT fk_asistencia_alumno FOREIGN KEY (alumno_id) REFERENCES public.alumno(usuario_id);


--
-- Name: asistencia fk_asistencia_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT fk_asistencia_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: asistencia fk_asistencia_sesion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT fk_asistencia_sesion FOREIGN KEY (sesion_id) REFERENCES public.sesion_clase(id);


--
-- Name: bitacora_auditoria fk_bitacora_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_auditoria
    ADD CONSTRAINT fk_bitacora_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: curso fk_curso_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT fk_curso_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: curso fk_curso_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT fk_curso_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: curso fk_curso_docente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT fk_curso_docente FOREIGN KEY (docente_id) REFERENCES public.usuario(id);


--
-- Name: curso fk_curso_periodo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT fk_curso_periodo FOREIGN KEY (periodo_id) REFERENCES public.periodo_academico(id);


--
-- Name: intento_asistencia fk_intento_alumno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intento_asistencia
    ADD CONSTRAINT fk_intento_alumno FOREIGN KEY (alumno_id) REFERENCES public.alumno(usuario_id);


--
-- Name: intento_asistencia fk_intento_sesion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intento_asistencia
    ADD CONSTRAINT fk_intento_sesion FOREIGN KEY (sesion_id) REFERENCES public.sesion_clase(id);


--
-- Name: justificacion fk_justificacion_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT fk_justificacion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: justificacion fk_justificacion_alumno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT fk_justificacion_alumno FOREIGN KEY (alumno_id) REFERENCES public.alumno(usuario_id);


--
-- Name: justificacion_asistencia fk_justificacion_asistencia_asistencia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion_asistencia
    ADD CONSTRAINT fk_justificacion_asistencia_asistencia FOREIGN KEY (asistencia_id) REFERENCES public.asistencia(id);


--
-- Name: justificacion_asistencia fk_justificacion_asistencia_justificacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion_asistencia
    ADD CONSTRAINT fk_justificacion_asistencia_justificacion FOREIGN KEY (justificacion_id) REFERENCES public.justificacion(id);


--
-- Name: justificacion fk_justificacion_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT fk_justificacion_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: justificacion fk_justificacion_curso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT fk_justificacion_curso FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: justificacion fk_justificacion_revisada_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justificacion
    ADD CONSTRAINT fk_justificacion_revisada_por FOREIGN KEY (revisada_por) REFERENCES public.usuario(id);


--
-- Name: matricula fk_matricula_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT fk_matricula_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: matricula fk_matricula_alumno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT fk_matricula_alumno FOREIGN KEY (alumno_id) REFERENCES public.alumno(usuario_id);


--
-- Name: matricula fk_matricula_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT fk_matricula_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: matricula fk_matricula_curso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT fk_matricula_curso FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: parametro_sistema fk_parametro_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametro_sistema
    ADD CONSTRAINT fk_parametro_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: periodo_academico fk_periodo_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT fk_periodo_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: periodo_academico fk_periodo_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo_academico
    ADD CONSTRAINT fk_periodo_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: sesion_clase fk_sesion_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_clase
    ADD CONSTRAINT fk_sesion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: sesion_clase fk_sesion_cerrada_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_clase
    ADD CONSTRAINT fk_sesion_cerrada_por FOREIGN KEY (cerrada_por) REFERENCES public.usuario(id);


--
-- Name: sesion_clase fk_sesion_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_clase
    ADD CONSTRAINT fk_sesion_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: sesion_clase fk_sesion_curso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_clase
    ADD CONSTRAINT fk_sesion_curso FOREIGN KEY (curso_id) REFERENCES public.curso(id);


--
-- Name: usuario fk_usuario_actualizado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id);


--
-- Name: usuario fk_usuario_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: incidencia_docente incidencia_docente_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencia_docente
    ADD CONSTRAINT incidencia_docente_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.usuario(id);


--
-- Name: incidencia_docente incidencia_docente_revisada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencia_docente
    ADD CONSTRAINT incidencia_docente_revisada_por_fkey FOREIGN KEY (revisada_por) REFERENCES public.usuario(id);


--
-- Name: incidencia_docente incidencia_docente_sesion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencia_docente
    ADD CONSTRAINT incidencia_docente_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesion_clase(id);


--
-- Name: password_reset_code password_reset_code_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_code
    ADD CONSTRAINT password_reset_code_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZKyXVIq0lBFZwshQQUXwhF8DxM6kH7t9Ydg1KwAEJ1aBhxnkjDzj2pO5Sz9Etv0

