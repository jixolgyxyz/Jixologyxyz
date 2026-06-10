import { useState } from 'react';
import { registerUserService } from '../services/admin.service';
import { getUserIdByEmail, seedStartingAvatar } from '../services/avatarSetup.service';
import type {
  RegisterUserFormValues,
  RegisterUserPayload,
} from '../types/admin.types';

const initialValues: RegisterUserFormValues = {
  email: '',
  password: '',
  telefono: '',
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  sobre_mi: '',
  jornada: '',
  id_zona_horaria: '',
  id_rol_global: '',
};

export function useRegisterUser() {
  const [values, setValues] = useState<RegisterUserFormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setValues(initialValues);
  };

  const buildPayload = (): RegisterUserPayload => {
    return {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      telefono: values.telefono.trim() || null,
      nombre: values.nombre.trim() || null,
      apellido: values.apellido.trim() || null,
      fecha_nacimiento: values.fecha_nacimiento || null,
      sobre_mi: values.sobre_mi.trim() || null,
      jornada: values.jornada ? Number(values.jornada) : 40,
      id_zona_horaria: Number(values.id_zona_horaria),
      id_rol_global: Number(values.id_rol_global),
    };
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload  = buildPayload();
      const response = await registerUserService(payload);

      // Seed starting avatar using the user's full name as the RNG seed
      // (falls back to email when no name was provided)
      const seed   = [values.nombre.trim(), values.apellido.trim()].filter(Boolean).join(' ')
                     || payload.email;
      const userId = await getUserIdByEmail(payload.email);
      await seedStartingAvatar(userId, seed);

      resetForm();
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    values,
    loading,
    error,
    success,
    handleChange,
    submit,
    resetForm,
  };
}