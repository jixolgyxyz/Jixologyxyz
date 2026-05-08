import { useCallback, useEffect, useState, useMemo } from 'react';
import type { ChangeEvent, ComponentProps, FocusEvent } from 'react';
import {
  createProject,
  updateCreateProyectData,
  getCreateProjectCatalogs,
  getAllCreateProyectData,
} from '@/features/project/projectHub/services/create.project';
import type {
  CreateProjectFormErrors,
  CreateProjectFormValues,
  CreateProjectPayload,
  ProjectCatalogs,
  ProjectFormFeedback,
} from '@/features/project/projectHub/types/create.project.types';

export const minAllowedDate = '2000-01-01';
export const maxAllowedDate = '2100-12-31';

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>;
type TouchedFields = Partial<Record<keyof CreateProjectFormValues, boolean>>;

type UseCreateProjectFormReturn = {
  catalogs: ProjectCatalogs | null;
  values: CreateProjectFormValues;
  errors: CreateProjectFormErrors;
  feedback: ProjectFormFeedback;
  isInitialLoading: boolean;
  isSubmitting: boolean;
  loadError: string | null;
  validationAttemptCount: number;
  hasRequiredFieldsCompleted: boolean;
  isFormValid: boolean;
  touchedFields: TouchedFields;
  handleFieldChange: (event: ChangeEvent<FieldElement>) => void;
  handleFieldBlur: (event: FocusEvent<FieldElement>) => void;
  handleSubmit: FormSubmitHandler;
  handleReset: () => void;
  retryLoadCatalogs: () => Promise<void>;
  addStackField: () => void;
  removeStackField: (index: number) => void;
  updateStackField: (index: number, value: string) => void;
};

type UseCreateProjectFormOptions = {
  userId: number;
  projectId?: number;
  onSuccess?: (message: string) => void;
};

function buildInitialValues(catalogs?: ProjectCatalogs | null): CreateProjectFormValues {
  return {
    nombre: '',
    descripcion: '',
    cliente: '',
    fecha_inicial: '',
    fecha_final: '',
    dependencia_externa: false,
    hitos_estimados: '',
    presupuesto: '',
    costo_mensual: '',
    tolerancia_desviacion: '',
    peso_presupuesto: '',
    peso_retraso: '',
    id_divisa_presupuesto: String(catalogs?.divisa[0]?.id ?? ''),
    id_divisa_costo: String(catalogs?.divisa[0]?.id ?? ''),
    id_modelo_facturacion: String(catalogs?.modelo_facturacion[0]?.id ?? ''),
    id_complejidad: String(catalogs?.complejidad_proyecto[0]?.id ?? ''),
    id_tipo: String(catalogs?.tipo_proyecto[0]?.id ?? ''),
    id_estatus: '',
    id_metodologia: '',
    stack_tecnologico: [''],
  };
}

function parseOptionalInteger(value: string): number | null {
  if (value.trim() === '') return null;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) return null;

  return parsedValue;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null;

  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) return null;

  return parsedValue;
}

function parseOptionalId(value: string): number | null {
  if (value.trim() === '') return null;

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) return null;

  return parsedValue;
}

function parseRequiredId(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    throw new Error('ID requerido inválido.');
  }

  return parsedValue;
}

function normalizeStack(values: string[]): string[] {
  return values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}

function validateForm(values: CreateProjectFormValues): CreateProjectFormErrors {
  const errors: CreateProjectFormErrors = {};

  const trimmedNombre = values.nombre.trim();
  const trimmedDescripcion = values.descripcion.trim();
  const trimmedCliente = values.cliente.trim();

  if (trimmedNombre.length === 0) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (trimmedNombre.length > 70) {
    errors.nombre = 'El nombre no puede exceder 70 caracteres.';
  }

  if (trimmedDescripcion.length > 250) {
    errors.descripcion = 'La descripción no puede exceder 250 caracteres.';
  }

  if (trimmedCliente.length > 100) {
    errors.cliente = 'El cliente no puede exceder 100 caracteres.';
  }

  if (
    values.fecha_inicial &&
    (values.fecha_inicial < minAllowedDate || values.fecha_inicial > maxAllowedDate)
  ) {
    errors.fecha_inicial = 'La fecha inicial debe estar dentro de un rango válido.';
  }

  if (
    values.fecha_final &&
    (values.fecha_final < minAllowedDate || values.fecha_final > maxAllowedDate)
  ) {
    errors.fecha_final = 'La fecha final debe estar dentro de un rango válido.';
  }

  if (
    values.fecha_inicial.length > 0 &&
    values.fecha_final.length > 0 &&
    values.fecha_final < values.fecha_inicial
  ) {
    errors.fecha_final = 'La fecha final no puede ser anterior a la fecha inicial.';
  }

  const hitosEstimados = parseOptionalInteger(values.hitos_estimados);
  if (
    values.hitos_estimados.trim().length > 0 &&
    (hitosEstimados === null || hitosEstimados < 0)
  ) {
    errors.hitos_estimados = 'Ingresa un entero válido mayor o igual a 0.';
  }

  const presupuesto = parseOptionalNumber(values.presupuesto);
  if (
    values.presupuesto.trim().length > 0 &&
    (presupuesto === null || presupuesto < 0)
  ) {
    errors.presupuesto = 'Ingresa un presupuesto válido mayor o igual a 0.';
  }

  const costoMensual = parseOptionalNumber(values.costo_mensual);
  if (
    values.costo_mensual.trim().length > 0 &&
    (costoMensual === null || costoMensual < 0)
  ) {
    errors.costo_mensual = 'Ingresa un costo mensual válido mayor o igual a 0.';
  }

  const tolerancia = parseOptionalNumber(values.tolerancia_desviacion);
  if (
    values.tolerancia_desviacion.trim().length > 0 &&
    (tolerancia === null || tolerancia < 0 || tolerancia > 100)
  ) {
    errors.tolerancia_desviacion = 'La tolerancia debe estar entre 0 y 100.';
  }

  const pesoPresupuesto = parseOptionalNumber(values.peso_presupuesto);
  if (
    values.peso_presupuesto.trim().length > 0 &&
    (pesoPresupuesto === null || pesoPresupuesto < 0 || pesoPresupuesto > 1)
  ) {
    errors.peso_presupuesto = 'El peso debe estar entre 0 y 1.';
  }

  const pesoRetraso = parseOptionalNumber(values.peso_retraso);
  if (
    values.peso_retraso.trim().length > 0 &&
    (pesoRetraso === null || pesoRetraso < 0 || pesoRetraso > 1)
  ) {
    errors.peso_retraso = 'El peso debe estar entre 0 y 1.';
  }

  if (values.id_estatus.trim().length === 0) {
    errors.id_estatus = 'Selecciona un estatus.';
  }

  if (values.id_metodologia.trim().length === 0) {
    errors.id_metodologia = 'Selecciona una metodología.';
  }

  return errors;
}

function hasRequiredFields(values: CreateProjectFormValues): boolean {
  return (
    values.nombre.trim().length > 0 &&
    values.id_estatus.trim().length > 0 &&
    values.id_metodologia.trim().length > 0
  );
}

function normalizePayload(
  values: CreateProjectFormValues,
  userId: number,
): CreateProjectPayload {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    cliente: values.cliente.trim() || null,
    fecha_inicial: values.fecha_inicial || null,
    fecha_final: values.fecha_final || null,
    dependencia_externa: values.dependencia_externa,
    hitos_estimados: parseOptionalInteger(values.hitos_estimados),
    presupuesto: parseOptionalNumber(values.presupuesto),
    costo_mensual: parseOptionalNumber(values.costo_mensual),
    tolerancia_desviacion: parseOptionalNumber(values.tolerancia_desviacion),
    peso_presupuesto: parseOptionalNumber(values.peso_presupuesto),
    peso_retraso: parseOptionalNumber(values.peso_retraso),
    id_divisa_presupuesto: parseOptionalId(values.id_divisa_presupuesto),
    id_divisa_costo: parseOptionalId(values.id_divisa_costo),
    id_modelo_facturacion: parseOptionalId(values.id_modelo_facturacion),
    id_complejidad: parseOptionalId(values.id_complejidad),
    id_tipo: parseOptionalId(values.id_tipo),
    id_estatus: parseRequiredId(values.id_estatus),
    id_metodologia: parseRequiredId(values.id_metodologia),
    id_creador: userId,
    stack_tecnologico: normalizeStack(values.stack_tecnologico),
  };
}

export function useCreateProjectForm(
  options: UseCreateProjectFormOptions,
): UseCreateProjectFormReturn {
  const [catalogs, setCatalogs] = useState<ProjectCatalogs | null>(null);
  const [values, setValues] = useState<CreateProjectFormValues>(buildInitialValues());
  const [errors, setErrors] = useState<CreateProjectFormErrors>({});
  const [feedback, setFeedback] = useState<ProjectFormFeedback>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationAttemptCount, setValidationAttemptCount] = useState(0);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});

  const loadCatalogs = useCallback(async (): Promise<void> => {
    setIsInitialLoading(true);
    setLoadError(null);

    try {
      const response = await getCreateProjectCatalogs();

      setCatalogs(response);
      setValues((currentValues) => ({
        ...buildInitialValues(response),
        ...currentValues,
        id_divisa_presupuesto:
          currentValues.id_divisa_presupuesto || String(response.divisa[0]?.id ?? ''),
        id_divisa_costo:
          currentValues.id_divisa_costo || String(response.divisa[0]?.id ?? ''),
        id_modelo_facturacion:
          currentValues.id_modelo_facturacion ||
          String(response.modelo_facturacion[0]?.id ?? ''),
        id_complejidad:
          currentValues.id_complejidad ||
          String(response.complejidad_proyecto[0]?.id ?? ''),
        id_tipo: currentValues.id_tipo || String(response.tipo_proyecto[0]?.id ?? ''),
      }));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const loadEditProyectData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const projectValues = await getAllCreateProyectData(options.projectId!, options.userId);
      setValues(projectValues);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, [options.projectId, options.userId]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (options.projectId) void loadEditProyectData();
  }, [options.projectId, loadEditProyectData]);

  const handleFieldChange = (event: ChangeEvent<FieldElement>): void => {
    const fieldName = event.target.name as keyof CreateProjectFormValues;
    const nextValue =
      event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value;

    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [fieldName]: nextValue,
      };

      if (validationAttemptCount > 0) {
        setErrors(validateForm(nextValues));
      } else {
        setErrors((currentErrors) => {
          if (!(fieldName in currentErrors)) {
            return currentErrors;
          }

          const nextErrors = { ...currentErrors };
          delete nextErrors[fieldName as keyof CreateProjectFormErrors];
          return nextErrors;
        });
      }

      return nextValues;
    });

    setFeedback(null);
  };

  const handleFieldBlur = (event: FocusEvent<FieldElement>): void => {
    const fieldName = event.target.name as keyof CreateProjectFormValues;

    setTouchedFields((currentValues) => ({
      ...currentValues,
      [fieldName]: true,
    }));

    setErrors((currentErrors) => {
      const nextErrors = validateForm(values);

      if (fieldName in nextErrors) {
        return {
          ...currentErrors,
          [fieldName]: nextErrors[fieldName as keyof CreateProjectFormErrors],
        };
      }

      if (fieldName in currentErrors) {
        const cleanedErrors = { ...currentErrors };
        delete cleanedErrors[fieldName as keyof CreateProjectFormErrors];
        return cleanedErrors;
      }

      return currentErrors;
    });
  };

  const updateStackField = (index: number, value: string): void => {
    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        stack_tecnologico: currentValues.stack_tecnologico.map((item, currentIndex) =>
          currentIndex === index ? value : item,
        ),
      };

      if (validationAttemptCount > 0) {
        setErrors(validateForm(nextValues));
      }

      return nextValues;
    });

    setFeedback(null);
  };

  const addStackField = (): void => {
    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        stack_tecnologico: [...currentValues.stack_tecnologico, ''],
      };

      if (validationAttemptCount > 0) {
        setErrors(validateForm(nextValues));
      }

      return nextValues;
    });

    setFeedback(null);
  };

  const removeStackField = (index: number): void => {
    setValues((currentValues) => {
      const nextStack =
        currentValues.stack_tecnologico.length === 1
          ? ['']
          : currentValues.stack_tecnologico.filter((_, currentIndex) => currentIndex !== index);

      const nextValues = {
        ...currentValues,
        stack_tecnologico: nextStack,
      };

      if (validationAttemptCount > 0) {
        setErrors(validateForm(nextValues));
      }

      return nextValues;
    });

    setFeedback(null);
  };

  const handleReset = (): void => {
    setValues(buildInitialValues(catalogs));
    setErrors({});
    setFeedback(null);
    setValidationAttemptCount(0);
    setTouchedFields({});
  };

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFeedback({
        type: 'error',
        message: 'Revisa los campos marcados antes de guardar.',
      });
      setValidationAttemptCount((currentValue) => currentValue + 1);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = normalizePayload(values, options.userId);

      if (options.projectId) {
        await updateCreateProyectData(options.projectId, payload);
        options.onSuccess?.(`Proyecto "${payload.nombre}" actualizado correctamente.`);
      } else {
        const response = await createProject(payload);
        setValues(buildInitialValues(catalogs));
        options.onSuccess?.(`${response.message} ID: ${response.id}.`);
      }

      setErrors({});
      setValidationAttemptCount(0);
      setTouchedFields({});
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const computedValidationErrors = useMemo(() => {
    return validateForm(values);
  }, [values]);

  const hasRequiredFieldsCompleted = useMemo(() => {
    return hasRequiredFields(values);
  }, [values]);

  const isFormValid = useMemo(() => {
    return Object.keys(computedValidationErrors).length === 0;
  }, [computedValidationErrors]);

  return {
    catalogs,
    values,
    errors,
    feedback,
    isInitialLoading,
    isSubmitting,
    loadError,
    validationAttemptCount,
    hasRequiredFieldsCompleted,
    isFormValid,
    touchedFields,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    handleReset,
    retryLoadCatalogs: loadCatalogs,
    addStackField,
    removeStackField,
    updateStackField,
  };
}