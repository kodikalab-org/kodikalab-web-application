import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/api';
import { Session } from '../../../core/session';
import type { CatalogProblem } from '../../../core/problems-api';
import { AssignmentStore } from './assignment-store';

function catalogProblem(id: number, title = `Problema ${id}`): CatalogProblem {
  return {
    id,
    title,
    url: `https://codeforces.com/problemset/problem/${id}/A`,
    sourcePlatform: 'CODEFORCES',
    sourceCode: `CF-${id}A`,
    difficultyRating: '1000',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    topics: [{ id: 1, name: 'Matemática' }],
  };
}

describe('AssignmentStore', () => {
  let store: AssignmentStore;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssignmentStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    store = TestBed.inject(AssignmentStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps the selection between steps and toggles a problem on and off', () => {
    store.toggle(catalogProblem(7));
    store.toggle(catalogProblem(9));
    expect(store.selected().map((p) => p.id)).toEqual([7, 9]);
    store.toggle(catalogProblem(7));
    expect(store.selected().map((p) => p.id)).toEqual([9]);
    store.clear();
    expect(store.selected()).toEqual([]);
  });

  it('refuses a 51st problem because the backend accepts at most 50 per request', () => {
    for (let id = 1; id <= 51; id++) store.toggle(catalogProblem(id));
    expect(store.selected().length).toBe(50);
    expect(store.canAdd()).toBe(false);
  });

  it('has no request until a competition and at least one problem are chosen', () => {
    expect(store.request()).toBeNull();
    store.toggle(catalogProblem(7));
    expect(store.request()).toBeNull();
    store.competitionId.set(30);
    expect(store.request()).not.toBeNull();
  });

  it('builds the assign body from the selection and the per-problem settings', () => {
    store.toggle(catalogProblem(7));
    store.toggle(catalogProblem(9));
    store.competitionId.set(30);
    store.setSettings({
      7: { letter: ' c ', score: 100, color: '#ff0000' },
      9: { letter: '', score: 50, color: '#22c55e' },
    });
    expect(store.request()).toEqual({
      competitionId: 30,
      problems: [
        { problemId: 7, letter: 'C', score: 100, balloonColor: '#FF0000' },
        { problemId: 9, letter: null, score: 50, balloonColor: '#22C55E' },
      ],
    });
    expect(store.totalScore()).toBe(150);
  });

  it('uses the backend defaults for a problem that was never configured', () => {
    store.toggle(catalogProblem(7));
    store.competitionId.set(30);
    expect(store.request()?.problems).toEqual([
      { problemId: 7, letter: null, score: 1, balloonColor: '#FF0000' },
    ]);
  });

  it('submits POST /problems/assign with that body and resets after a success', () => {
    store.toggle(catalogProblem(7));
    store.competitionId.set(30);
    let done = false;
    store.submit().subscribe(() => (done = true));
    const request = http.expectOne('/api/problems/assign');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      competitionId: 30,
      problems: [{ problemId: 7, letter: null, score: 1, balloonColor: '#FF0000' }],
    });
    expect(store.submitting()).toBe(true);
    request.flush({ competitionId: 30, teamId: 12, assigned: [] }, { status: 201, statusText: 'Created' });
    expect(done).toBe(true);
    expect(store.submitting()).toBe(false);
    expect(store.selected()).toEqual([]);
    expect(store.competitionId()).toBeNull();
  });

  it('maps the per-field backend errors to the problem rows and keeps the selection', () => {
    store.toggle(catalogProblem(7));
    store.toggle(catalogProblem(9));
    store.competitionId.set(30);
    store.submit().subscribe({ error: () => undefined });
    http.expectOne('/api/problems/assign').flush(
      {
        message: 'No se registró ninguna asignación; las existentes se mantienen',
        errors: {
          'problems[1].letter': 'La letra ya está en uso en la competencia',
          'problems[1].problemId': 'El problema ya está asignado a la competencia',
          competitionId: 'La competencia es obligatoria',
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(store.rowErrors(0)).toEqual([]);
    expect(store.rowErrors(1)).toEqual([
      'La letra ya está en uso en la competencia',
      'El problema ya está asignado a la competencia',
    ]);
    expect(store.competitionError()).toBe('La competencia es obligatoria');
    expect(store.errorMessage()).toBe('No se registró ninguna asignación; las existentes se mantienen');
    expect(store.hasFieldErrors()).toBe(true);
    expect(store.selected().length).toBe(2);
    expect(store.submitting()).toBe(false);
  });

  it('shows a message without field errors when the backend refuses the whole request', () => {
    store.toggle(catalogProblem(7));
    store.competitionId.set(30);
    store.submit().subscribe({ error: () => undefined });
    http.expectOne('/api/problems/assign').flush(
      { message: 'La competencia ya finalizó y no admite nuevos problemas', errors: {} },
      { status: 409, statusText: 'Conflict' },
    );
    expect(store.errorMessage()).toBe('La competencia ya finalizó y no admite nuevos problemas');
    expect(store.hasFieldErrors()).toBe(false);
  });

  it('loads the coach teams from /teams/me, leaving out the drafts', () => {
    store.loadTeams();
    const group = (groupId: number, name: string, status: string) => ({
      groupId,
      name,
      status,
      visibility: 'PUBLICO',
      activeMembers: 2,
      pendingRequests: 0,
      invitationCode: 'X',
    });
    http.expectOne('/api/teams/me').flush([
      group(1, 'Alfa', 'ACTIVO'),
      group(2, 'Borrador', 'BORRADOR'),
      group(3, 'Vieja', 'ARCHIVADO'),
    ]);
    expect(store.teams().map((t) => t.name)).toEqual(['Alfa', 'Vieja']);
  });

  it('only offers the PROGRAMADA and EN_CURSO competitions of the chosen team', () => {
    store.selectTeam(12);
    expect(store.teamId()).toBe(12);
    const request = http.expectOne((r) => r.url === '/api/competitions');
    expect(request.request.params.get('teamId')).toBe('12');
    const item = (id: number, status: string) => ({
      id,
      eventName: `Concurso ${id}`,
      status,
      startsAt: '2026-11-01T10:00:00Z',
      endsAt: '2026-11-01T14:00:00Z',
      problemsCount: 0,
    });
    request.flush({
      teamId: 12,
      total: 3,
      items: [item(1, 'PROGRAMADA'), item(2, 'EN_CURSO'), item(3, 'FINALIZADA')],
    });
    expect(store.assignableCompetitions().map((c) => c.competitionId)).toEqual([1, 2]);
  });

  it('asks the competitions of the chosen team again without forgetting the chosen competition', () => {
    store.selectTeam(12);
    http.expectOne((r) => r.url === '/api/competitions').flush({ teamId: 12, total: 0, items: [] });
    store.competitionId.set(30);
    store.refreshCompetitions();
    const request = http.expectOne((r) => r.url === '/api/competitions');
    expect(request.request.params.get('teamId')).toBe('12');
    request.flush({
      teamId: 12,
      total: 1,
      items: [
        { id: 30, eventName: 'Nuevo', status: 'PROGRAMADA', startsAt: '2026-11-01T10:00:00Z', endsAt: '2026-11-01T14:00:00Z', problemsCount: 0 },
      ],
    });
    expect(store.competitionId()).toBe(30);
    expect(store.competition()?.eventName).toBe('Nuevo');
  });

  it('forgets the selection and the teams when another user signs in', () => {
    const session = TestBed.inject(Session);
    TestBed.tick();
    store.toggle(catalogProblem(7));
    store.teamId.set(12);
    session.startDemo('COACH');
    TestBed.tick();
    expect(store.selected()).toEqual([]);
    expect(store.teamId()).toBeNull();
    session.logout();
  });
});
