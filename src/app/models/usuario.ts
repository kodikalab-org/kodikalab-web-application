export type RolUsuario = 'PRACTICANTE' | 'COACH';
export type NivelCompetitivo = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO';
export type EstadoVinculacion = 'VINCULADA' | 'PENDIENTE';

export interface PlataformaVinculada {
  plataforma: string;
  usuario: string;
  estado: EstadoVinculacion;
  rating?: number;
}

export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolUsuario;
  codigoEstudiante: string;
  carrera: string;
  ciclo: string;
  distrito?: string;
  nivel: NivelCompetitivo;
  experienciaMeses: number;
  franjaHoraria: string;
  diasDisponibles: string[];
  objetivo: string;
  plataformas: PlataformaVinculada[];
}
