import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { problemsError, ProblemsApi } from './problems-api';

describe('ProblemsApi', () => {
  let api: ProblemsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(ProblemsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches the catalog with GET /problems and only sends the filters that have a value', async () => {
    const page = firstValueFrom(
      api.catalog({ q: ' grafos ', topicId: 4, difficulty: '', platform: 'CSES', page: 2, size: 20 }),
    );
    const request = http.expectOne((r) => r.url === '/api/problems');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('grafos');
    expect(request.request.params.get('topicId')).toBe('4');
    expect(request.request.params.get('platform')).toBe('CSES');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('difficulty')).toBe(false);
    const body = { items: [], page: 2, size: 20, totalItems: 0, totalPages: 0 };
    request.flush(body);
    expect(await page).toEqual(body);
  });

  it('lists the assigned problems mapping every filter and the sort to a query parameter', async () => {
    const list = firstValueFrom(
      api.assigned({
        teamId: 12,
        competitionId: 30,
        competitionStatus: 'EN_CURSO',
        status: 'PENDIENTE',
        q: 'theatre',
        difficulty: '1000',
        sort: 'title',
        order: 'desc',
      }),
    );
    const request = http.expectOne((r) => r.url === '/api/problems/assigned');
    expect(request.request.method).toBe('GET');
    const params = request.request.params;
    expect(Object.fromEntries(params.keys().map((key) => [key, params.get(key)]))).toEqual({
      teamId: '12',
      competitionId: '30',
      competitionStatus: 'EN_CURSO',
      status: 'PENDIENTE',
      q: 'theatre',
      difficulty: '1000',
      sort: 'title',
      order: 'desc',
    });
    request.flush({ teamId: 12, total: 0, items: [] });
    expect((await list).total).toBe(0);
  });

  it('omits the empty assigned filters', () => {
    api.assigned({ teamId: 12, competitionId: null, status: '', q: '  ', sort: '' }).subscribe();
    const request = http.expectOne((r) => r.url === '/api/problems/assigned');
    expect(request.request.params.keys()).toEqual(['teamId']);
    request.flush({ teamId: 12, total: 0, items: [] });
  });

  it('reads one assignment with GET /problems/assigned/{competitionProblemId}', async () => {
    const detail = firstValueFrom(api.assignedDetail(51));
    const request = http.expectOne('/api/problems/assigned/51');
    expect(request.request.method).toBe('GET');
    request.flush({ assignment: { competitionProblemId: 51 }, attempts: [] });
    expect((await detail).assignment.competitionProblemId).toBe(51);
  });

  it('assigns problems with POST /problems/assign and the exact request body', async () => {
    const body = {
      competitionId: 30,
      problems: [
        { problemId: 7, letter: 'C', score: 100, balloonColor: '#FF0000' },
        { problemId: 9, letter: null, score: 1, balloonColor: '#22C55E' },
      ],
    };
    const result = firstValueFrom(api.assign(body));
    const request = http.expectOne('/api/problems/assign');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ competitionId: 30, teamId: 12, assigned: [] }, { status: 201, statusText: 'Created' });
    expect((await result).teamId).toBe(12);
  });
});

describe('problemsError', () => {
  const failure = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  it('explains an expired session on 401 and a missing permission on 403', () => {
    expect(problemsError(failure(401))).toContain('sesión');
    expect(problemsError(failure(403, { message: 'Solo un coach activo puede asignar problemas' }))).toBe(
      'Solo un coach activo puede asignar problemas',
    );
    expect(problemsError(failure(403))).toContain('permiso');
  });

  it('uses the backend message for 404 and 409 and a generic one when it is missing', () => {
    expect(problemsError(failure(404, { message: 'El problema no está asignado' }))).toBe(
      'El problema no está asignado',
    );
    expect(problemsError(failure(404))).toContain('No encontramos');
    expect(problemsError(failure(409, { message: 'Ya existe una resolución' }))).toBe(
      'Ya existe una resolución',
    );
  });

  it('reports connection failures and server errors with the same retry message', () => {
    expect(problemsError(failure(0))).toContain('No pudimos conectar');
    expect(problemsError(failure(503, { message: 'detalle interno' }))).toContain('No pudimos conectar');
  });
});
