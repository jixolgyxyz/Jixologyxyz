CREATE TABLE "usuario" (
  "id" INT PRIMARY KEY,
  "email" VARCHAR(320) NOT NULL,
  "telefono" VARCHAR(15),
  "nombre" VARCHAR(255),
  "apellido" VARCHAR(255),
  "fecha_nacimiento" DATE,
  "sobre_mi" VARCHAR(10000),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "jornada" DECIMAL(3,0),
  "id_creador" INT,
  "id_zona_horaria" SMALLINT NOT NULL,
  "id_rol_global" SMALLINT NOT NULL
); 

CREATE TABLE "contrasena_usuario" (
  "id_usuario" INT UNIQUE PRIMARY KEY,
  "contrasena_hash" TEXT NOT NULL,
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "id_autor" INT NOT NULL
);

CREATE TABLE "intercambio_monetario" (
  "id" BIGINT PRIMARY KEY,
  "valor" NUMERIC(5,2),
  "fecha_creacion" TIMESTAMPTZ,
  "id_autor" INT NOT NULL
);

CREATE TABLE "prompt_ia" (
  "id" INT PRIMARY KEY,
  "descripcion" TEXT,
  "id_autor" INT
);

CREATE TABLE "zona_horaria" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" TEXT NOT NULL
);

CREATE TABLE "verificacion" (
  "id_usuario" INT PRIMARY KEY,
  "fecha_envio" TIMESTAMPTZ NOT NULL,
  "completada" BOOLEAN NOT NULL
);

CREATE TABLE "rol_global" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(10) NOT NULL,
  "descripcion" VARCHAR(30)
);

CREATE TABLE "configuracion" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL
);

CREATE TABLE "configuracion_usuario" (
  "id_configuracion" SMALLINT,
  "id_usuario" INT,
  "nombre" VARCHAR(100) NOT NULL,
  "estatus" BOOLEAN NOT NULL,
  PRIMARY KEY ("id_configuracion", "id_usuario")
);

CREATE TABLE "notificacion" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(50) NOT NULL,
  "descripcion" VARCHAR(100),
  "leida" BOOLEAN NOT NULL,
  "fecha_lectura" TIMESTAMPTZ,
  "id_usuario" INT NOT NULL
);

CREATE TABLE "avatar_style" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(20) NOT NULL
);

CREATE TABLE "atributo_avatar" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(20) NOT NULL,
  "id_avatar_style" SMALLINT NOT NULL
);

CREATE TABLE "elemento_inventario_avatar" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(20) NOT NULL,
  "id_atributo_avatar" SMALLINT NOT NULL
);

CREATE TABLE "usuario_inventario_avatar" (
  "id_usuario" INT,
  "id_elemento" INT,
  "fecha_obtencion" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id_usuario", "id_elemento")
);

CREATE TABLE "usuario_avatar" (
  "id_usuario" INT,
  "id_elemento" INT,
  PRIMARY KEY ("id_usuario", "id_elemento")
);

CREATE TABLE "divisa" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "abreviatura" VARCHAR(5) NOT NULL
);

CREATE TABLE "metodologia_proyecto" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL
);

CREATE TABLE "proyecto" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(70) NOT NULL,
  "descripcion" VARCHAR(250),
  "cliente" VARCHAR(100),
  "fecha_inicial" DATE,
  "fecha_final" DATE,
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "dependencia_externa" BOOLEAN,
  "hitos_estimados" SMALLINT,
  "fte" NUMERIC(10,2),
  "presupuesto" NUMERIC(18,2),
  "costo_mensual" NUMERIC(18,2),
  "tolerancia_desviacion" NUMERIC(4,2),
  "peso_presupuesto" NUMERIC(3,2),
  "peso_retraso" NUMERIC(3,2),
  "id_divisa_presupuesto" SMALLINT,
  "id_divisa_costo" SMALLINT,
  "id_modelo_facturacion" SMALLINT,
  "id_complejidad" SMALLINT,
  "id_tipo" SMALLINT,
  "id_estatus" SMALLINT NOT NULL,
  "id_metodologia" SMALLINT NOT NULL,
  "id_creador" INT NOT NULL
);

CREATE TABLE "estatus_proyecto" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL,
  "orden" SMALLINT NOT NULL,
  "es_terminal" BOOLEAN NOT NULL
);

CREATE TABLE "tipo_proyecto" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(30) NOT NULL
);

CREATE TABLE "modelo_facturacion" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(30) NOT NULL
);

CREATE TABLE "complejidad_proyecto" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(10) NOT NULL
);

CREATE TABLE "catalogo_etiqueta_proyecto_predeterminada" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(50) NOT NULL,
  "descripcion" VARCHAR(100),
  "color_bloque" CHAR(7) NOT NULL,
  "color_letra" CHAR(7) NOT NULL
);

CREATE TABLE "etiqueta_proyecto_predeterminada" (
  "id_usuario" INT,
  "id_etiqueta_proyecto_predeterminada" SMALLINT,
  "id_proyecto" INT,
  "fecha_asignacion" TIMESTAMPTZ NOT NULL,
  "id_asignador" INT NOT NULL,
  PRIMARY KEY ("id_usuario", "id_etiqueta_proyecto_predeterminada", "id_proyecto")
);

CREATE TABLE "catalogo_etiqueta_proyecto_personalizada" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(50) NOT NULL,
  "descripcion" VARCHAR(100),
  "color_bloque" CHAR(7) NOT NULL,
  "color_letra" CHAR(7) NOT NULL,
  "id_proyecto" INT NOT NULL,
  "id_creador" INT NOT NULL
);

CREATE TABLE "etiqueta_proyecto_personalizada" (
  "id_usuario" INT,
  "id_etiqueta_proyecto_personalizada" SMALLINT,
  "fecha_asignacion" TIMESTAMPTZ NOT NULL,
  "id_asignador" INT NOT NULL,
  PRIMARY KEY ("id_usuario", "id_etiqueta_proyecto_personalizada")
);

CREATE TABLE "usuario_proyecto_fte" (
  "id_usuario" INT,
  "id_proyecto" INT,
  "cantidad_horas" NUMERIC(2,0),
  "fte" NUMERIC(3,2),
  PRIMARY KEY ("id_usuario", "id_proyecto")
);

CREATE TABLE "invitacion_proyecto" (
  "id" INT PRIMARY KEY,
  "descripcion" VARCHAR(150),
  "aceptada" BOOLEAN NOT NULL,
  "fecha_envio" TIMESTAMPTZ NOT NULL,
  "id_proyecto" INT NOT NULL,
  "id_usuario_destino" INT NOT NULL,
  "id_usuario_creador" INT NOT NULL
);

CREATE TABLE "sprint" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL,
  "objetivo" VARCHAR(250),
  "fecha_inicio" TIMESTAMPTZ,
  "fecha_final" TIMESTAMPTZ,
  "id_proyecto" INT NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_estatus" INT NOT NULL
);

CREATE TABLE "estatus_sprint" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL,
  "orden" SMALLINT NOT NULL,
  "es_terminal" BOOLEAN NOT NULL
);

CREATE TABLE "tipo_backlog_item" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL
);

CREATE TABLE "tipo_backlog_item_hijo_permitido" (
  "id_tipo_padre" SMALLINT NOT NULL,
  "id_tipo_hijo" SMALLINT NOT NULL,
  PRIMARY KEY ("id_tipo_padre", "id_tipo_hijo")
);

CREATE TABLE "backlog_item" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(250),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "fecha_inicio" TIMESTAMPTZ,
  "fecha_vencimiento" TIMESTAMPTZ,
  "es_terminal" BOOLEAN NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_backlog_item_padre" BIGINT,
  "id_usuario_responsable" INT,
  "id_prioridad" SMALLINT,
  "id_tipo" SMALLINT NOT NULL,
  "id_estatus" INT NOT NULL
);

CREATE TABLE "estatus_backlog_item" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL,
  "orden" SMALLINT NOT NULL,
  "es_terminal" BOOLEAN NOT NULL
);

CREATE TABLE "suscripcion_notificacion_backlog_item" (
  "id_usuario" INT,
  "id_backlog_item" BIGINT,
  "fecha" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id_usuario", "id_backlog_item")
);

CREATE TABLE "backlog_item_proyecto" (
  "id" BIGINT PRIMARY KEY,
  "id_proyecto" BIGINT NOT NULL
);

CREATE TABLE "backlog_item_sprint" (
  "id" BIGINT PRIMARY KEY,
  "id_sprint" BIGINT NOT NULL
);

CREATE TABLE "backlog_item_sugerencia_creacion" (
  "id" BIGINT PRIMARY KEY,
  "aceptada" BOOLEAN NOT NULL,
  "id_usuario_acepto" INT
);

CREATE TABLE "prioridad_backlog_item" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL
);

CREATE TABLE "impedimento_backlog_item" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(250),
  "id_backlog_item" BIGINT NOT NULL,
  "id_usuario_creador" INT NOT NULL
);

CREATE TABLE "bitacora_sprint" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(250),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_sprint" BIGINT NOT NULL
);

CREATE TABLE "bitacora_proyecto" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(250),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_proyecto" BIGINT NOT NULL
);

CREATE TABLE "comentario" (
  "id" BIGINT PRIMARY KEY,
  "cuerpo" VARCHAR(50) NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_comentario_padre" BIGINT,
  "id_backlog_item" BIGINT NOT NULL
);

CREATE TABLE "hito" (
  "id" BIGINT PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(250),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "fecha_inicio" TIMESTAMPTZ,
  "fecha_final" TIMESTAMPTZ,
  "id_usuario_creador" INT NOT NULL,
  "id_proyecto" BIGINT NOT NULL,
  "id_estatus" INT NOT NULL
);

CREATE TABLE "estatus_hito" (
  "id" INT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL,
  "orden" SMALLINT NOT NULL,
  "es_terminal" BOOLEAN NOT NULL
);

CREATE TABLE "check_in" (
  "id" BIGINT PRIMARY KEY,
  "descripcion" VARCHAR(250),
  "fecha_creacion" TIMESTAMPTZ NOT NULL,
  "id_usuario_creador" INT NOT NULL,
  "id_proyecto" BIGINT NOT NULL
);

CREATE TABLE "check_in_avance_backlog_items" (
  "id_check_in" BIGINT PRIMARY KEY,
  "cantidad" BIGINT
);

CREATE TABLE "check_in_impedimentos_backlog_items" (
  "id_check_in" BIGINT PRIMARY KEY,
  "cantidad" BIGINT
);

CREATE TABLE "check_in_proximo_paso" (
  "id_check_in" BIGINT,
  "id_proximo_paso" SMALLINT,
  "descripcion" VARCHAR(150) NOT NULL,
  "id_prioridad" SMALLINT NOT NULL,
  PRIMARY KEY ("id_check_in", "id_proximo_paso")
);

CREATE TABLE "prioridad_proximo_paso_check_in" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL
);

CREATE TABLE "check_in_riesgo" (
  "id_check_in" BIGINT,
  "id_riesgo" SMALLINT,
  "descripcion" VARCHAR(150) NOT NULL,
  "id_nivel" SMALLINT NOT NULL,
  PRIMARY KEY ("id_check_in", "id_riesgo")
);

CREATE TABLE "nivel_riesgo_check_in" (
  "id" SMALLINT PRIMARY KEY,
  "nombre" VARCHAR(60) NOT NULL
);

COMMENT ON TABLE "notificacion" IS 'Regla: (Leida=false => FechaLectura NULL) y (Leida=true => FechaLectura NOT NULL)';

ALTER TABLE "usuario" ADD FOREIGN KEY ("id_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario" ADD FOREIGN KEY ("id_zona_horaria") REFERENCES "zona_horaria" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario" ADD FOREIGN KEY ("id_rol_global") REFERENCES "rol_global" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contrasena_usuario" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contrasena_usuario" ADD FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "intercambio_monetario" ADD FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "prompt_ia" ADD FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "verificacion" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "configuracion_usuario" ADD FOREIGN KEY ("id_configuracion") REFERENCES "configuracion" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "configuracion_usuario" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notificacion" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "atributo_avatar" ADD FOREIGN KEY ("id_avatar_style") REFERENCES "avatar_style" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "elemento_inventario_avatar" ADD FOREIGN KEY ("id_atributo_avatar") REFERENCES "atributo_avatar" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_inventario_avatar" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_inventario_avatar" ADD FOREIGN KEY ("id_elemento") REFERENCES "elemento_inventario_avatar" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_avatar" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_avatar" ADD FOREIGN KEY ("id_elemento") REFERENCES "elemento_inventario_avatar" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_divisa_presupuesto") REFERENCES "divisa" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_divisa_costo") REFERENCES "divisa" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_modelo_facturacion") REFERENCES "modelo_facturacion" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_complejidad") REFERENCES "complejidad_proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_tipo") REFERENCES "tipo_proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_estatus") REFERENCES "estatus_proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_metodologia") REFERENCES "metodologia_proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "proyecto" ADD FOREIGN KEY ("id_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_predeterminada" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_predeterminada" ADD FOREIGN KEY ("id_etiqueta_proyecto_predeterminada") REFERENCES "catalogo_etiqueta_proyecto_predeterminada" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_predeterminada" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_predeterminada" ADD FOREIGN KEY ("id_asignador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "catalogo_etiqueta_proyecto_personalizada" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "catalogo_etiqueta_proyecto_personalizada" ADD FOREIGN KEY ("id_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_personalizada" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_personalizada" ADD FOREIGN KEY ("id_etiqueta_proyecto_personalizada") REFERENCES "catalogo_etiqueta_proyecto_personalizada" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "etiqueta_proyecto_personalizada" ADD FOREIGN KEY ("id_asignador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_proyecto_fte" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "usuario_proyecto_fte" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitacion_proyecto" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitacion_proyecto" ADD FOREIGN KEY ("id_usuario_destino") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitacion_proyecto" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sprint" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sprint" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sprint" ADD FOREIGN KEY ("id_estatus") REFERENCES "estatus_sprint" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tipo_backlog_item_hijo_permitido" ADD FOREIGN KEY ("id_tipo_padre") REFERENCES "tipo_backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tipo_backlog_item_hijo_permitido" ADD FOREIGN KEY ("id_tipo_hijo") REFERENCES "tipo_backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_backlog_item_padre") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_usuario_responsable") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_prioridad") REFERENCES "prioridad_backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_tipo") REFERENCES "tipo_backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item" ADD FOREIGN KEY ("id_estatus") REFERENCES "estatus_backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "suscripcion_notificacion_backlog_item" ADD FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "suscripcion_notificacion_backlog_item" ADD FOREIGN KEY ("id_backlog_item") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_proyecto" ADD FOREIGN KEY ("id") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_proyecto" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_sprint" ADD FOREIGN KEY ("id") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_sprint" ADD FOREIGN KEY ("id_sprint") REFERENCES "sprint" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_sugerencia_creacion" ADD FOREIGN KEY ("id") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_sugerencia_creacion" ADD FOREIGN KEY ("id_usuario_acepto") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "impedimento_backlog_item" ADD FOREIGN KEY ("id_backlog_item") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "impedimento_backlog_item" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bitacora_sprint" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bitacora_sprint" ADD FOREIGN KEY ("id_sprint") REFERENCES "sprint" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bitacora_proyecto" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bitacora_proyecto" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comentario" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comentario" ADD FOREIGN KEY ("id_comentario_padre") REFERENCES "comentario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comentario" ADD FOREIGN KEY ("id_backlog_item") REFERENCES "backlog_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "hito" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "hito" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "hito" ADD FOREIGN KEY ("id_estatus") REFERENCES "estatus_hito" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in" ADD FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in" ADD FOREIGN KEY ("id_proyecto") REFERENCES "proyecto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_avance_backlog_items" ADD FOREIGN KEY ("id_check_in") REFERENCES "check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_impedimentos_backlog_items" ADD FOREIGN KEY ("id_check_in") REFERENCES "check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_proximo_paso" ADD FOREIGN KEY ("id_check_in") REFERENCES "check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_proximo_paso" ADD FOREIGN KEY ("id_prioridad") REFERENCES "prioridad_proximo_paso_check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_riesgo" ADD FOREIGN KEY ("id_check_in") REFERENCES "check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "check_in_riesgo" ADD FOREIGN KEY ("id_nivel") REFERENCES "nivel_riesgo_check_in" ("id") DEFERRABLE INITIALLY IMMEDIATE;
