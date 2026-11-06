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

const CONNECTION_MESSAGE = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';

/** True when the request never got a usable answer: no network, a timeout, or a 5xx. */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) return error.status === 0 || error.status >= 500;
  return error instanceof Error && error.name === 'TimeoutError';
}

/**
 * Shared error text for every module except the auth screens. Its output is unchanged
 * from `origin/develop`: 401 and 403 keep their fixed messages and never show the body.
 */
export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos completar la operación. Inténtalo de nuevo.';
  if (error.status === 0 || error.status >= 500) return CONNECTION_MESSAGE;
  if (error.status === 401) return 'Credenciales o datos de recuperación inválidos.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  const body = error.error;
  if (typeof body?.message === 'string') return body.message;
  return error.status === 409 ? 'Los datos ya están registrados en otra cuenta.' : 'Revisa los datos ingresados.';
}

/**
 * Error text for the auth screens (register, login, recovery): the backend message wins for
 * 400, 401, 403 and 409, and timeouts count as connection failures.
 */
export function authApiError(error: unknown): string {
  if (isConnectionError(error)) return CONNECTION_MESSAGE;
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos completar la operación. Inténtalo de nuevo.';
  const body = error.error;
  if (typeof body?.message === 'string' && body.message.trim() !== '') return body.message;
  if (error.status === 401) return 'Credenciales o datos de recuperación inválidos.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  return error.status === 409 ? 'Los datos ya están registrados en otra cuenta.' : 'Revisa los datos ingresados.';
}

/** Per-field messages from the backend `errors` map. Empty when the response has none. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) return {};
  const errors: unknown = error.error?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim() !== ''),
  );
}
