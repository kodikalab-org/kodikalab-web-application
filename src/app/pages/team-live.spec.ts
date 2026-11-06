import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { API_URL } from '../core/api';
import { Session } from '../core/session';
import { TeamPage } from '../shared/team-page';
import { RankingLive } from './ranking-equipo/ranking-live';
import { TopicsLive } from './rendimiento-equipo/topics-live';
import { ResultsLive } from './competencias/results-live';
import { ProgressLive } from './progreso-equipos/progress-live';
describe('Live team features', () => {
  let http: HttpTestingController;
  async function setup<T extends TeamPage>(
    component: Type<T>,
    initial: Record<string, string> = { teamId: '1' },
  ) {
    const params = new BehaviorSubject(convertToParamMap(initial));
    await TestBed.configureTestingModule({
      imports: [component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        {
          provide: ActivatedRoute,
          deps: [Router],
          useFactory: (router: Router) => ({
            queryParamMap: params,
            snapshot: router.routerState.snapshot.root,
          }),
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Session).logout();
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return {
      fixture,
      page: fixture.componentInstance,
      params,
      root: fixture.nativeElement as HTMLElement,
    };
  }
  afterEach(() => http?.verify());
  it('does not request anything without team context', async () => {
    const { root } = await setup(RankingLive, {});
    http.expectNone(() => true);
    expect(root.textContent).toContain('contexto de equipo válido');
  });
  it('displays shared server positions without reranking', async () => {
    const { fixture, root } = await setup(RankingLive);
    http.expectOne('/api/analytics/teams/1/standings').flush({
      teamId: 1,
      status: 'CALCULATED',
      members: [
        { membershipId: 1, fullName: 'Usuario A', position: 1, acceptedProblems: 3 },
        { membershipId: 2, fullName: 'Usuario B', position: 1, acceptedProblems: 3 },
        { membershipId: 3, fullName: 'Usuario C', position: 3, acceptedProblems: 1 },
      ],
    });
    fixture.detectChanges();
    expect(
      [...root.querySelectorAll('tbody tr td:first-child')].map((n) => n.textContent?.trim()),
    ).toEqual(['1', '1', '3']);
  });
  it('shows NO_ACTIVITY without invented positions', async () => {
    const { fixture, root } = await setup(RankingLive);
    http
      .expectOne('/api/analytics/teams/1/standings')
      .flush({ teamId: 1, status: 'NO_ACTIVITY', members: [] });
    fixture.detectChanges();
    expect(root.textContent).toContain('no tiene actividad');
    expect(root.querySelector('tbody')).toBeNull();
  });
  it('keeps the error visible beside a dated previous result', async () => {
    const { fixture, root } = await setup(RankingLive);
    http
      .expectOne('/api/analytics/teams/1/standings')
      .flush(
        {
          message: 'Datos inconsistentes',
          errors: { teamId: 'Cruce' },
          lastValidRanking: {
            calculatedAt: '2026-11-05T12:00:00Z',
            ranking: { teamId: 1, status: 'CALCULATED', members: [] },
          },
        },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('Datos inconsistentes');
    expect(root.textContent).toContain('Último ranking válido');
  });
  it('does not disclose a snapshot of another team', async () => {
    const { page } = await setup(RankingLive);
    http
      .expectOne('/api/analytics/teams/1/standings')
      .flush(
        { lastValidRanking: { calculatedAt: '2026-11-05', ranking: { teamId: 2, members: [] } } },
        { status: 409, statusText: 'Conflict' },
      );
    expect(page.previous()).toBeNull();
  });
  it('discards requests and results when switching teams', async () => {
    const { page, params } = await setup(RankingLive);
    const old = http.expectOne('/api/analytics/teams/1/standings');
    params.next(convertToParamMap({ teamId: '2' }));
    expect(old.cancelled).toBe(true);
    http
      .expectOne('/api/analytics/teams/2/standings')
      .flush({ teamId: 2, status: 'NO_ACTIVITY', members: [] });
    expect(page.ranking()?.teamId).toBe(2);
  });
  it('displays all exact minima and pending counts returned by the coach report', async () => {
    const { fixture, root } = await setup(TopicsLive);
    http.expectOne('/api/analytics/teams/1/weaknesses').flush({
      teamId: 1,
      activeMembers: 2,
      pendingResolutions: 1,
      comparisonExplanation: 'Comparación exacta',
      topics: [
        {
          topicId: 1,
          topicName: 'Grafos',
          assignedProblems: 3,
          solvedProblems: 1,
          unsolvedProblems: 2,
          solvingMembers: 1,
          pendingResolutions: 1,
          coveragePercentage: 33.33,
          lowestCoverage: true,
        },
        {
          topicId: 2,
          topicName: 'DP',
          assignedProblems: 6,
          solvedProblems: 2,
          unsolvedProblems: 4,
          solvingMembers: 2,
          pendingResolutions: 0,
          coveragePercentage: 33.33,
          lowestCoverage: true,
        },
      ],
    });
    fixture.detectChanges();
    expect(root.querySelectorAll('article')).toHaveLength(2);
    expect(root.textContent).toContain('DP');
    expect(root.textContent).toContain('Grafos');
    expect(root.textContent).toContain('Comparación exacta');
  });
  it.each([403, 409, 503])('shows report error %s without metrics', async (status) => {
    const { fixture, page, root } = await setup(TopicsLive);
    http
      .expectOne('/api/analytics/teams/1/weaknesses')
      .flush({ message: 'Reporte no disponible' }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(page.report()).toBeNull();
    expect(root.querySelector('[role=alert]')).not.toBeNull();
  });
  it('loads confirmed history without inventing pending entries', async () => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    expect(page.history()).toEqual([]);
  });
  it('blocks edits to confirmed official results', async () => {
    const { page, fixture, root } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({
        id: 1,
        competitionId: 30,
        teamId: 1,
        eventName: 'Prueba',
        status: 'CONFIRMADO',
        finalPosition: 4,
        solvedProblems: 3,
      });
    fixture.detectChanges();
    expect(page.form.disabled).toBe(true);
    page.save(false);
    http.expectNone((r) => r.method === 'PUT' || r.method === 'POST');
    expect(root.textContent).toContain('no puede editarse');
  });
  it('does not enable writes for a result belonging to another team', async () => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({ teamId: 2, status: 'PENDIENTE' });
    expect(page.loadedId()).toBeNull();
  });
  it('requires both values before confirmation', async () => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({}, { status: 404, statusText: 'Not Found' });
    page.save(true);
    expect(page.error()).toContain('requiere');
    http.expectNone((r) => r.method === 'POST');
  });
  it('creates a pending official with null values and refreshes confirmed history', async () => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({}, { status: 404, statusText: 'Not Found' });
    page.save(false);
    const save = http.expectOne('/api/competitions/30/official-result');
    expect(save.request.body).toEqual({
      finalPosition: null,
      solvedProblems: null,
      confirm: false,
    });
    save.flush({ id: 1, competitionId: 30, teamId: 1, status: 'PENDIENTE' });
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({
        id: 1,
        competitionId: 30,
        teamId: 1,
        status: 'PENDIENTE',
        finalPosition: null,
        solvedProblems: null,
      });
  });
  it('registers a provisional resolution and uses returned team progress', async () => {
    const { page } = await setup(ProgressLive);
    http
      .expectOne('/api/analytics/teams/1/progress/me')
      .flush({ teamId: 1, membershipId: 10, userId: 20, acceptedProblems: 0 });
    page.form.setValue({ competitionProblemId: '50', language: 'Java 21', evidenceUrl: '' });
    page.register();
    const save = http.expectOne('/api/competitions/teams/1/problems/50/resolutions');
    expect(save.request.body).toEqual({ language: 'Java 21', evidenceUrl: null });
    save.flush({
      registrationMethod: 'MANUAL_PROVISIONAL',
      resolution: { resolutionId: 1 },
      progress: { teamId: 1, membershipId: 10, userId: 20, acceptedProblems: 1 },
    });
    expect(page.progress()?.acceptedProblems).toBe(1);
    expect(page.registration()?.registrationMethod).toBe('MANUAL_PROVISIONAL');
  });
  it('preserves progress on duplicate conflict and prevents a second in-flight write', async () => {
    const { page } = await setup(ProgressLive);
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 1, acceptedProblems: 1 });
    page.form.setValue({ competitionProblemId: '50', language: 'Java', evidenceUrl: '' });
    page.register();
    page.register();
    const requests = http.match((r) => r.method === 'POST');
    expect(requests).toHaveLength(1);
    requests[0].flush({ message: 'ACCEPTED duplicado' }, { status: 409, statusText: 'Conflict' });
    expect(page.progress()?.acceptedProblems).toBe(1);
    expect(page.registration()).toBeNull();
  });
});
