import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { API_URL } from './api';

/** Estados y contratos de US04, US05 y US06 (`docs/sdd/03-api-contracts.md`). */

export type GroupStatus = 'ACTIVO' | 'ARCHIVADO';
export type GroupVisibility = 'PUBLICO' | 'PROTEGIDO' | 'ARCHIVADO';
export type MembershipStatus = 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO' | 'RETIRADO' | 'EXPULSADO';
export type MembershipDecision = 'ACEPTAR' | 'RECHAZAR';
/** El backend usa estos valores en `nivel_esperado`; la UI los muestra en español. */
export type ExpectedLevel = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO' | string;

export interface StudyGroupSummary {
  groupId: number;
  name: string;
  description: string | null;
  expectedLevel: ExpectedLevel | null;
  maxCapacity: number | null;
  sessionSchedule: string | null;
  status: GroupStatus;
  visibility: GroupVisibility;
}

export interface StudyGroupDetail extends StudyGroupSummary {
  invitationCode: string;
}

export interface CoachGroup extends StudyGroupDetail {
  activeMembers: number;
  pendingRequests: number;
}

export interface MembershipPractitioner {
  fullName: string;
  studentCode: string;
  career: string;
  academicCycle: number;
  competitiveLevel: string;
  codeforcesHandle: string | null;
  codeforcesRating: number | null;
  atcoderHandle: string | null;
  vjudgeHandle: string | null;
}

export interface Membership {
  membershipId: number;
  groupId: number;
  practitionerId?: number;
  status: MembershipStatus;
  requestedAt: string;
  practitioner?: MembershipPractitioner;
}

export interface PractitionerGroup extends StudyGroupSummary {
  membership: {
    membershipId: number;
    status: MembershipStatus;
    teamRole: string;
    joinedAt: string | null;
    leftAt: string | null;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
  expectedLevel?: string | null;
  maxCapacity?: number | null;
  sessionSchedule?: string | null;
  visibility?: Exclude<GroupVisibility, 'ARCHIVADO'>;
}

export interface CreateGroupResponse {
  message: string;
  groupId: number;
  name: string;
  invitationCode: string;
}

export interface JoinGroupResponse {
  message: string;
  membershipId: number;
  groupId: number;
  status: MembershipStatus;
}

export interface ReviewMembershipResponse {
  message: string;
  membershipId: number;
  groupId: number;
  status: MembershipStatus;
}

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  /** Grupos publicados (US05). */
  readonly groups = signal<StudyGroupSummary[]>([]);
  /** Grupos del coach o membresías del practicante según el rol de la sesión. */
  readonly mine = signal<(CoachGroup | PractitionerGroup)[]>([]);
  /** Solicitudes del grupo seleccionado (US06). */
  readonly requests = signal<Membership[]>([]);
  /** Último grupo creado, para la pantalla de confirmación. */
  readonly lastCreated = signal<CreateGroupResponse | null>(null);
  readonly loading = signal(false);

  loadGroups() {
    this.loading.set(true);
    return this.http.get<StudyGroupSummary[]>(`${this.url}/teams`, { timeout: 15000 }).pipe(
      tap((groups) => this.groups.set(groups)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadMine() {
    return this.http
      .get<(CoachGroup | PractitionerGroup)[]>(`${this.url}/teams/me`, { timeout: 15000 })
      .pipe(tap((mine) => this.mine.set(mine)));
  }

  create(body: CreateGroupRequest) {
    return this.http
      .post<CreateGroupResponse>(`${this.url}/teams`, body, { timeout: 15000 })
      .pipe(tap((response) => this.lastCreated.set(response)));
  }

  join(groupId: number, invitationCode = '') {
    let params = new HttpParams();
    if (invitationCode.trim()) params = params.set('invitationCode', invitationCode.trim());
    return this.http.post<JoinGroupResponse>(`${this.url}/teams/${groupId}/join`, null, {
      params,
      timeout: 15000,
    });
  }

  /** Lista las postulaciones pendientes del grupo, de la más antigua a la más reciente. */
  loadRequests(groupId: number) {
    this.loading.set(true);
    return this.http
      .get<Membership[]>(`${this.url}/teams/${groupId}/memberships`, {
        params: new HttpParams().set('status', 'PENDIENTE'),
        timeout: 15000,
      })
      .pipe(
        tap((requests) => this.requests.set(requests)),
        finalize(() => this.loading.set(false)),
      );
  }

  decide(groupId: number, membershipId: number, decision: MembershipDecision) {
    return this.http
      .patch<ReviewMembershipResponse>(
        `${this.url}/teams/${groupId}/memberships/${membershipId}`,
        { decision },
        { timeout: 15000 },
      )
      .pipe(tap(() => this.removeRequest(membershipId)));
  }

  private removeRequest(membershipId: number): void {
    this.requests.update((list) => list.filter((item) => item.membershipId !== membershipId));
  }
}

/**
 * Errores por campo del backend (`{ message, errors: { campo: mensaje } }`).
 * Devuelve un objeto vacío si la respuesta no los trae.
 */
export function readFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) return {};
  const errors = (error.error as { errors?: unknown } | null)?.errors;
  if (!errors || typeof errors !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(errors)) {
    if (typeof value === 'string' && value.trim()) result[field] = value;
  }
  return result;
}

/** Código HTTP del error, o 0 si no hubo respuesta del servidor. */
export function httpStatus(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}

/** Minúsculas y sin acentos, para comparar textos de usuario y mensajes del backend. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function messageOf(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return '';
  const message = (error.error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : '';
}

/** Causa por la que `POST /teams/{id}/join` no registró el ingreso. */
export type JoinFailure =
  | 'SOLICITUD_DUPLICADA'
  | 'YA_ES_MIEMBRO'
  | 'SIN_CUPO'
  | 'EXPULSADO'
  | 'NO_ADMITE'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'OTRO';

/**
 * Clasifica el error del ingreso. Los 409 del backend traen solo un mensaje, así que se
 * compara sin acentos ni mayúsculas y buscando varias palabras clave por causa.
 */
export function classifyJoinError(error: unknown): JoinFailure {
  const status = httpStatus(error);
  if (status === 403) return 'SIN_PERMISO';
  if (status === 404) return 'NO_ENCONTRADO';
  if (status !== 409) return 'OTRO';

  const message = normalizeText(messageOf(error));
  if (/expuls/.test(message)) return 'EXPULSADO';
  if (/cupo|lleno|llena|capacidad|vacante|completo/.test(message)) return 'SIN_CUPO';
  if (/pendiente|solicitud (activa|previa|registrada)|duplicad/.test(message)) {
    return 'SOLICITUD_DUPLICADA';
  }
  if (/miembro|integrante|pertenec/.test(message)) return 'YA_ES_MIEMBRO';
  if (/no admite|no acepta|archivad|inactiv|no esta (publicad|disponible|activ)/.test(message)) {
    return 'NO_ADMITE';
  }
  return 'OTRO';
}
