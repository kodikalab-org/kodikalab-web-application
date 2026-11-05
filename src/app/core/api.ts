import { InjectionToken } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// Override at deployment if the API is hosted elsewhere. No credentials belong here.
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root', factory: () => 'http://localhost:8080/api',
});

export type Role = 'PRACTICANTE' | 'COACH';
export interface AuthResponse {
  message: string;
  email: string;
  role: Role;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  recoveryCode?: string;
}
export interface RegisterRequest {
  firstName: string; lastName: string; email: string; password: string; role: Role;
}
export interface PractitionerProfile {
  email: string; role: 'PRACTICANTE'; codigoEstudiante: string; carrera: string;
  cicloAcademico: number; nivelCompetitivo: 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO';
  codeforcesHandle: string | null; codeforcesRating: number | null;
  atcoderHandle: string | null; vjudgeHandle: string | null;
}
export interface CoachProfile {
  email: string; role: 'COACH'; especialidadPrincipal: string;
  organizacionClub: string | null; aniosExperiencia: number; presentacion: string | null;
}
export type Profile = PractitionerProfile | CoachProfile;
export type PractitionerRequest = Omit<PractitionerProfile, 'email' | 'role' | 'codeforcesRating'>;
export type CoachRequest = Omit<CoachProfile, 'email' | 'role'>;
export interface ProfileResponse { message: string; profile: Profile; }
export interface RecoveryResponse { message: string; recoveryCode: string; }

export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos completar la operación. Inténtalo de nuevo.';
  if (error.status === 0 || error.status >= 500) return 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
  if (error.status === 401) return 'Credenciales o datos de recuperación inválidos.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  const body = error.error;
  if (typeof body?.message === 'string') return body.message;
  return error.status === 409 ? 'Los datos ya están registrados en otra cuenta.' : 'Revisa los datos ingresados.';
}
