import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  SERVER_ERROR,
  applyBackendErrors,
  backendFieldErrors,
  blankToNull,
  cicloValido,
  errorMessage,
  handleFormat,
  maxText,
  nivelValido,
  parseCiclo,
  requiredText,
  trimmed,
  wholeNumber,
} from './profile-validation';

const run = (validator: (c: FormControl) => unknown, value: unknown) =>
  validator(new FormControl(value));

describe('profile validation rules', () => {
  it('trims text and turns blank optional fields into null', () => {
    expect(trimmed('  abc ')).toBe('abc');
    expect(trimmed(null)).toBe('');
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull(' x ')).toBe('x');
  });

  it('requiredText rejects empty and whitespace-only text', () => {
    expect(run(requiredText, '')).toEqual({ required: true });
    expect(run(requiredText, '   ')).toEqual({ required: true });
    expect(run(requiredText, ' a ')).toBeNull();
  });

  it('maxText measures the trimmed text', () => {
    expect(run(maxText(5), 'abcde')).toBeNull();
    expect(run(maxText(5), '  abcde  ')).toBeNull();
    expect(run(maxText(5), 'abcdef')).toEqual({ maxlength: { requiredLength: 5, actualLength: 6 } });
  });

  it('handleFormat accepts letters, digits, dot, underscore and hyphen, and empty', () => {
    expect(run(handleFormat, '')).toBeNull();
    expect(run(handleFormat, 'a.B_c-9')).toBeNull();
    expect(run(handleFormat, 'a b')).toEqual({ handlePattern: true });
    expect(run(handleFormat, 'ñandú')).toEqual({ handlePattern: true });
    expect(run(handleFormat, 'a@b')).toEqual({ handlePattern: true });
  });

  it('nivelValido only accepts the three backend levels', () => {
    for (const nivel of ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']) expect(run(nivelValido, nivel)).toBeNull();
    expect(run(nivelValido, null)).toEqual({ required: true });
    expect(run(nivelValido, 'EXPERTO')).toEqual({ nivel: true });
    expect(run(nivelValido, 'intermedio')).toEqual({ nivel: true });
  });

  it('wholeNumber rejects decimals but not empty values', () => {
    expect(run(wholeNumber, 4)).toBeNull();
    expect(run(wholeNumber, null)).toBeNull();
    expect(run(wholeNumber, 2.5)).toEqual({ integer: true });
  });

  it('parseCiclo reads numbers and labels such as "5.º ciclo"', () => {
    expect(parseCiclo(5)).toBe(5);
    expect(parseCiclo('5')).toBe(5);
    expect(parseCiclo('5.º ciclo')).toBe(5);
    expect(parseCiclo('10.º ciclo')).toBe(10);
    expect(parseCiclo('7º ciclo')).toBe(7);
    expect(parseCiclo(' 3 ciclo ')).toBe(3);
    for (const bad of ['0', '0.º ciclo', '-2', '2.5', 'abc', '', 2.5, 0, null, undefined]) {
      expect(parseCiclo(bad)).toBeNull();
    }
  });

  it('cicloValido requires a parseable cycle >= 1', () => {
    expect(run(cicloValido, '')).toEqual({ required: true });
    expect(run(cicloValido, null)).toEqual({ required: true });
    expect(run(cicloValido, '0.º ciclo')).toEqual({ ciclo: true });
    expect(run(cicloValido, 'primero')).toEqual({ ciclo: true });
    expect(run(cicloValido, '1.º ciclo')).toBeNull();
  });
});

describe('backend errors', () => {
  const badRequest = (errors: unknown) =>
    new HttpErrorResponse({ status: 400, error: { message: 'Datos inválidos', errors } });

  it('reads the per-field errors of a 400 response', () => {
    expect(backendFieldErrors(badRequest({ carrera: 'obligatoria', cicloAcademico: 'inválido' }))).toEqual({
      carrera: 'obligatoria', cicloAcademico: 'inválido',
    });
  });

  it('returns nothing when there are no field errors', () => {
    expect(backendFieldErrors(new HttpErrorResponse({ status: 409, error: { message: 'x' } }))).toEqual({});
    expect(backendFieldErrors(new HttpErrorResponse({ status: 0, error: null }))).toEqual({});
    expect(backendFieldErrors(new Error('boom'))).toEqual({});
    expect(backendFieldErrors(badRequest({ a: 3, b: '  ' }))).toEqual({});
  });

  it('shows backend errors under their control and returns the unmapped ones', () => {
    const form = new FormGroup({ codigo: new FormControl('A1'), carrera: new FormControl('X') });
    const unmapped = applyBackendErrors(
      form,
      { codigoEstudiante: 'duplicado', carrera: 'larga', otroCampo: 'sin control' },
      { codigoEstudiante: 'codigo', carrera: 'carrera' },
    );
    expect(unmapped).toEqual(['sin control']);
    expect(form.controls.codigo.getError(SERVER_ERROR)).toBe('duplicado');
    expect(form.controls.codigo.touched).toBe(true);
    expect(form.invalid).toBe(true);
    form.controls.codigo.setValue('A2');
    expect(form.controls.codigo.hasError(SERVER_ERROR)).toBe(false);
    expect(form.controls.carrera.hasError(SERVER_ERROR)).toBe(true);
  });

  it('treats disabled controls as unmapped', () => {
    const form = new FormGroup({ distrito: new FormControl({ value: '', disabled: true }) });
    expect(applyBackendErrors(form, { distrito: 'x' }, { distrito: 'distrito' })).toEqual(['x']);
  });

  it('errorMessage prefers the backend message and then the first matching rule', () => {
    const control = new FormControl('');
    control.setErrors({ required: true, maxlength: {} });
    const messages = { required: 'Obligatorio', maxlength: 'Muy largo' };
    expect(errorMessage(control, messages)).toBe('Obligatorio');
    control.setErrors({ maxlength: {}, [SERVER_ERROR]: 'Del servidor' });
    expect(errorMessage(control, messages)).toBe('Del servidor');
    control.setErrors(null);
    expect(errorMessage(control, messages)).toBe('');
    expect(errorMessage(null, messages)).toBe('');
  });
});
