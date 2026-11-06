import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { positiveId, TeamApi } from './team-api';
describe('Team API contracts', () => {
  let api: TeamApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(TeamApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads rankings without a client user identifier', async () => {
    const p = firstValueFrom(api.ranking(12));
    const r = http.expectOne('/api/analytics/teams/12/standings');
    expect(r.request.method).toBe('GET');
    r.flush({ teamId: 12, status: 'NO_ACTIVITY', members: [] });
    expect((await p).members).toEqual([]);
  });
  it('reads the coach topic report', async () => {
    const p = firstValueFrom(api.topics(12));
    const r = http.expectOne('/api/analytics/teams/12/weaknesses');
    expect(r.request.method).toBe('GET');
    r.flush({ teamId: 12, topics: [] });
    await p;
  });
  it('reads official detail', async () => {
    const p = firstValueFrom(api.result(30));
    const r = http.expectOne('/api/competitions/30/official-result');
    expect(r.request.method).toBe('GET');
    r.flush({ status: 'PENDIENTE' });
    await p;
  });
  it('creates partial pending data with POST', async () => {
    const body = { finalPosition: null, solvedProblems: 0, confirm: false };
    const p = firstValueFrom(api.create(30, body));
    const r = http.expectOne('/api/competitions/30/official-result');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(body);
    r.flush({ status: 'PENDIENTE' });
    await p;
  });
  it('confirms a pending result with PUT and both values', async () => {
    const body = { finalPosition: 4, solvedProblems: 3, confirm: true };
    const p = firstValueFrom(api.update(30, body));
    const r = http.expectOne('/api/competitions/30/official-result');
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual(body);
    r.flush({ status: 'CONFIRMADO' });
    await p;
  });
  it('reads only the official history endpoint', async () => {
    const p = firstValueFrom(api.history(12));
    const r = http.expectOne('/api/competitions/teams/12/official-results');
    expect(r.request.method).toBe('GET');
    r.flush([]);
    expect(await p).toEqual([]);
  });
  it('reads personal progress in the selected team', async () => {
    const p = firstValueFrom(api.progress(12));
    const r = http.expectOne('/api/analytics/teams/12/progress/me');
    expect(r.request.method).toBe('GET');
    r.flush({ teamId: 12, acceptedProblems: 0 });
    await p;
  });
  it('registers the assignment ID with no selectable user/verdict', async () => {
    const body = { language: 'Java 21', evidenceUrl: null };
    const p = firstValueFrom(api.register(12, 50, body));
    const r = http.expectOne('/api/competitions/teams/12/problems/50/resolutions');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(body);
    r.flush({ registrationMethod: 'MANUAL_PROVISIONAL' });
    expect((await p).registrationMethod).toBe('MANUAL_PROVISIONAL');
  });
  it('propagates conflicts and the last valid ranking intact', async () => {
    const p = firstValueFrom(api.ranking(12));
    const assertion = expect(p).rejects.toMatchObject({
      status: 409,
      error: { lastValidRanking: { calculatedAt: '2026-11-05T12:00:00Z' } },
    });
    http
      .expectOne('/api/analytics/teams/12/standings')
      .flush(
        { lastValidRanking: { calculatedAt: '2026-11-05T12:00:00Z' } },
        { status: 409, statusText: 'Conflict' },
      );
    await assertion;
  });
});
describe('Team context identifiers', () => {
  it.each([null, '', '0', '-1', '1.5', '1e2', ' 1', '01', '2147483648', '9007199254740992'])(
    'rejects invalid context %s',
    (value) => expect(positiveId(value)).toBeNull(),
  );
  it.each(['1', '2147483647', 25])('accepts real integer context %s', (value) =>
    expect(positiveId(value)).toBe(Number(value)),
  );
});
