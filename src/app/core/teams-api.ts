import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize, of, tap, throwError } from 'rxjs';
import { API_URL } from './api';
import { Session } from './session';
import { GRUPOS_DEMO, GRUPOS_COACH_DEMO, MEMBRESIAS_DEMO, SOLICITUDES_GRUPO_DEMO } from '../data/grupos-demo';

/** Estados y contratos de US04, US05 y US06 (`docs/sdd/03-api-contracts.md`). */

export type GroupStatus = 'BORRADOR' | 'ACTIVO' | 'ARCHIVADO';
export type GroupVisibility = 'PUBLICO' | 'PROTEGIDO' | 'ARCHIVADO';
export type MembershipStatus =
  | 'PENDIENTE'
  | 'ACLARACION_SOLICITADA'
  | 'ACTIVO'
  | 'RECHAZADO'
  | 'RETIRADO'
  | 'EXPULSADO';
export type MembershipDecision =
  | 'ACEPTAR'
  | 'RECHAZAR'
  | 'SOLICITAR_ACLARACION'
  | 'EXPULSAR'
  | 'READMITIR';
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
  pendingRequests?: number;
}

export interface Clarification {
  request: string;
  requestedAt: string;
  response: string | null;
  respondedAt: string | null;
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
  joinedAt?: string | null;
  clarification?: Clarification | null;
  practitioner?: MembershipPractitioner;
}

export interface PractitionerGroup extends StudyGroupSummary {
  membership: {
    membershipId: number;
    status: MembershipStatus;
    teamRole: string;
    joinedAt: string | null;
    leftAt: string | null;
    clarification?: Clarification | null;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
  expectedLevel?: string | null;
  maxCapacity?: number | null;
  sessionSchedule?: string | null;
  visibility?: Exclude<GroupVisibility, 'ARCHIVADO'>;
  draft?: boolean;
}

export interface CreateGroupResponse {
  message: string;
  groupId: number;
  name: string;
  status: GroupStatus;
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
  clarificationRequest?: string;
}

export interface ClarificationResponse {
  message: string;
  membershipId: number;
  groupId: number;
  status: MembershipStatus;
  clarificationRequest: string;
  clarificationResponse: string;
  respondedAt: string;
}

/** US-08: problema asignado al equipo, tal como lo devuelve `/problems/assigned`. */
export interface AssignedProblem {
  competitionProblemId: number;
  letter: string;
  score: number | null;
  assignedAt: string;
  status: string | null;
  attemptCount: number | null;
  problem: {
    id: number;
    title: string;
    url: string | null;
    sourcePlatform: string | null;
    sourceCode: string | null;
    difficultyRating: string | null;
    topics: string[];
  };
  competition: { name: string; startsAt: string | null; endsAt: string | null };
}

export interface AssignedProblemsResponse {
  teamId: number;
  total: number;
  items: AssignedProblem[];
}

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly session = inject(Session);
  private readonly identity = computed(() => ({
    account: this.session.account(), demo: this.session.demo(),
  }));

  private sessionState<T>(initial: () => T) {
    // Reset synchronously on session changes, before a new load can populate the state.
    return linkedSignal({ source: this.identity, computation: initial });
  }

  /** Grupos publicados (US05). */
  readonly groups = this.sessionState<StudyGroupSummary[]>(() => []);
  /** Grupos del coach o membresías del practicante según el rol de la sesión. */
  readonly mine = this.sessionState<(CoachGroup | PractitionerGroup)[]>(() => []);
  /** Solicitudes del grupo seleccionado (US06). */
  readonly requests = this.sessionState<Membership[]>(() => []);
  /** Último grupo creado, para la pantalla de confirmación. */
  readonly lastCreated = this.sessionState<CreateGroupResponse | null>(() => null);
  readonly loading = this.sessionState(() => false);

  loadGroups() {
    if (this.session.demo()) return of([...GRUPOS_DEMO]).pipe(tap(groups => this.groups.set(groups)));
    this.loading.set(true);
    return this.http.get<StudyGroupSummary[]>(`${this.url}/teams`, { timeout: 15000 }).pipe(
      tap((groups) => this.groups.set(groups)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadMine() {
    if (this.session.demo()) {
      const groups: (CoachGroup | PractitionerGroup)[] = this.session.demo() === 'COACH' ? [...GRUPOS_COACH_DEMO] : [...MEMBRESIAS_DEMO];
      return of(groups).pipe(tap(mine => this.mine.set(mine)));
    }
    return this.http
      .get<(CoachGroup | PractitionerGroup)[]>(`${this.url}/teams/me`, { timeout: 15000 })
      .pipe(tap((mine) => this.mine.set(mine)));
  }

  create(body: CreateGroupRequest) {
    if (this.session.demo()) return this.demoWriteBlocked();
    return this.http
      .post<CreateGroupResponse>(`${this.url}/teams`, body, { timeout: 15000 })
      .pipe(tap((response) => this.lastCreated.set(response)));
  }

  updateDraft(groupId: number, body: Partial<CreateGroupRequest>) {
    if (this.session.demo()) return this.demoWriteBlocked();
    return this.http.patch<StudyGroupDetail>(`${this.url}/teams/${groupId}/draft`, body, {
      timeout: 15000,
    });
  }

  publish(groupId: number) {
    if (this.session.demo()) return this.demoWriteBlocked();
    return this.http.post<StudyGroupDetail>(`${this.url}/teams/${groupId}/publish`, {}, {
      timeout: 15000,
    });
  }

  join(groupId: number, invitationCode = '') {
    if (this.session.demo()) return this.demoWriteBlocked();
    let params = new HttpParams();
    if (invitationCode.trim()) params = params.set('invitationCode', invitationCode.trim());
    return this.http.post<JoinGroupResponse>(`${this.url}/teams/${groupId}/join`, null, {
      params,
      timeout: 15000,
    });
  }

  loadRequests(
    groupId: number,
    status: 'PENDIENTE' | 'ACLARACION_SOLICITADA' | 'ACTIVO' | 'EXPULSADO',
  ) {
    if (this.session.demo()) return of(SOLICITUDES_GRUPO_DEMO.filter(request => request.groupId === groupId && request.status === status)).pipe(tap(requests => this.requests.set(requests)));
    this.loading.set(true);
    return this.http
      .get<Membership[]>(`${this.url}/teams/${groupId}/memberships`, {
        params: new HttpParams().set('status', status),
        timeout: 15000,
      })
      .pipe(
        tap((requests) => this.requests.set(requests)),
        finalize(() => this.loading.set(false)),
      );
  }

  decide(
    groupId: number,
    membershipId: number,
    decision: MembershipDecision,
    message = '',
  ) {
    if (this.session.demo()) return this.demoWriteBlocked();
    const body: { decision: MembershipDecision; message?: string } = { decision };
    if (decision === 'SOLICITAR_ACLARACION') body.message = message;
    return this.http
      .patch<ReviewMembershipResponse>(
        `${this.url}/teams/${groupId}/memberships/${membershipId}`,
        body,
        { timeout: 15000 },
      )
      .pipe(tap(() => this.removeRequest(membershipId)));
  }

  respondClarification(groupId: number, membershipId: number, message: string) {
    if (this.session.demo()) return this.demoWriteBlocked();
    return this.http.post<ClarificationResponse>(
      `${this.url}/teams/${groupId}/memberships/${membershipId}/clarification`,
      { message },
      { timeout: 15000 },
    );
  }

  /** US-08: problemas que el coach asignó al grupo. */
  assignedProblems(teamId: number) {
    return this.http.get<AssignedProblemsResponse>(`${this.url}/problems/assigned`, {
      params: new HttpParams().set('teamId', teamId),
      timeout: 15000,
    });
  }

  private removeRequest(membershipId: number): void {
    this.requests.update((list) => list.filter((item) => item.membershipId !== membershipId));
  }

  private demoWriteBlocked() {
    return throwError(() => new HttpErrorResponse({ status: 400, error: {
      message: 'Demostración: los cambios no se guardan. Inicia sesión para gestionar grupos y solicitudes.',
    } }));
  }
}
