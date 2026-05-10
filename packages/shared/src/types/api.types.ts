// Tipos de respuesta API compartidos entre web y api

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Roles y RBAC
export type RolSistema = 'jugador' | 'capitan' | 'cancha_admin' | 'super_admin';

export interface RoleAssignment {
  rol: RolSistema;
  scope_id: string | null;
}

// Respuestas de recursos principales
export interface UserResponse {
  id: string;
  email: string;
  nombre: string;
  telefono: string | null;
  verificado_email: boolean;
  verificado_tel: boolean;
  created_at: string;
  roles: RoleAssignment[];
}

export interface PlayerResponse {
  id: string;
  posicion: string | null;
  pie_habil: string | null;
  fecha_nac: string | null;
  estatura_cm: number | null;
  disponibilidad: Record<string, boolean>;
  foto_url: string | null;
  privacidad: 'publico' | 'semipublico' | 'privado';
  rating_actual: number;
  usuario: Pick<UserResponse, 'id' | 'nombre'>;
}

export interface TeamResponse {
  id: string;
  nombre: string;
  avatar_url: string | null;
  capitan_id: string | null;
  created_at: string;
}

export interface TeamMemberResponse {
  id: string;
  jugador_id: string;
  rol: 'jugador' | 'capitan' | 'dt';
  estado: 'pendiente' | 'activo' | 'saliente';
  joined_at: string;
  jugador: PlayerResponse;
}

export interface VenueResponse {
  id: string;
  nombre: string;
  ubicacion_name: string | null;
  lat: number | null;
  lng: number | null;
  politicas: Record<string, unknown>;
  rating: number;
  owner_id: string | null;
}

export interface FieldResponse {
  id: string;
  cancha_id: string;
  nombre: string | null;
  modalidad: 'F5' | 'F6' | 'F7' | 'FUTSAL';
  precio_base_cents: number;
  duracion_min: number;
}

export interface SlotResponse {
  id: string;
  campo_id: string;
  inicio: string;
  fin: string;
  estado: 'libre' | 'reservado' | 'bloqueado';
  precio_cents: number | null;
}

export interface BookingResponse {
  id: string;
  cancha_id: string | null;
  partido_id: string | null;
  slot_id: string | null;
  estado: 'pendiente' | 'pagada' | 'cancelada' | 'no_presentado';
  importe_cents: number;
  sena_cents: number;
  fees_cents: number;
  expires_at: string | null;
  created_at: string;
}

export interface MatchResponse {
  id: string;
  cancha_id: string | null;
  campo_id: string | null;
  fecha: string;
  modalidad: 'F5' | 'F6' | 'F7' | 'FUTSAL';
  estado: 'programado' | 'jugado' | 'cancelado';
  estado_validacion: 'pendiente' | 'parcial' | 'validado' | 'disputa';
}

export interface PaymentResponse {
  id: string;
  reserva_id: string;
  proveedor: 'mercado_pago' | 'stripe';
  ext_payment_id: string | null;
  estado: 'iniciado' | 'aprobado' | 'rechazado' | 'reversado';
  monto_cents: number;
  moneda: string;
  created_at: string;
}
