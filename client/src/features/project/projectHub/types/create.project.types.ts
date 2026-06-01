export type ProjectCatalogOption = {
  id: number;
  nombre: string;
};

export type ProjectCurrencyOption = ProjectCatalogOption & {
  abreviatura: string;
};

export type ProjectStatusOption = ProjectCatalogOption & {
  orden: number;
  es_terminal: boolean;
};

// Usuario seleccionable para invitar como PM al crear el proyecto.
export type ProjectUserOption = {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
};

export type ProjectCatalogs = {
  divisa: ProjectCurrencyOption[];
  metodologia_proyecto: ProjectCatalogOption[];
  estatus_proyecto: ProjectStatusOption[];
  tipo_proyecto: ProjectCatalogOption[];
  modelo_facturacion: ProjectCatalogOption[];
  complejidad_proyecto: ProjectCatalogOption[];
  usuarios: ProjectUserOption[];
};

export type CreateProjectFormValues = {
  nombre: string;
  descripcion: string;
  cliente: string;
  fecha_inicial: string;
  fecha_final: string;
  dependencia_externa: boolean;
  hitos_estimados: string;
  presupuesto: string;
  costo_mensual: string;
  tolerancia_desviacion: string;
  peso_presupuesto: string;
  peso_retraso: string;
  id_divisa_presupuesto: string;
  id_divisa_costo: string;
  id_modelo_facturacion: string;
  id_complejidad: string;
  id_tipo: string;
  id_metodologia: string;
  stack_tecnologico: string[];
  // IDs de usuarios que se invitarán como PM al crear el proyecto.
  pm_user_ids: number[];
};

export type CreateProjectFormErrors = Partial<
  Record<
    | 'nombre'
    | 'descripcion'
    | 'cliente'
    | 'fecha_inicial'
    | 'fecha_final'
    | 'hitos_estimados'
    | 'presupuesto'
    | 'costo_mensual'
    | 'tolerancia_desviacion'
    | 'peso_presupuesto'
    | 'peso_retraso'
    | 'id_metodologia',
    string
  >
>;

export type CreateProjectPayload = {
  nombre: string;
  descripcion: string | null;
  cliente: string | null;
  fecha_inicial: string | null;
  fecha_final: string | null;
  dependencia_externa: boolean;
  hitos_estimados: number | null;
  presupuesto: number | null;
  costo_mensual: number | null;
  tolerancia_desviacion: number | null;
  peso_presupuesto: number | null;
  peso_retraso: number | null;
  id_divisa_presupuesto: number | null;
  id_divisa_costo: number | null;
  id_modelo_facturacion: number | null;
  id_complejidad: number | null;
  id_tipo: number | null;
  id_metodologia: number;
  id_creador: number;
  stack_tecnologico: string[];
  pm_user_ids: number[];
};

export type CreateProjectResponse = {
  id: number;
  message: string;
};

export type ProjectFormFeedback =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;