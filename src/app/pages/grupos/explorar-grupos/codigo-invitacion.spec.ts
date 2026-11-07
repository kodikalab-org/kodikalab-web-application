import { HttpErrorResponse } from '@angular/common/http';
import { codigoValido, mensajeErrorCodigo, normalizarCodigo } from './codigo-invitacion';

describe('Código de invitación', () => {
  it('pasa a mayúsculas, descarta símbolos y limita a 12 caracteres', () => {
    expect(normalizarCodigo('ab12-cd34 ef56xyz')).toBe('AB12CD34EF56');
    expect(normalizarCodigo('a1')).toBe('A1');
  });

  it('solo valida códigos de 12 letras o números en mayúscula', () => {
    expect(codigoValido('A1B2C3D4E5F6')).toBe(true);
    expect(codigoValido('A1B2C3D4E5F')).toBe(false);
    expect(codigoValido('a1b2c3d4e5f6')).toBe(false);
    expect(codigoValido('A1B2C3D4E5F-')).toBe(false);
  });

  it('traduce los errores del servidor a mensajes claros', () => {
    const error = (status: number, message: string) =>
      new HttpErrorResponse({ status, error: { message } });
    expect(mensajeErrorCodigo(error(404, 'El código de invitación no es válido'))).toContain('no es válido');
    expect(mensajeErrorCodigo(error(409, 'El grupo no tiene cupo disponible'))).toContain('cupos');
    expect(mensajeErrorCodigo(error(409, 'Ya eres miembro de este grupo'))).toContain('Ya eres miembro');
    expect(mensajeErrorCodigo(error(409, 'Tienes una solicitud activa en este grupo'))).toContain('solicitud activa');
    expect(mensajeErrorCodigo(error(409, 'Fuiste expulsado de este grupo'))).toContain('expulsó');
    expect(mensajeErrorCodigo(error(429, 'Demasiados intentos'))).toContain('Demasiados intentos');
    expect(mensajeErrorCodigo(error(0, ''))).toContain('conectar');
  });
});
