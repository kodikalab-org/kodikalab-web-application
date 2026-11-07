import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../core/api';
import { Session } from '../../core/session';

/** Shared fixtures and request helpers for the contest page specs. */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

export function team(groupId: number, name: string, status: string) {
  return {
    groupId,
    name,
    description: null,
    expectedLevel: null,
    maxCapacity: null,
    sessionSchedule: null,
    status: 'ACTIVO',
    visibility: 'PUBLICO',
    membership: { membershipId: groupId * 10, status, teamRole: 'MIEMBRO', joinedAt: null, leftAt: null },
  };
}

export const TEAMS = [
  team(1, 'Alfa ICPC', 'ACTIVO'),
  team(2, 'Beta Grafos', 'ACTIVO'),
  team(3, 'Gamma Pendiente', 'PENDIENTE'),
];

export function competitionItem(
  id: number,
  eventName: string,
  status: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA',
  startsAt: string,
  endsAt: string,
  problemsCount = 3,
) {
  return { id, eventName, status, startsAt, endsAt, problemsCount };
}

export function assignedItem(
  competitionProblemId: number,
  competitionId: number,
  letter: string,
  status: string | null,
  competitionStatus: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' = 'EN_CURSO',
  title = `Problema ${letter}`,
) {
  return {
    competitionProblemId,
    letter,
    score: null,
    assignedAt: iso(-DAY),
    status,
    attemptCount: status === 'SIN_INTENTOS' || status === null ? 0 : 2,
    problem: {
      id: competitionProblemId,
      title,
      url: `https://codeforces.com/contest/1850/problem/${letter}`,
      sourcePlatform: 'CODEFORCES',
      sourceCode: `1850${letter}`,
      difficultyRating: '1200',
      topics: ['Greedy', 'Math'],
    },
    competition: { id: competitionId, name: 'Contest', status: competitionStatus, startsAt: null, endsAt: null },
  };
}

export function configure(extraProviders: unknown[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      ...(extraProviders as never[]),
    ],
  });
  TestBed.inject(Session).logout();
  TestBed.inject(Session).account.set({
    token: 'test-token',
    email: 'ana@example.com',
    role: 'PRACTICANTE',
    expiresAt: Date.now() + HOUR,
  });
  return TestBed.inject(HttpTestingController);
}

export const teamRequest = (http: HttpTestingController) => http.expectOne('/api/teams/me');
export const competitionsRequest = (http: HttpTestingController, teamId: number) =>
  http.expectOne((r) => r.url === '/api/competitions' && r.params.get('teamId') === String(teamId));
export const assignedRequest = (http: HttpTestingController, teamId: number) =>
  http.expectOne((r) => r.url === '/api/problems/assigned' && r.params.get('teamId') === String(teamId));
