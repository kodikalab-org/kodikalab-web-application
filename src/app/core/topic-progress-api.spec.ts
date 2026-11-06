import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TopicProgressApi, TopicProgressResponse } from './topic-progress-api';

const URL1 = 'http://localhost:8080/api/analytics/teams/1/progress/me/topics';

const valid = (): TopicProgressResponse => ({
  teamId: 1,
  membershipId: 7,
  userId: 10,
  assignedProblems: 3,
  solvedProblems: 1,
  unclassifiedProblems: 0,
  reinforcementCriterion: 'criterio',
  topics: [
    {
      topicId: 3,
      topicName: 'Programación dinámica',
      assignedProblems: 1,
      solvedProblems: 0,
      unsolvedProblems: 1,
      pendingProblems: 0,
      coveragePercentage: 0,
      status: 'SIN_ACTIVIDAD',
      needsReinforcement: true,
    },
  ],
});

describe('TopicProgressApi', () => {
  let api: TopicProgressApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TopicProgressApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads and exposes the progress of a team', () => {
    api.load(1);
    expect(api.loading()).toBe(true);
    http.expectOne(URL1).flush(valid());
    expect(api.loading()).toBe(false);
    expect(api.progress()?.topics.length).toBe(1);
    expect(api.error()).toBeNull();
    expect(api.teamId()).toBe(1);
  });

  it('accepts an empty topic list', () => {
    api.load(1);
    http.expectOne(URL1).flush({ ...valid(), assignedProblems: 0, solvedProblems: 0, topics: [] });
    expect(api.progress()?.topics).toEqual([]);
  });

  it('treats a response without topics as inconsistent and shows no indicators', () => {
    api.load(1);
    const broken: Partial<TopicProgressResponse> = valid();
    delete broken.topics;
    http.expectOne(URL1).flush(broken);
    expect(api.progress()).toBeNull();
    expect(api.error()?.kind).toBe('inconsistent');
  });

  it('treats non finite numbers as inconsistent', () => {
    api.load(1);
    const body = valid();
    body.topics[0].coveragePercentage = null as unknown as number;
    http.expectOne(URL1).flush(body);
    expect(api.progress()).toBeNull();
    expect(api.error()?.kind).toBe('inconsistent');
  });

  it('treats a response for another team as inconsistent', () => {
    api.load(1);
    http.expectOne(URL1).flush({ ...valid(), teamId: 2 });
    expect(api.progress()).toBeNull();
    expect(api.error()?.kind).toBe('inconsistent');
  });

  it('treats solved greater than assigned as inconsistent', () => {
    api.load(1);
    http.expectOne(URL1).flush({ ...valid(), solvedProblems: 9 });
    expect(api.error()?.kind).toBe('inconsistent');
  });

  const cases: [number, string, boolean][] = [
    [400, 'invalid', false],
    [401, 'unauthorized', false],
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [409, 'inconsistent', true],
    [503, 'unavailable', true],
  ];
  for (const [status, kind, retryable] of cases) {
    it(`maps HTTP ${status} to ${kind}`, () => {
      api.load(1);
      http.expectOne(URL1).flush({ message: 'mensaje' }, { status, statusText: 'error' });
      expect(api.progress()).toBeNull();
      expect(api.error()?.kind).toBe(kind);
      expect(api.error()?.retryable).toBe(retryable);
      expect(api.error()?.message).toBe('mensaje');
    });
  }

  it('hides the raw message of other 5xx errors', () => {
    api.load(1);
    http.expectOne(URL1).flush({ message: 'stack trace' }, { status: 500, statusText: 'error' });
    expect(api.error()?.kind).toBe('unavailable');
    expect(api.error()?.message).not.toContain('stack');
  });

  it('keeps the affected data of a 409', () => {
    api.load(1);
    http
      .expectOne(URL1)
      .flush(
        { message: 'inconsistente', errors: { 'attempts[7]': 'El intento está incompleto' } },
        { status: 409, statusText: 'Conflict' },
      );
    expect(api.error()?.affected).toEqual([
      { field: 'attempts[7]', message: 'El intento está incompleto' },
    ]);
  });

  it('maps a network failure to unavailable', () => {
    api.load(1);
    http.expectOne(URL1).error(new ProgressEvent('error'), { status: 0 });
    expect(api.error()?.kind).toBe('unavailable');
    expect(api.error()?.retryable).toBe(true);
  });

  it('never mixes teams: loading another team cancels and clears the previous one', () => {
    api.load(1);
    const first = http.expectOne(URL1);
    api.load(2);
    expect(first.cancelled).toBe(true);
    expect(api.progress()).toBeNull();
    http
      .expectOne('http://localhost:8080/api/analytics/teams/2/progress/me/topics')
      .flush({ ...valid(), teamId: 2 });
    expect(api.progress()?.teamId).toBe(2);
  });

  it('clears a previous error when retrying', () => {
    api.load(1);
    http.expectOne(URL1).flush({ message: 'x' }, { status: 503, statusText: 'error' });
    api.load(1);
    expect(api.error()).toBeNull();
    http.expectOne(URL1).flush(valid());
    expect(api.progress()).not.toBeNull();
  });
});
