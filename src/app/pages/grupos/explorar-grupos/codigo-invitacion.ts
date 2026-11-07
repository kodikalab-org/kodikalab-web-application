import { HttpErrorResponse } from '@angular/common/http';
import { apiError } from '../../../core/api';

export const LONGITUD_CODIGO = 12;

/** Uppercases the typed value, drops anything that is not a letter or digit, and caps it at 12. */
export function normalizarCodigo(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGITUD_CODIGO);
}

export function codigoValido(valor: string): boolean {
  return /^[A-Z0-9]{12}$/.test(valor);
}

/** Spanish message for each way `POST /teams/join-by-code` can fail. */
export function mensajeErrorCodigo(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status !== 0 && error.status < 500) {
    const detalle = apiError(error).toLowerCase();
    if (error.status === 404) {
      return 'El código no es válido. Revisa que tenga 12 letras o números e inténtalo de nuevo.';
    }
    if (error.status === 429) {
      return 'Demasiados intentos con códigos de invitación. Espera unos minutos e inténtalo de nuevo.';
    }
    if (detalle.includes('expuls')) {
      return 'El coach te expulsó de este grupo; solo él puede readmitirte.';
    }
    if (detalle.includes('cupo')) {
      return 'Este grupo no tiene cupos disponibles por ahora.';
    }
    if (detalle.includes('solicitud activa')) {
      return 'Ya tienes una solicitud activa en este grupo. Espera la respuesta del coach.';
    }
    if (detalle.includes('miembro')) {
      return 'Ya eres miembro de este grupo.';
    }
  }
  return apiError(error);
}
