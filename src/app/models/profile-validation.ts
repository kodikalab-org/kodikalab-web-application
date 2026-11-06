import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Validation rules shared by every profile form (practicante and coach). They mirror the
 * backend contract of PUT /users/me so the UI rejects what the API would reject.
 */

/** Letters, digits, dot, underscore and hyphen (platform handles). */
export const HANDLE_PATTERN = /^[A-Za-z0-9._-]+$/;

export const PRACTITIONER_LIMITS = { codigo: 20, carrera: 100, handle: 50 } as const;
export const COACH_LIMITS = { especialidad: 120, organizacion: 150, presentacion: 500, aniosMin: 0, aniosMax: 60 } as const;

export const NIVELES_COMPETITIVOS = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'] as const;

/** Text without surrounding spaces; anything that is not a string counts as empty. */
export function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Optional text field: blank becomes null, otherwise the trimmed text. */
export function blankToNull(value: unknown): string | null {
  const text = trimmed(value);
  return text === '' ? null : text;
}

/** `required` that also rejects whitespace-only text. */
export const requiredText: ValidatorFn = (control) =>
  trimmed(control.value) === '' ? { required: true } : null;

/** `maxlength` measured on the trimmed text, because that is what is sent. */
export function maxText(max: number): ValidatorFn {
  return (control) => {
    const length = trimmed(control.value).length;
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}

/** Optional platform handle: letters, digits, dot, underscore and hyphen. */
export const handleFormat: ValidatorFn = (control) => {
  const text = trimmed(control.value);
  return text === '' || HANDLE_PATTERN.test(text) ? null : { handlePattern: true };
};

/** The competitive level must be one of the three values the backend accepts. */
export const nivelValido: ValidatorFn = (control) => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return { required: true };
  return (NIVELES_COMPETITIVOS as readonly string[]).includes(value) ? null : { nivel: true };
};

/** Whole numbers only (the number input already guarantees numeric type or null). */
export const wholeNumber: ValidatorFn = (control) => {
  const value = control.value;
  return value === null || value === undefined || value === '' || Number.isInteger(Number(value))
    ? null
    : { integer: true };
};

/**
 * Reads the academic cycle from a number or a label such as "5", "5.º ciclo", "5º ciclo".
 * Returns null when it is not a whole number >= 1.
 */
export function parseCiclo(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 1 ? value : null;
  if (typeof value !== 'string') return null;
  const match = /^\s*(\d{1,3})\s*(?:\.?\s*[º°o]\.?)?\s*(?:ciclo)?\s*$/i.exec(value);
  const cycle = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return cycle >= 1 ? cycle : null;
}

export const cicloValido: ValidatorFn = (control) => {
  const value = control.value;
  if (value === null || value === undefined || trimmed(String(value)) === '') return { required: true };
  return parseCiclo(value) === null ? { ciclo: true } : null;
};

/** Label shown for a cycle, e.g. 5 -> "5.º ciclo". */
export const cicloLabel = (cycle: number): string => `${cycle}.º ciclo`;

/** Error key used to show a message returned by the backend under a control. */
export const SERVER_ERROR = 'server';

/** Per-field messages of a 400 response (`{ errors: { campo: mensaje } }`). Empty when absent. */
export function backendFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) return {};
  const raw = (error.error as { errors?: unknown } | null)?.errors;
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [field, message] of Object.entries(raw)) {
    if (typeof message === 'string' && message.trim()) result[field] = message;
  }
  return result;
}

/**
 * Shows backend errors under their controls. `controlNames` maps backend field -> control
 * name. Returns the messages of the fields that have no control in this form.
 * Typing in a control recalculates its errors, which clears the backend one.
 */
export function applyBackendErrors(
  form: FormGroup,
  errors: Record<string, string>,
  controlNames: Record<string, string>,
): string[] {
  const unmapped: string[] = [];
  for (const [field, message] of Object.entries(errors)) {
    const control = form.get(controlNames[field] ?? '');
    if (!control || control.disabled) { unmapped.push(message); continue; }
    control.setErrors({ ...control.errors, [SERVER_ERROR]: message });
    control.markAsTouched();
  }
  return unmapped;
}

/** Message for the first failing rule of a control, or '' when it is valid. */
export function errorMessage(
  control: AbstractControl | null | undefined,
  messages: Record<string, string>,
): string {
  const errors: ValidationErrors | null | undefined = control?.errors;
  if (!errors) return '';
  if (typeof errors[SERVER_ERROR] === 'string') return errors[SERVER_ERROR];
  for (const key of Object.keys(messages)) if (errors[key]) return messages[key];
  return '';
}
