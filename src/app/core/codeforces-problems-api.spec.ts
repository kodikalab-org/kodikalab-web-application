import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import {
  CodeforcesProblemsApi,
  codeforcesCodeFrom,
  codeforcesImportError,
} from './codeforces-problems-api';

describe('CodeforcesProblemsApi', () => {
  let api: CodeforcesProblemsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(CodeforcesProblemsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('imports a problem with POST /problems/codeforces/import and the code in the body', async () => {
    const result = firstValueFrom(api.importByCode('1850A'));
    const request = http.expectOne('/api/problems/codeforces/import');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: '1850A' });
    const body = { created: true, problem: { id: 9, title: 'To My Critics' } };
    request.flush(body);
    expect(await result).toEqual(body);
  });

  it('searches Codeforces with GET /problems/codeforces/search sending q and limit 20', async () => {
    const result = firstValueFrom(api.search(' dijkstra '));
    const request = http.expectOne((r) => r.url === '/api/problems/codeforces/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('dijkstra');
    expect(request.request.params.get('limit')).toBe('20');
    const items = [
      {
        code: '20C',
        title: 'Dijkstra?',
        difficultyRating: 1900,
        topics: ['graphs'],
        url: 'https://codeforces.com/problemset/problem/20/C',
        problemId: null,
      },
    ];
    request.flush(items);
    expect(await result).toEqual(items);
  });

  it('accepts the results wrapped in an items field', async () => {
    const result = firstValueFrom(api.search('x1'));
    http.expectOne((r) => r.url === '/api/problems/codeforces/search').flush({ items: [] });
    expect(await result).toEqual([]);
  });
});

describe('codeforcesCodeFrom', () => {
  it('normalizes a plain code', () => {
    expect(codeforcesCodeFrom(' 1850a ')).toBe('1850A');
    expect(codeforcesCodeFrom('1850 A')).toBe('1850A');
    expect(codeforcesCodeFrom('1324b2')).toBe('1324B2');
  });

  it('extracts the code from a problem URL', () => {
    expect(codeforcesCodeFrom('https://codeforces.com/problemset/problem/1850/A')).toBe('1850A');
    expect(codeforcesCodeFrom('https://codeforces.com/contest/1850/problem/c')).toBe('1850C');
    expect(codeforcesCodeFrom('https://codeforces.com/gym/102/problem/B')).toBe('102B');
  });

  it('returns null for text that is not a Codeforces code', () => {
    expect(codeforcesCodeFrom('')).toBeNull();
    expect(codeforcesCodeFrom('hola')).toBeNull();
    expect(codeforcesCodeFrom('1850')).toBeNull();
  });
});

describe('codeforcesImportError', () => {
  const failure = (status: number, body: unknown = null) =>
    new HttpErrorResponse({ status, error: body });

  it('shows the code error of a 400', () => {
    expect(
      codeforcesImportError(failure(400, { errors: { code: 'El código no es válido' } })),
    ).toBe('El código no es válido');
  });

  it('explains a missing problem on Codeforces', () => {
    expect(codeforcesImportError(failure(404, { message: 'x' }))).toBe(
      'El problema no existe en Codeforces',
    );
  });

  it('explains that Codeforces is unavailable on a 503', () => {
    expect(codeforcesImportError(failure(503))).toContain('Codeforces no está disponible');
  });

  it('falls back to the connection message when there is no answer', () => {
    expect(codeforcesImportError(failure(0))).toContain('No pudimos conectar');
  });
});
