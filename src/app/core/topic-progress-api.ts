import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { API_URL } from './api';

export type TopicStatus = 'COMPLETADO' | 'EN_PROGRESO' | 'SIN_ACTIVIDAD';

export interface TopicProgress {
  topicId: number;
  topicName: string;
  assignedProblems: number;
  solvedProblems: number;
  unsolvedProblems: number;
  pendingProblems: number;
  coveragePercentage: number;
  status: TopicStatus;
  needsReinforcement: boolean;
}

export interface TopicProgressResponse {
  teamId: number;
  membershipId: number;
  userId: number;
  assignedProblems: number;
  solvedProblems: number;
  unclassifiedProblems: number;
  reinforcementCriterion: string;
  topics: TopicProgress[];
}

export type TopicProgressErrorKind =
  | 'inconsistent'
  | 'unavailable'
  | 'forbidden'
  | 'not-found'
  | 'unauthorized'
  | 'invalid'
  | 'unknown';

export interface TopicProgressError {
  kind: TopicProgressErrorKind;
  status: number;
  message: string;
  /** Affected data reported by the backend (`errors`), as field/message pairs. */
  affected: { field: string; message: string }[];
  /** Whether repeating the query can succeed. */
  retryable: boolean;
}

const STATUSES: TopicStatus[] = ['COMPLETADO', 'EN_PROGRESO', 'SIN_ACTIVIDAD'];
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function isTopic(value: unknown): value is TopicProgress {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    isCount(t['topicId']) &&
    typeof t['topicName'] === 'string' &&
    isCount(t['assignedProblems']) &&
    isCount(t['solvedProblems']) &&
    isCount(t['unsolvedProblems']) &&
    isCount(t['pendingProblems']) &&
    isCount(t['coveragePercentage']) &&
    (t['coveragePercentage'] as number) <= 100 &&
    STATUSES.includes(t['status'] as TopicStatus) &&
    typeof t['needsReinforcement'] === 'boolean'
  );
}

/** Defensive check: a response that fails it must never be shown as indicators. */
export function isValidTopicProgress(value: unknown): value is TopicProgressResponse {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    isCount(r['teamId']) &&
    isCount(r['assignedProblems']) &&
    isCount(r['solvedProblems']) &&
    (r['solvedProblems'] as number) <= (r['assignedProblems'] as number) &&
    isCount(r['unclassifiedProblems']) &&
    typeof r['reinforcementCriterion'] === 'string' &&
    Array.isArray(r['topics']) &&
    (r['topics'] as unknown[]).every(isTopic)
  );
}

function backendErrors(error: HttpErrorResponse): { field: string; message: string }[] {
  const errors = error.error?.errors;
  if (!errors || typeof errors !== 'object') return [];
  return Object.entries(errors as Record<string, unknown>).map(([field, message]) => ({
    field,
    message: String(message),
  }));
}

export function toTopicProgressError(error: unknown): TopicProgressError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unavailable',
      status: 0,
      message: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
      affected: [],
      retryable: true,
    };
  }
  const backend =
    typeof error.error?.message === 'string' && error.error.message ? error.error.message : '';
  const base = { status: error.status, affected: backendErrors(error) };
  switch (error.status) {
    case 409:
      return {
        ...base,
        kind: 'inconsistent',
        retryable: true,
        message: backend || 'Detectamos datos faltantes o inconsistentes en tus registros.',
      };
    case 503:
      return {
        ...base,
        kind: 'unavailable',
        retryable: true,
        message: backend || 'La información de tu progreso no está disponible por ahora.',
      };
    case 403:
      return {
        ...base,
        kind: 'forbidden',
        retryable: false,
        message: backend || 'Necesitas una membresía activa en este equipo.',
      };
    case 404:
      return {
        ...base,
        kind: 'not-found',
        retryable: false,
        message: backend || 'El equipo consultado no existe.',
      };
    case 401:
      return {
        ...base,
        kind: 'unauthorized',
        retryable: false,
        message: backend || 'Tu sesión no es válida. Inicia sesión de nuevo.',
      };
    case 400:
      return {
        ...base,
        kind: 'invalid',
        retryable: false,
        message: backend || 'El identificador del equipo no es válido.',
      };
    default:
      if (error.status === 0 || error.status >= 500) {
        return {
          ...base,
          kind: 'unavailable',
          retryable: true,
          message: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
        };
      }
      return {
        ...base,
        kind: 'unknown',
        retryable: true,
        message: backend || 'No pudimos obtener tu progreso. Inténtalo de nuevo.',
      };
  }
}

@Injectable({ providedIn: 'root' })
export class TopicProgressApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private subscription?: Subscription;

  readonly loading = signal(false);
  /** Team whose progress is held in `progress` / `error`. */
  readonly teamId = signal<number | null>(null);
  readonly progress = signal<TopicProgressResponse | null>(null);
  readonly error = signal<TopicProgressError | null>(null);

  /** Loads the progress of one team; replaces (never merges) any previous result. */
  load(teamId: number): void {
    this.subscription?.unsubscribe();
    this.teamId.set(teamId);
    this.progress.set(null);
    this.error.set(null);
    this.loading.set(true);
    this.subscription = this.http
      .get<unknown>(`${this.url}/analytics/teams/${teamId}/progress/me/topics`, { timeout: 15000 })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (isValidTopicProgress(response) && response.teamId === teamId) {
            this.progress.set(response);
          } else {
            this.error.set({
              kind: 'inconsistent',
              status: 200,
              message: 'La respuesta del servidor está incompleta o es inconsistente.',
              affected: [],
              retryable: true,
            });
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(toTopicProgressError(error));
        },
      });
  }

  reset(): void {
    this.subscription?.unsubscribe();
    this.loading.set(false);
    this.teamId.set(null);
    this.progress.set(null);
    this.error.set(null);
  }
}
