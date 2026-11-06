import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
