import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Límites del contrato de `POST /teams` (columnas y rangos del backend). */
export const NOMBRE_MAX = 120;
export const DESCRIPCION_MAX = 500;
export const HORARIO_MAX = 150;
export const CUPO_MIN = 1;
export const CUPO_MAX = 1000;

export const NIVELES = [
  { valor: 'PRINCIPIANTE', etiqueta: 'Principiante' },
  { valor: 'INTERMEDIO', etiqueta: 'Intermedio' },
  { valor: 'AVANZADO', etiqueta: 'Avanzado' },
] as const;

export const VISIBILIDADES = [
  {
    valor: 'PUBLICO',
    etiqueta: 'Público',
    detalle: 'Aparece en el explorador y los practicantes ingresan directamente.',
  },
  {
    valor: 'PROTEGIDO',
    etiqueta: 'Protegido',
    detalle:
      'Aparece en el explorador. Ingresan con el código de invitación o envían una solicitud que tú apruebas.',
  },
] as const;

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Obligatorio, ignorando espacios al inicio y al final. */
export function requeridoSinEspacios(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}

/** Longitud máxima medida sobre el texto sin espacios sobrantes (lo que se envía). */
export function maximoSinEspacios(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const largo = typeof control.value === 'string' ? control.value.trim().length : 0;
    return largo > max ? { maxlength: { requiredLength: max, actualLength: largo } } : null;
  };
}

/** Acepta solo números enteros (el vacío lo valida `required`). */
export function entero(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === null || control.value === '' || Number.isInteger(control.value)
      ? null
      : { entero: true };
}

/** Acepta solo uno de los valores permitidos del enum (el vacío lo valida `required`). */
export function unoDe(valores: readonly string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || valores.includes(control.value) ? null : { opcion: true };
}

/** Texto de `sessionSchedule`: días en orden de semana, por ejemplo `Mar, Jue de 19:00 a 21:00`. */
export function textoHorario(dias: readonly string[], inicio: string, fin: string): string {
  const ordenados = [...dias].sort((a, b) => DIAS.indexOf(a) - DIAS.indexOf(b));
  return `${ordenados.join(', ')} de ${inicio} a ${fin}`;
}

/**
 * Valida el grupo de horario: la hora de inicio debe ser anterior a la de fin y el texto
 * generado no puede superar el límite de la columna del backend.
 */
export const horarioValido: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const dias: string[] = group.get('dias')?.value ?? [];
  const inicio: string = group.get('inicio')?.value ?? '';
  const fin: string = group.get('fin')?.value ?? '';
  const errores: ValidationErrors = {};
  if (inicio && fin && inicio >= fin) errores['orden'] = true;
  if (dias.length && inicio && fin) {
    const largo = textoHorario(dias, inicio, fin).length;
    if (largo > HORARIO_MAX) errores['longitud'] = { max: HORARIO_MAX, actual: largo };
  }
  return Object.keys(errores).length ? errores : null;
};
