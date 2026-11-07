import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { API_URL, isConnectionError } from './api';

/** Contracts of US-07 (catalog and assignment) and US-08 (assigned problems). */

export type SourcePlatform = 'CODEFORCES' | 'ATCODER' | 'CSES';
export type CompetitionStatus = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
export type AssignmentStatus = 'SIN_INTENTOS' | 'EN_PROGRESO' | 'PENDIENTE' | 'RESUELTO';
export type Verdict = 'PENDIENTE' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TLE' | 'MLE' | 'ERROR';
export type AssignedSort = 'letter' | 'title' | 'difficulty' | 'assignedAt' | 'status';

export interface CatalogTopic {
  id: number;
  name: string;
}

export interface CatalogProblem {
  id: number;
  title: string;
  url: string | null;
  sourcePlatform: SourcePlatform | null;
  sourceCode: string | null;
  difficultyRating: string | null;
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  topics: CatalogTopic[];
}

export interface CatalogPage {
  items: CatalogProblem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CatalogQuery {
  q?: string;
  topicId?: number | null;
  difficulty?: string;
  platform?: SourcePlatform | '';
  page?: number;
  size?: number;
}

export interface AssignItem {
  problemId: number;
  /** `null` asks the backend for the first free letter of the competition. */
  letter: string | null;
  score: number;
  balloonColor: string;
}

export interface AssignRequest {
  competitionId: number;
  problems: AssignItem[];
}

export interface AssignResponse {
  competitionId: number;
  teamId: number;
  assigned: {
    competitionProblemId: number;
    problemId: number;
    title: string;
    letter: string;
    score: number;
    balloonColor: string;
    assignedAt: string;
  }[];
}

export interface AttemptInfo {
  resolutionId: number;
  verdict: Verdict;
  language: string | null;
  submittedAt: string;
  evidenceUrl: string | null;
}

export interface AssignedProblemItem {
  competitionProblemId: number;
  letter: string;
  score: number;
  balloonColor: string;
  assignedAt: string;
  competition: {
    id: number;
    name: string;
    status: CompetitionStatus;
    startsAt: string | null;
    endsAt: string | null;
    durationMinutes: number | null;
    penaltyRule: 'ICPC_20_MIN' | 'IOI_POINTS' | null;
    scoreboardFreezeMinutes: number | null;
    accessType: string | null;
  };
  problem: {
    id: number;
    title: string;
    url: string | null;
    sourcePlatform: SourcePlatform | null;
    sourceCode: string | null;
    difficultyRating: string | null;
    timeLimitMs: number | null;
    memoryLimitMb: number | null;
    topics: string[];
  };
  /** Personal state of a practitioner; `null` for the coach, who sees the team assignment only. */
  status: AssignmentStatus | null;
  attemptCount: number | null;
  lastAttempt: AttemptInfo | null;
}

export interface AssignedList {
  teamId: number;
  total: number;
  items: AssignedProblemItem[];
}

export interface AssignedDetail {
  assignment: AssignedProblemItem;
  attempts: AttemptInfo[];
}

export interface AssignedQuery {
  teamId?: number | null;
  competitionId?: number | null;
  competitionStatus?: CompetitionStatus | '';
  status?: AssignmentStatus | '';
  q?: string;
  difficulty?: string;
  sort?: AssignedSort | '';
  order?: 'asc' | 'desc' | '';
}

interface Label {
  label: string;
  badge: string;
}

/** Label and badge classes of the personal state of an assignment. */
export const ASSIGNMENT_STATUS: Record<AssignmentStatus, Label> = {
  SIN_INTENTOS: { label: 'Sin intentos', badge: 'border-kl-border-strong bg-white/4 text-kl-body' },
  EN_PROGRESO: { label: 'En progreso', badge: 'border-indigo-300/50 bg-indigo-400/15 text-indigo-200' },
  PENDIENTE: { label: 'Por verificar', badge: 'border-amber-400/50 bg-amber-400/10 text-amber-300' },
  RESUELTO: { label: 'Resuelto', badge: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' },
};

/** Label and badge classes of the lifecycle state of a competition. */
export const COMPETITION_STATUS: Record<CompetitionStatus, Label> = {
  PROGRAMADA: { label: 'Programada', badge: 'border-indigo-300/50 bg-indigo-400/10 text-indigo-200' },
  EN_CURSO: { label: 'En curso', badge: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' },
  FINALIZADA: { label: 'Finalizada', badge: 'border-kl-border-strong bg-white/4 text-kl-muted' },
};

export const PLATFORM_LABEL: Record<SourcePlatform, string> = {
  CODEFORCES: 'Codeforces',
  ATCODER: 'AtCoder',
  CSES: 'CSES',
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  PENDIENTE: 'Por verificar',
  ACCEPTED: 'Aceptado',
  WRONG_ANSWER: 'Respuesta incorrecta',
  TLE: 'Tiempo excedido',
  MLE: 'Memoria excedida',
  ERROR: 'Error',
};

const DATE_TIME = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Date and time of an ISO instant for the problem screens ("29 oct 2026, 8:14 p. m."); "—" when missing. */
export function formatDateTime(value: string | null | undefined): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? DATE_TIME.format(date) : '—';
}

/** Query parameters without the filters that are empty, so the backend never gets blank values. */
function toParams(values: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== '') params = params.set(key, text);
  }
  return params;
}

/**
 * Error text of the problem screens. 401 and 403 explain the session or permission; 404 and 409 keep the
 * backend message (for example "El problema no está asignado"); connection failures ask to retry.
 */
export function problemsError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos completar la operación. Inténtalo de nuevo.';
  if (isConnectionError(error)) return 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
  const message: unknown = error.error?.message;
  const text = typeof message === 'string' && message.trim() !== '' ? message : null;
  if (error.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.';
  if (error.status === 403) return text ?? 'No tienes permiso para ver o gestionar estos problemas.';
  if (error.status === 404) return text ?? 'No encontramos el recurso solicitado.';
  return text ?? 'Revisa los datos ingresados.';
}

@Injectable({ providedIn: 'root' })
export class ProblemsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  /** Catalog search (`GET /problems`), paged by the backend. */
  catalog(query: CatalogQuery = {}) {
    return this.http.get<CatalogPage>(`${this.url}/problems`, {
      params: toParams({ ...query }),
      timeout: 15000,
    });
  }

  /** Assigned problems (`GET /problems/assigned`): filters and sort are resolved by the backend. */
  assigned(query: AssignedQuery = {}) {
    return this.http.get<AssignedList>(`${this.url}/problems/assigned`, {
      params: toParams({ ...query }),
      timeout: 15000,
    });
  }

  /** One assignment with the personal attempts (`GET /problems/assigned/{competitionProblemId}`). */
  assignedDetail(competitionProblemId: number) {
    return this.http.get<AssignedDetail>(`${this.url}/problems/assigned/${competitionProblemId}`, {
      timeout: 15000,
    });
  }

  /** Assigns catalog problems to the whole team of a competition (`POST /problems/assign`, 201). */
  assign(body: AssignRequest) {
    return this.http.post<AssignResponse>(`${this.url}/problems/assign`, body, { timeout: 15000 });
  }
}
