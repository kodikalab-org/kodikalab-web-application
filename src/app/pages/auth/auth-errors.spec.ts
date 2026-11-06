import { HttpErrorResponse } from '@angular/common/http';
import { apiError, authApiError, fieldErrors, isConnectionError } from '../../core/api';

const httpError = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('API error helpers', () => {
  // Regression guard: every module outside auth relies on this exact output (same as origin/develop).
  describe('apiError (shared by non-auth modules, unchanged)', () => {
    it('keeps the fixed 401 and 403 messages even when the backend sends a message', () => {
      expect(apiError(httpError(401, { message: 'Credenciales inválidas' })))
        .toBe('Credenciales o datos de recuperación inválidos.');
      expect(apiError(httpError(403, { message: 'X' }))).toBe('No tienes permiso para realizar esta acción.');
      expect(apiError(httpError(401))).toBe('Credenciales o datos de recuperación inválidos.');
      expect(apiError(httpError(403))).toBe('No tienes permiso para realizar esta acción.');
    });

    it('uses the backend message for other statuses and the fixed fallbacks otherwise', () => {
      expect(apiError(httpError(409, { message: 'Ya existe' }))).toBe('Ya existe');
      expect(apiError(httpError(400, { message: 'Revisa los campos' }))).toBe('Revisa los campos');
      expect(apiError(httpError(409))).toBe('Los datos ya están registrados en otra cuenta.');
      expect(apiError(httpError(400))).toBe('Revisa los datos ingresados.');
    });

    it('shows the connection message for status 0 and 5xx, and the generic one for non-HTTP errors', () => {
      const connection = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
      expect(apiError(httpError(0))).toBe(connection);
      expect(apiError(httpError(503, { message: 'Caído' }))).toBe(connection);
      const timeout = Object.assign(new Error('Timeout has occurred'), { name: 'TimeoutError' });
      expect(apiError(timeout)).toBe('No pudimos completar la operación. Inténtalo de nuevo.');
    });
  });

  describe('authApiError', () => {
    it('uses the backend message for 400, 401, 403 and 409 when present', () => {
      expect(authApiError(httpError(409, { message: 'El correo institucional ya está vinculado a una cuenta existente' })))
        .toBe('El correo institucional ya está vinculado a una cuenta existente');
      expect(authApiError(httpError(401, { message: 'Credenciales inválidas' }))).toBe('Credenciales inválidas');
      expect(authApiError(httpError(401, { message: 'Datos de recuperación inválidos' }))).toBe('Datos de recuperación inválidos');
      expect(authApiError(httpError(403, { message: 'La cuenta no está habilitada' }))).toBe('La cuenta no está habilitada');
      expect(authApiError(httpError(400, { message: 'Revisa los campos' }))).toBe('Revisa los campos');
    });

    it('falls back to the generic messages when the backend sends no message', () => {
      expect(authApiError(httpError(401))).toBe('Credenciales o datos de recuperación inválidos.');
      expect(authApiError(httpError(403))).toBe('No tienes permiso para realizar esta acción.');
      expect(authApiError(httpError(409))).toBe('Los datos ya están registrados en otra cuenta.');
      expect(authApiError(httpError(400, { message: '   ' }))).toBe('Revisa los datos ingresados.');
    });

    it('keeps the connection message for network errors, timeouts and 5xx, ignoring their body', () => {
      const connection = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
      expect(authApiError(httpError(0))).toBe(connection);
      expect(authApiError(httpError(503, { message: 'Caído' }))).toBe(connection);
      expect(authApiError(httpError(500))).toBe(connection);
      const timeout = Object.assign(new Error('Timeout has occurred'), { name: 'TimeoutError' });
      expect(authApiError(timeout)).toBe(connection);
    });

    it('keeps the generic message for unknown, non-HTTP failures', () => {
      expect(authApiError(new Error('Respuesta de autenticación incompleta')))
        .toBe('No pudimos completar la operación. Inténtalo de nuevo.');
      expect(authApiError(undefined)).toBe('No pudimos completar la operación. Inténtalo de nuevo.');
    });
  });

  describe('isConnectionError', () => {
    it('is true only for no-response, timeouts and 5xx', () => {
      expect(isConnectionError(httpError(0))).toBe(true);
      expect(isConnectionError(httpError(502))).toBe(true);
      expect(isConnectionError(httpError(409))).toBe(false);
      expect(isConnectionError(new Error('otro'))).toBe(false);
    });
  });

  describe('fieldErrors', () => {
    it('returns the backend errors map', () => {
      expect(fieldErrors(httpError(400, { message: 'Datos inválidos', errors: { email: 'Correo inválido', password: 'Muy corta' } })))
        .toEqual({ email: 'Correo inválido', password: 'Muy corta' });
    });

    it('is empty when there is no map, no HTTP response or the entries are not usable text', () => {
      expect(fieldErrors(httpError(409, { message: 'Conflicto' }))).toEqual({});
      expect(fieldErrors(httpError(400, { errors: ['email'] }))).toEqual({});
      expect(fieldErrors(httpError(400, { errors: { email: '  ', firstName: 42 } }))).toEqual({});
      expect(fieldErrors(new Error('x'))).toEqual({});
      expect(fieldErrors(httpError(0))).toEqual({});
    });
  });
});
