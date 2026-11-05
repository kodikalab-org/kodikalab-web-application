export interface PerfilCoach {
  readonly iniciales: string;
  readonly nombre: string;
  readonly usuario: string;
  readonly rol: string;
  readonly especialidad: string;
  readonly organizacion: string;
  readonly anios: number;
  readonly presentacion: string;
}

export interface EquipoCoach {
  readonly iniciales: string;
  readonly nombre: string;
  readonly integrantes: number;
  readonly capacidad: number;
  readonly horario: string;
}

export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada';

export interface SolicitudIngreso {
  readonly iniciales: string;
  readonly nombre: string;
  readonly equipo: string;
  readonly nivel: string;
  readonly fecha: string;
  estado: EstadoSolicitud;
}

export interface AjustesCoach {
  readonly notificaciones: boolean;
  readonly privacidad: boolean;
  readonly idioma: 'es' | 'en';
  readonly temaOscuro: boolean;
}

export interface EstadisticasCoach {
  readonly integrantesActivos: number;
}
