import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Role } from '../../core/api';

// Limits mirror the backend contract (POST /auth/register and /auth/login).
export const NAME_MAX_LENGTH = 80;
export const FULL_NAME_MAX_LENGTH = 150;
export const EMAIL_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe contener al menos 8 caracteres, una mayúscula y un número';

// Same shape as the email pattern used by Angular's Validators.email.
const EMAIL_PATTERN =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Names are trimmed and internal whitespace is collapsed before validation and before sending. */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Emails are trimmed and lowercased before validation and before sending. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const nameRule: ValidatorFn = (control) => {
  const name = normalizeName(String(control.value ?? ''));
  if (!name) return { required: true };
  return name.length > NAME_MAX_LENGTH ? { maxlength: { requiredLength: NAME_MAX_LENGTH, actualLength: name.length } } : null;
};

export const emailRule: ValidatorFn = (control) => {
  const email = normalizeEmail(String(control.value ?? ''));
  if (!email) return { required: true };
  if (email.length > EMAIL_MAX_LENGTH) {
    return { maxlength: { requiredLength: EMAIL_MAX_LENGTH, actualLength: email.length } };
  }
  return EMAIL_PATTERN.test(email) ? null : { email: true };
};

/**
 * Strength rule only. Empty values report `required`; weak values report `weakPassword`.
 * Mirrors the backend pattern `(?s)(?=.*\p{Lu})(?=.*\p{Nd}).{8,}`: any Unicode uppercase letter,
 * any Unicode decimal digit, and a length counted in code points (not UTF-16 units).
 */
export const passwordPolicyRule: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (!value) return { required: true };
  const strong = Array.from(value).length >= PASSWORD_MIN_LENGTH && /\p{Lu}/u.test(value) && /\p{Nd}/u.test(value);
  return strong ? null : { weakPassword: true };
};

/** Hard limit: the backend rejects passwords above 72 UTF-8 bytes, it never truncates them. */
export const passwordBytesRule: ValidatorFn = (control) => {
  const bytes = utf8ByteLength(String(control.value ?? ''));
  return bytes > PASSWORD_MAX_BYTES ? { passwordTooLong: { max: PASSWORD_MAX_BYTES, actual: bytes } } : null;
};

export const roleRule: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const allowed: Role[] = ['PRACTICANTE', 'COACH'];
  return allowed.includes(control.value) ? null : { role: true };
};

/** Full name (first + last, normalized) must not exceed the backend limit of 150 characters. */
export const fullNameRule: ValidatorFn = (group) => {
  const first = normalizeName(String(group.get('firstName')?.value ?? ''));
  const last = normalizeName(String(group.get('lastName')?.value ?? ''));
  if (!first || !last) return null;
  return `${first} ${last}`.length > FULL_NAME_MAX_LENGTH ? { fullNameTooLong: true } : null;
};

/** Weak password is shown in orange only after the field is touched and has a value. */
export function isWeakPassword(control: AbstractControl): boolean {
  return control.touched && control.hasError('weakPassword');
}
