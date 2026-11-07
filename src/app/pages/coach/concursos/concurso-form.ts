import { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  CompetitionAccessType,
  CreateCompetitionRequest,
  PenaltyRule,
} from '../../../core/competitions-api';

/** Mirrors the validation of `CompetitionServiceImpl.create`. */
export const NAME_MAX = 150;
export const DESCRIPTION_MAX = 500;
export const ACCESS_KEY_MAX_BYTES = 72;
const INT_MAX = 2147483647;

export interface ContestFormValue {
  teamId: string;
  eventName: string;
  description: string;
  accessType: CompetitionAccessType;
  accessKey: string;
  penaltyRule: PenaltyRule;
  startDate: Date | null;
  startTime: string;
  durationMinutes: number | null;
  freezeMinutes: number | null;
}

const pad = (value: number) => String(Math.abs(value)).padStart(2, '0');

/** `2026-11-20T14:00:00-05:00`: the local wall time with its numeric offset, as the backend expects. */
export function offsetIso(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  return (
    `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}

/** Start date and `HH:mm` time as one local date, or null when either is missing or invalid. */
export function combineStart(date: Date | null, time: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? '');
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || !match) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), +match[1], +match[2]);
}

/** Maps the form to the `POST /competitions` body. The form only offers a duration, so `endsAt` is derived. */
export function buildCreateRequest(value: ContestFormValue): CreateCompetitionRequest {
  const start = combineStart(value.startDate, value.startTime)!;
  const end = new Date(start.getTime() + (value.durationMinutes ?? 0) * 60000);
  const description = value.description.trim();
  const isPrivate = value.accessType === 'PRIVADO_PASS';
  return {
    teamId: Number(value.teamId),
    eventName: value.eventName.trim(),
    description: description === '' ? null : description,
    accessType: value.accessType,
    accessKey: isPrivate ? value.accessKey : null,
    penaltyRule: value.penaltyRule,
    scoreboardFreezeMinutes: value.freezeMinutes,
    startsAt: offsetIso(start),
    endsAt: offsetIso(end),
  };
}

const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

export function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value === '' ? { required: true } : null;
}

export function nameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') return { required: true };
  return value.length > NAME_MAX ? { maxlength: true } : null;
}

export function descriptionValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim().length > DESCRIPTION_MAX ? { maxlength: true } : null;
}

/** Required for PRIVADO_PASS (at most 72 bytes in UTF-8); the field is not offered for PUBLICO_GRUPO. */
export function accessKeyValidator(control: AbstractControl): ValidationErrors | null {
  if (control.parent?.get('accessType')?.value !== 'PRIVADO_PASS') return null;
  const value = String(control.value ?? '');
  if (value.trim() === '') return { required: true };
  return new TextEncoder().encode(value).length > ACCESS_KEY_MAX_BYTES ? { maxbytes: true } : null;
}

export function durationValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return isInteger(value) && value >= 1 && value <= INT_MAX ? null : { duration: true };
}

/** Optional; when present, an integer between 0 and the duration. */
export function freezeValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || (value as unknown) === '') return null;
  if (!isInteger(value) || value < 0) return { freeze: true };
  const duration = control.parent?.get('durationMinutes')?.value;
  return isInteger(duration) && value > duration ? { freeze: true } : null;
}
