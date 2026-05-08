export type RegisterUserPayload = {
  email: string;
  password: string;
  telefono: string | null;
  nombre: string | null;
  apellido: string | null;
  fecha_nacimiento: string | null;
  sobre_mi: string | null;
  jornada: number | null;
  id_zona_horaria: number;
  id_rol_global: number;
};

export type RegisterUserResponse = {
  message: string;
  auth_id?: string;
};

export type RegisterUserFormValues = {
  email: string;
  password: string;
  telefono: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sobre_mi: string;
  jornada: string;
  id_zona_horaria: string;
  id_rol_global: string;
};

export type AdminUserListItem = {
  id: number;
  email: string;
  nombre: string | null;
  apellido: string | null;
  id_rol_global: number;
  activo: boolean;
};

export type AdminUserRoleBadge = {
  label: string;
  color: string;
  textColor: string;
};