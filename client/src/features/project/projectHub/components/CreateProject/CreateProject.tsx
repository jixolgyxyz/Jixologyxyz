import { useEffect, useState, useRef, useCallback } from 'react';
import {
  useCreateProjectForm,
  minAllowedDate,
  maxAllowedDate
} from '@/features/project/projectHub/hooks/useCreateProjectForm';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import FormPopUp from '@/shared/components/FormPopUp';
import './CreateProject.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
  userId: number;
  isCreate: boolean;
  projectId?: number; 
};

export default function CreateProject({ isOpen, onClose, onCreated, userId, isCreate = true, projectId }: Props) {
  const [isAdditionalDataVisible, setIsAdditionalDataVisible] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const {
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
    retryLoadCatalogs,
    addStackField,
    removeStackField,
    updateStackField,
  } = useCreateProjectForm({
    userId,
    projectId,
    onSuccess: (message) => {
      onCreated(message);
      setIsAdditionalDataVisible(false);
      onClose();
    },
  });

  const shouldShowError = (fieldName: keyof typeof values): boolean => {
    return validationAttemptCount > 0 || Boolean(touchedFields[fieldName]);
  };

  const handleClose = useCallback((): void => {
    setIsAdditionalDataVisible(false);
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  useEffect(() => {
    if (validationAttemptCount === 0 && feedback === null) return;
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [validationAttemptCount, feedback]);

  return (
    <FormPopUp
      eyebrow="Proyectos"
      title={isCreate ? 'Crear Proyecto' : 'Editar Proyecto'}
      subtitle={`${isCreate ? 'Captura' : 'Edita'} primero los datos obligatorios y expande detalles solo cuando realmente los necesites.`}
      isOpen={isOpen}
      onClose={handleClose}
      wide={isAdditionalDataVisible}
      bodyRef={bodyRef}
    >
          {isInitialLoading ? (
            <div className="create-project-modal__state" role="status" aria-live="polite">
              <div className="create-project-modal__spinner" />
              <p className="create-project-modal__state-text">
                Cargando catálogos del formulario...
              </p>
            </div>
          ) : null}

          {!isInitialLoading && loadError ? (
            <div className="create-project-modal__state create-project-modal__state--error">
              <p className="create-project-modal__state-title">
                No se pudieron cargar los catálogos.
              </p>
              <p className="create-project-modal__state-text">{loadError}</p>

              <button
                type="button"
                className="create-project-modal__button create-project-modal__button--primary"
                onClick={() => void retryLoadCatalogs()}
              >
                <span className="create-project-modal__button-text">Reintentar</span>
              </button>
            </div>
          ) : null}

          {!isInitialLoading && !loadError && catalogs ? (
            <form className="create-project-modal__form" onSubmit={handleSubmit} noValidate>
              {feedback?.type === 'error' ? (
                <div
                  className="create-project-modal__feedback create-project-modal__feedback--error"
                  role="alert"
                >
                  <p className="create-project-modal__feedback-description">
                    {feedback.message}
                  </p>
                </div>
              ) : null}

              <fieldset className="create-project-modal__section">
                <div className="create-project-modal__section-header">
                  <h3 className="create-project-modal__section-title">Datos obligatorios</h3>
                  <p className="create-project-modal__section-description">
                    Estos son los datos mínimos para {isCreate && "registrar"} el proyecto.
                  </p>
                </div>

                <div className="create-project-modal__compact-grid">
                  <div className="create-project-modal__field">
                    <label className="create-project-modal__label" htmlFor="nombre">
                      Nombre *
                    </label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      className="create-project-modal__control"
                      value={values.nombre}
                      onChange={handleFieldChange}
                      onBlur={handleFieldBlur}
                      maxLength={70}
                      required
                      placeholder="Ej. Portal interno de seguimiento"
                      aria-invalid={Boolean(errors.nombre) && shouldShowError('nombre')}
                    />
                    {errors.nombre && shouldShowError('nombre') ? (
                      <p className="create-project-modal__error">{errors.nombre}</p>
                    ) : null}
                  </div>

                  <div className="create-project-modal__field">
                    <label className="create-project-modal__label" htmlFor="id_estatus">
                      Estatus *
                    </label>
                    <div className="create-project-modal__select-wrapper">
                      <select
                        id="id_estatus"
                        name="id_estatus"
                        className="create-project-modal__control create-project-modal__select"
                        value={values.id_estatus}
                        onChange={handleFieldChange}
                        onBlur={handleFieldBlur}
                        required
                        aria-invalid={Boolean(errors.id_estatus) && shouldShowError('id_estatus')}
                      >
                        <option value="">Selecciona un estatus</option>
                        {catalogs.estatus_proyecto.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.nombre}
                          </option>
                        ))}
                      </select>

                      <ChevronDownIcon className="create-project-modal__select-icon" />
                    </div>
                    {errors.id_estatus && shouldShowError('id_estatus') ? (
                      <p className="create-project-modal__error">{errors.id_estatus}</p>
                    ) : null}
                  </div>

                  <div className="create-project-modal__field">
                    <label className="create-project-modal__label" htmlFor="id_metodologia">
                      Metodología *
                    </label>
                    <div className="create-project-modal__select-wrapper">
                      <select
                        id="id_metodologia"
                        name="id_metodologia"
                        className="create-project-modal__control create-project-modal__select"
                        value={values.id_metodologia}
                        onChange={handleFieldChange}
                        onBlur={handleFieldBlur}                        
                        required
                        aria-invalid={Boolean(errors.id_metodologia) && shouldShowError('id_metodologia')}
                      >
                        <option value="">Selecciona una metodología</option>
                        {catalogs.metodologia_proyecto.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.nombre}
                          </option>
                        ))}
                      </select>

                      <ChevronDownIcon className="create-project-modal__select-icon" />
                    </div>
                    {errors.id_metodologia && shouldShowError('id_metodologia') ? (
                      <p className="create-project-modal__error">{errors.id_metodologia}</p>
                    ) : null}
                  </div>
                </div>
              </fieldset>

              <div className="create-project-modal__details-toggle-wrapper">
                <button
                  type="button"
                  className="create-project-modal__button create-project-modal__button--secondary"
                  onClick={() =>
                    setIsAdditionalDataVisible((currentValue) => !currentValue)
                  }
                >
                  {isAdditionalDataVisible ? (
                    <ChevronUpIcon className="create-project-modal__button-icon" />
                  ) : (
                    <ChevronDownIcon className="create-project-modal__button-icon" />
                  )}
                  <span className="create-project-modal__button-text">
                    {isAdditionalDataVisible
                      ? 'Ocultar detalles adicionales'
                      : 'Agregar detalles adicionales'}
                  </span>
                </button>
              </div>

              {isAdditionalDataVisible ? (
                <div
                  id="create-project-modal-details"
                  className="create-project-modal__details-panel"
                >
                  <fieldset className="create-project-modal__section">
                    <div className="create-project-modal__section-header">
                      <h3 className="create-project-modal__section-title">
                        Información general
                      </h3>
                      <p className="create-project-modal__section-description">
                        Datos complementarios para mayor contexto del proyecto.
                      </p>
                    </div>

                    <div className="create-project-modal__grid">
                      <div className="create-project-modal__field create-project-modal__field--full">
                        <label className="create-project-modal__label" htmlFor="descripcion">
                          Descripción
                        </label>
                        <textarea
                          id="descripcion"
                          name="descripcion"
                          className="create-project-modal__control create-project-modal__control--textarea"
                          value={values.descripcion}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          rows={4}
                          maxLength={250}
                          placeholder="Describe alcance, objetivo o contexto del proyecto"
                          aria-invalid={Boolean(errors.descripcion) && shouldShowError('descripcion')}
                        />
                        {errors.descripcion && shouldShowError('descripcion') ? (
                          <p className="create-project-modal__error">{errors.descripcion}</p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="cliente">
                          Cliente
                        </label>
                        <input
                          id="cliente"
                          name="cliente"
                          type="text"
                          className="create-project-modal__control"
                          value={values.cliente}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          maxLength={100}
                          placeholder="Ej. Cliente interno / externo"
                          aria-invalid={Boolean(errors.cliente) && shouldShowError('cliente')}
                        />
                        {errors.cliente && shouldShowError('cliente') ? (
                          <p className="create-project-modal__error">{errors.cliente}</p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field create-project-modal__field--checkbox">
                        <label className="create-project-modal__checkbox">
                          <input
                            id="dependencia_externa"
                            name="dependencia_externa"
                            type="checkbox"
                            checked={values.dependencia_externa}
                            onChange={handleFieldChange}
                          />
                          <span>¿Tiene dependencia externa?</span>
                        </label>
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="fecha_inicial">
                          Fecha inicial
                        </label>
                        <input
                          id="fecha_inicial"
                          name="fecha_inicial"
                          type="date"
                          className="create-project-modal__control"
                          value={values.fecha_inicial}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          min={minAllowedDate}
                          max={maxAllowedDate}
                          aria-invalid={Boolean(errors.fecha_inicial) && shouldShowError('fecha_inicial')}
                        />
                        {errors.fecha_inicial && shouldShowError('fecha_inicial') ? (
                          <p className="create-project-modal__error">{errors.fecha_inicial}</p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="fecha_final">
                          Fecha final
                        </label>
                        <input
                          id="fecha_final"
                          name="fecha_final"
                          type="date"
                          className="create-project-modal__control"
                          value={values.fecha_final}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          min={minAllowedDate}
                          max={maxAllowedDate}
                          aria-invalid={Boolean(errors.fecha_final) && shouldShowError('fecha_final')}
                        />
                        {errors.fecha_final && shouldShowError('fecha_final') ? (
                          <p className="create-project-modal__error">{errors.fecha_final}</p>
                        ) : null}
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="create-project-modal__section">
                    <div className="create-project-modal__section-header">
                      <h3 className="create-project-modal__section-title">
                        Planeación y métricas
                      </h3>
                      <p className="create-project-modal__section-description">
                        Presupuesto y parámetros de seguimiento.
                      </p>
                    </div>

                    <div className="create-project-modal__grid">
                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="hitos_estimados">
                          Hitos estimados
                        </label>
                        <input
                          id="hitos_estimados"
                          name="hitos_estimados"
                          type="number"
                          min="0"
                          step="1"
                          className="create-project-modal__control"
                          value={values.hitos_estimados}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          placeholder="0"
                          aria-invalid={Boolean(errors.hitos_estimados) && shouldShowError('hitos_estimados')}
                        />
                        {errors.hitos_estimados && shouldShowError('hitos_estimados') ? (
                          <p className="create-project-modal__error">
                            {errors.hitos_estimados}
                          </p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="presupuesto">
                          Presupuesto
                        </label>
                        <input
                          id="presupuesto"
                          name="presupuesto"
                          type="number"
                          min="0"
                          step="0.01"
                          className="create-project-modal__control"
                          value={values.presupuesto}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          placeholder="0.00"
                          aria-invalid={Boolean(errors.presupuesto) && shouldShowError('presupuesto')}
                        />
                        {errors.presupuesto && shouldShowError('presupuesto') ? (
                          <p className="create-project-modal__error">{errors.presupuesto}</p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label
                          className="create-project-modal__label"
                          htmlFor="id_divisa_presupuesto"
                        >
                          Divisa de presupuesto
                        </label>
                        <div className="create-project-modal__select-wrapper">
                          <select
                            id="id_divisa_presupuesto"
                            name="id_divisa_presupuesto"
                            className="create-project-modal__control create-project-modal__select"
                            value={values.id_divisa_presupuesto}
                            onChange={handleFieldChange}                          
                          >
                            <option value="">Selecciona una divisa</option>
                            {catalogs.divisa.map((divisa) => (
                              <option key={divisa.id} value={divisa.id}>
                                {divisa.nombre} ({divisa.abreviatura})
                              </option>
                            ))}
                          </select>

                          <ChevronDownIcon className="create-project-modal__select-icon" />
                        </div>
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="costo_mensual">
                          Costo mensual
                        </label>
                        <input
                          id="costo_mensual"
                          name="costo_mensual"
                          type="number"
                          min="0"
                          step="0.01"
                          className="create-project-modal__control"
                          value={values.costo_mensual}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          placeholder="0.00"
                          aria-invalid={Boolean(errors.costo_mensual) && shouldShowError('costo_mensual')}
                        />
                        {errors.costo_mensual && shouldShowError('costo_mensual') ? (
                          <p className="create-project-modal__error">{errors.costo_mensual}</p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label
                          className="create-project-modal__label"
                          htmlFor="id_divisa_costo"
                        >
                          Divisa de costo
                        </label>
                        <div className="create-project-modal__select-wrapper">
                          <select
                            id="id_divisa_costo"
                            name="id_divisa_costo"
                            className="create-project-modal__control create-project-modal__select"
                            value={values.id_divisa_costo}
                            onChange={handleFieldChange}                          
                          >
                            <option value="">Selecciona una divisa</option>
                            {catalogs.divisa.map((divisa) => (
                              <option key={divisa.id} value={divisa.id}>
                                {divisa.nombre} ({divisa.abreviatura})
                              </option>
                            ))}
                          </select>

                          <ChevronDownIcon className="create-project-modal__select-icon" />
                        </div>
                      </div>

                      <div className="create-project-modal__field">
                        <label
                          className="create-project-modal__label"
                          htmlFor="tolerancia_desviacion"
                        >
                          Tolerancia de desviación (%)
                        </label>
                        <input
                          id="tolerancia_desviacion"
                          name="tolerancia_desviacion"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="create-project-modal__control"
                          value={values.tolerancia_desviacion}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}
                          placeholder="0.00"
                          aria-invalid={Boolean(errors.tolerancia_desviacion) && shouldShowError('tolerancia_desviacion')}
                        />
                        {errors.tolerancia_desviacion && shouldShowError('tolerancia_desviacion') ? (
                          <p className="create-project-modal__error">
                            {errors.tolerancia_desviacion}
                          </p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label
                          className="create-project-modal__label"
                          htmlFor="peso_presupuesto"
                        >
                          Peso presupuesto
                        </label>
                        <input
                          id="peso_presupuesto"
                          name="peso_presupuesto"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          className="create-project-modal__control"
                          value={values.peso_presupuesto}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          placeholder="0.00"
                          aria-invalid={Boolean(errors.peso_presupuesto) && shouldShowError('peso_presupuesto')}
                        />
                        {errors.peso_presupuesto && shouldShowError('peso_presupuesto') ? (
                          <p className="create-project-modal__error">
                            {errors.peso_presupuesto}
                          </p>
                        ) : null}
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="peso_retraso">
                          Peso retraso
                        </label>
                        <input
                          id="peso_retraso"
                          name="peso_retraso"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          className="create-project-modal__control"
                          value={values.peso_retraso}
                          onChange={handleFieldChange}
                          onBlur={handleFieldBlur}                          
                          placeholder="0.00"
                          aria-invalid={Boolean(errors.peso_retraso) && shouldShowError('peso_retraso')}
                        />
                        {errors.peso_retraso && shouldShowError('peso_retraso') ? (
                          <p className="create-project-modal__error">
                            {errors.peso_retraso}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="create-project-modal__section">
                    <div className="create-project-modal__section-header">
                      <h3 className="create-project-modal__section-title">Clasificación</h3>
                      <p className="create-project-modal__section-description">
                        Catálogos operativos y stack tecnológico.
                      </p>
                    </div>

                    <div className="create-project-modal__grid">
                      <div className="create-project-modal__field">
                        <label
                          className="create-project-modal__label"
                          htmlFor="id_modelo_facturacion"
                        >
                          Modelo de facturación
                        </label>
                        <div className="create-project-modal__select-wrapper">
                          <select
                            id="id_modelo_facturacion"
                            name="id_modelo_facturacion"
                            className="create-project-modal__control create-project-modal__select"
                            value={values.id_modelo_facturacion}
                            onChange={handleFieldChange}
                          >
                            <option value="">Selecciona un modelo</option>
                            {catalogs.modelo_facturacion.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.nombre}
                              </option>
                            ))}
                          </select>

                          <ChevronDownIcon className="create-project-modal__select-icon" />
                        </div>
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="id_complejidad">
                          Complejidad
                        </label>
                        <div className="create-project-modal__select-wrapper">
                          <select
                            id="id_complejidad"
                            name="id_complejidad"
                            className="create-project-modal__control create-project-modal__select"
                            value={values.id_complejidad}
                            onChange={handleFieldChange}
                          >
                            <option value="">Selecciona una complejidad</option>
                            {catalogs.complejidad_proyecto.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.nombre}
                              </option>
                            ))}
                          </select>

                          <ChevronDownIcon className="create-project-modal__select-icon" />
                        </div>
                      </div>

                      <div className="create-project-modal__field">
                        <label className="create-project-modal__label" htmlFor="id_tipo">
                          Tipo de proyecto
                        </label>
                        <div className="create-project-modal__select-wrapper">
                          <select
                            id="id_tipo"
                            name="id_tipo"
                            className="create-project-modal__control create-project-modal__select"
                            value={values.id_tipo}
                            onChange={handleFieldChange}
                          >
                            <option value="">Selecciona un tipo</option>
                            {catalogs.tipo_proyecto.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.nombre}
                              </option>
                            ))}
                          </select>

                          <ChevronDownIcon className="create-project-modal__select-icon" />
                        </div>
                      </div>

                      <div className="create-project-modal__field create-project-modal__field--full">
                        <div className="create-project-modal__stack-header">
                          <label className="create-project-modal__label create-project-modal__label--inline">
                            Stack tecnológico
                          </label>

                          <button
                            type="button"
                            className="create-project-modal__button create-project-modal__button--secondary create-project-modal__button--inline"
                            onClick={addStackField}
                            disabled={isSubmitting}
                          >
                            <PlusIcon className="create-project-modal__button-icon" />
                            <span className="create-project-modal__button-text">
                              Agregar tecnología
                            </span>
                          </button>
                        </div>

                        <div className="create-project-modal__stack-list">
                          {values.stack_tecnologico.map((technology, index) => (
                            <div
                              key={`stack-item-${index}`}
                              className="create-project-modal__stack-row"
                            >
                              <input
                                id={`stack_tecnologico_${index}`}
                                name={`stack_tecnologico_${index}`}
                                type="text"
                                className="create-project-modal__control"
                                value={technology}
                                onChange={(event) =>
                                  updateStackField(index, event.target.value)
                                }
                                placeholder="Ej. React"
                              />

                              <button
                                type="button"
                                className="create-project-modal__button create-project-modal__button--secondary create-project-modal__button--small"
                                onClick={() => removeStackField(index)}
                                disabled={
                                  isSubmitting || values.stack_tecnologico.length === 1
                                }
                              >
                                <MinusIcon className="create-project-modal__button-icon" />
                                <span className="create-project-modal__button-text">
                                  Quitar
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>

                        <p className="create-project-modal__hint">
                          Agrega una tecnología por campo. Puedes crear tantos campos
                          como necesites.
                        </p>
                      </div>
                    </div>
                  </fieldset>
                </div>
              ) : null}

              <div className="create-project-modal__actions">
                <button
                  type="button"
                  className="create-project-modal__button create-project-modal__button--secondary"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  <span className="create-project-modal__button-text">Limpiar</span>
                </button>
                <button
                  type="submit"
                  className="create-project-modal__button create-project-modal__button--primary"
                  disabled={isSubmitting || !hasRequiredFieldsCompleted || !isFormValid}
                >
                  {isSubmitting ? (
                    <span
                      className="create-project-modal__button-spinner"
                    />
                  ) : null}
                  <span className="create-project-modal__button-text">
                    {isSubmitting ? 'Guardando...' : isCreate ? 'Crear proyecto' : 'Guardar cambios'}
                  </span>
                </button>
              </div>
            </form>
          ) : null}
    </FormPopUp>
  );
}