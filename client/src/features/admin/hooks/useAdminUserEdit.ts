import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAdminUserById,
  updateAdminUserService,
  type UpdateAdminUserPayload,
} from '../services/adminUserEdit.service';

export interface AdminUserEditFormValues {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
  sobre_mi: string;
  jornada: string;
  id_zona_horaria: string;
  id_rol_global: string;
}

const emptyValues: AdminUserEditFormValues = {
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  telefono: '',
  fecha_nacimiento: '',
  sobre_mi: '',
  jornada: '',
  id_zona_horaria: '',
  id_rol_global: '',
};

export function useAdminUserEdit(userId?: number, enabled = true) {
  const [authId, setAuthId] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [values, setValues] = useState<AdminUserEditFormValues>(emptyValues);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUser = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError('');
      setSuccess('');
      return;
    }

    if (!userId || Number.isNaN(userId)) {
      setError('ID de usuario inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = await getAdminUserById(userId);

      setAuthId(user.auth_id);
      setOriginalEmail(user.email ?? '');
      setValues({
        email: user.email ?? '',
        password: '',
        nombre: user.nombre ?? '',
        apellido: user.apellido ?? '',
        telefono: user.telefono ?? '',
        fecha_nacimiento: user.fecha_nacimiento ?? '',
        sobre_mi: user.sobre_mi ?? '',
        jornada: user.jornada?.toString() ?? '',
        id_zona_horaria: user.id_zona_horaria?.toString() ?? '',
        id_rol_global: user.id_rol_global?.toString() ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el usuario.');
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const payload = useMemo<UpdateAdminUserPayload | null>(() => {
    if (!userId || !authId) return null;

    return {
      id: userId,
      auth_id: authId,
      email: values.email.trim().toLowerCase(),
      original_email: originalEmail.trim().toLowerCase(),
      password: values.password.trim() || undefined,
      nombre: values.nombre.trim() || null,
      apellido: values.apellido.trim() || null,
      telefono: values.telefono.trim() || null,
      fecha_nacimiento: values.fecha_nacimiento || null,
      sobre_mi: values.sobre_mi.trim() || null,
      jornada: values.jornada ? Number(values.jornada) : null,
      id_zona_horaria: values.id_zona_horaria
        ? Number(values.id_zona_horaria)
        : null,
      id_rol_global: values.id_rol_global
        ? Number(values.id_rol_global)
        : null,
    };
  }, [authId, originalEmail, userId, values]);

  const submit = async () => {
    if (!payload) {
      throw new Error('No hay un usuario válido para actualizar.');
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await updateAdminUserService(payload);
      setSuccess(response.message || 'Usuario actualizado correctamente.');
      setValues((prev) => ({ ...prev, password: '' }));
      setOriginalEmail(payload.email);
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el usuario.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    values,
    loading,
    saving,
    error,
    success,
    handleChange,
    submit,
    reload: loadUser,
  };
}