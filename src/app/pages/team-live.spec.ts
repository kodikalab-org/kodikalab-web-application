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
  const competitionsRequest = (team: number) =>
    http.expectOne((r) => r.url === '/api/competitions' && r.params.get('teamId') === String(team));
  const assignedRequest = (team: number) =>
    http.expectOne(
      (r) => r.url === '/api/problems/assigned' && r.params.get('teamId') === String(team),
    );
  const competitionItem = (id: number, eventName: string) => ({
    id,
    eventName,
    status: 'FINALIZADA',
    startsAt: null,
    endsAt: null,
    problemsCount: 1,
  });
  const competitionList = (teamId: number, items: unknown[]) => ({
    teamId,
    total: items.length,
    items,
  });
  const assignedItem = (
    competitionProblemId: number,
    competitionId: number,
    title: string,
    eventName: string,
    letter: string,
  ) => ({
    competitionProblemId,
    letter,
    competition: { id: competitionId, name: eventName, status: 'FINALIZADA' },
    problem: { id: 3, title },
  });
  const assignedList = (teamId: number, items: unknown[]) => ({
    teamId,
    total: items.length,
    items,
  });
  async function setup<T extends TeamPage>(
    component: Type<T>,
    initial: Record<string, string> = { teamId: '1' },
    authenticated = false,
    catalogs = true,
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
    if (authenticated)
      TestBed.inject(Session).account.set({
        token: 'test-token',
        email: 'test@example.com',
        role: 'PRACTICANTE',
        expiresAt: Date.now() + 3600_000,
      });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    if (catalogs && initial['teamId']) {
      const team = Number(initial['teamId']);
      if (fixture.componentInstance instanceof ResultsLive)
        competitionsRequest(team).flush(
          competitionList(team, [competitionItem(30, 'Competencia real')]),
        );
      if (fixture.componentInstance instanceof ProgressLive)
        assignedRequest(team).flush(
          assignedList(team, [assignedItem(50, 30, 'Problema real', 'Competencia real', 'A')]),
        );
    }
    return {
      fixture,
      page: fixture.componentInstance,
      params,
      root: fixture.nativeElement as HTMLElement,
    };
  }
  afterEach(() => http?.verify());
  it('lists only active memberships and selects the only available team', async () => {
    const { fixture, root } = await setup(ProgressLive, {}, true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne('/api/teams/me').flush([
      { groupId: 4, name: 'Equipo activo', membership: { status: 'ACTIVO' } },
      { groupId: 5, name: 'Equipo pendiente', membership: { status: 'PENDIENTE' } },
    ]);
    fixture.detectChanges();
    expect(root.querySelector('select')?.textContent).toContain('Equipo activo');
    expect(root.querySelector('select')?.textContent).not.toContain('Equipo pendiente');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { teamId: 4, competitionId: null, competitionProblemId: null },
      }),
    );
  });
  it.each(['PENDIENTE', 'ACLARACION_SOLICITADA', 'RECHAZADO', 'RETIRADO', 'EXPULSADO'])(
    'does not offer a team whose membership is %s (/teams/me returns every status)',
    async (status) => {
      const { fixture, root } = await setup(ProgressLive, {}, true);
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      http.expectOne('/api/teams/me').flush([
        { groupId: 4, name: 'Equipo vigente', membership: { status: 'ACTIVO' } },
        { groupId: 5, name: 'Equipo descartado', membership: { status } },
      ]);
      fixture.detectChanges();
      const options = [...root.querySelectorAll('select option')].map((o) => o.textContent);
      expect(options.join('|')).toContain('Equipo vigente');
      expect(options.join('|')).not.toContain('Equipo descartado');
    },
  );
  it('does not offer draft groups to the coach', async () => {
    const { fixture, root } = await setup(TopicsLive, {}, true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne('/api/teams/me').flush([
      { groupId: 4, name: 'Grupo publicado', status: 'ACTIVO', activeMembers: 2 },
      { groupId: 6, name: 'Grupo en borrador', status: 'BORRADOR', activeMembers: 0 },
    ]);
    fixture.detectChanges();
    expect(root.querySelector('select')?.textContent).toContain('Grupo publicado');
    expect(root.querySelector('select')?.textContent).not.toContain('Grupo en borrador');
  });
  it('lists the coach teams without offering practitioner memberships', async () => {
    const { fixture, root } = await setup(TopicsLive, {}, true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne('/api/teams/me').flush([
      { groupId: 4, name: 'Equipo del coach', activeMembers: 2 },
      { groupId: 5, name: 'Membresía practicante', membership: { status: 'ACTIVO' } },
    ]);
    fixture.detectChanges();
    expect(root.querySelector('select')?.textContent).toContain('Equipo del coach');
    expect(root.querySelector('select')?.textContent).not.toContain('Membresía practicante');
  });
  it('keeps team selection explicit when several memberships are active', async () => {
    const { fixture, root } = await setup(ProgressLive, {}, true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    http.expectOne('/api/teams/me').flush([
      { groupId: 4, name: 'Equipo A', membership: { status: 'ACTIVO' } },
      { groupId: 5, name: 'Equipo B', membership: { status: 'ACTIVO' } },
    ]);
    fixture.detectChanges();
    expect(root.querySelectorAll('select option')).toHaveLength(3);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('explains an unavailable teams endpoint without asking for manual IDs', async () => {
    const { fixture, root } = await setup(ProgressLive, {}, true);
    http.expectOne('/api/teams/me').flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(root.textContent).toContain('No se pudieron cargar tus equipos');
    expect(root.querySelector('input[formControlName="teamId"]')).toBeNull();
  });
  it('treats an empty team list as a valid empty state instead of an error', async () => {
    const { fixture, root } = await setup(ProgressLive, {}, true);
    http.expectOne('/api/teams/me').flush([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('No tienes equipos disponibles');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
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
  it('shows the ordering and tie criteria returned by the service when positions are shared', async () => {
    const { fixture, root } = await setup(RankingLive);
    http.expectOne('/api/analytics/teams/1/standings').flush({
      teamId: 1,
      status: 'CALCULATED',
      orderingCriterion: 'Problemas distintos aceptados, de mayor a menor',
      tieCriterion: 'Los empatados comparten la misma posición y la siguiente se omite',
      members: [
        { membershipId: 1, fullName: 'Usuario A', position: 1, acceptedProblems: 3 },
        { membershipId: 2, fullName: 'Usuario B', position: 1, acceptedProblems: 3 },
        { membershipId: 3, fullName: 'Usuario C', position: 3, acceptedProblems: 1 },
      ],
    });
    fixture.detectChanges();
    expect(root.textContent).toContain('Problemas distintos aceptados, de mayor a menor');
    expect(root.textContent).toContain(
      'Los empatados comparten la misma posición y la siguiente se omite',
    );
    expect(root.textContent).not.toContain('1, 1, 3');
  });
  it('does not mention ties when no positions are shared', async () => {
    const { fixture, root } = await setup(RankingLive);
    http.expectOne('/api/analytics/teams/1/standings').flush({
      teamId: 1,
      status: 'CALCULATED',
      orderingCriterion: 'Problemas distintos aceptados, de mayor a menor',
      tieCriterion: 'Los empatados comparten la misma posición y la siguiente se omite',
      members: [
        { membershipId: 1, fullName: 'Usuario A', position: 1, acceptedProblems: 3 },
        { membershipId: 2, fullName: 'Usuario B', position: 2, acceptedProblems: 1 },
      ],
    });
    fixture.detectChanges();
    expect(root.textContent).toContain('Problemas distintos aceptados, de mayor a menor');
    expect(root.textContent).not.toContain('Los empatados comparten');
    expect(root.textContent).not.toContain('Posiciones compartidas');
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
    http.expectOne('/api/analytics/teams/1/standings').flush(
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
  it('lists competitions by name without exposing a manual ID field', async () => {
    const { fixture, root } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    fixture.detectChanges();
    expect(root.querySelector('select[formControlName="competitionId"]')?.textContent).toContain(
      'Competencia real',
    );
    expect(root.querySelector('input[formControlName="competitionId"]')).toBeNull();
    const select = root.querySelector<HTMLSelectElement>(
      'select[formControlName="competitionId"]',
    )!;
    select.value = '30';
    select.dispatchEvent(new Event('change'));
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({ competitionId: 30, teamId: 1, status: 'CONFIRMADO' });
  });
  it('shows a legitimate empty competition list without an ID fallback', async () => {
    const { fixture, root } = await setup(ResultsLive, { teamId: '1' }, false, false);
    competitionsRequest(1).flush(competitionList(1, []));
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('no tiene competencias disponibles');
    expect(root.querySelector('input[formControlName="competitionId"]')).toBeNull();
  });
  it('keeps the independent progress visible when the assignments request fails', async () => {
    const { fixture, page, root } = await setup(ProgressLive, { teamId: '1' }, false, false);
    assignedRequest(1).flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 1, acceptedProblems: 2 });
    fixture.detectChanges();
    expect(page.assignments()).toEqual([]);
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    // A failed assignments request must not hide the independent progress (US14).
    expect(page.progress()?.acceptedProblems).toBe(2);
    expect(root.textContent).toContain('Problemas distintos aceptados');
  });
  it('shows assignments even when the progress request fails', async () => {
    const { fixture, page, root } = await setup(ProgressLive, { teamId: '1' }, false, false);
    assignedRequest(1).flush(
      assignedList(1, [assignedItem(50, 30, 'Problema real', 'Competencia real', 'A')]),
    );
    http
      .expectOne('/api/analytics/teams/1/progress/me')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(page.progress()).toBeNull();
    expect(page.assignments()).toHaveLength(1);
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });
  it('ignores a progress response that belongs to another team', async () => {
    const { fixture, page, root } = await setup(ProgressLive, { teamId: '1' }, false, false);
    assignedRequest(1).flush(assignedList(1, []));
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 2, acceptedProblems: 9 });
    fixture.detectChanges();
    expect(page.progress()).toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('otro equipo');
  });
  it('ignores assignments that belong to another team', async () => {
    const { page } = await setup(ProgressLive, { teamId: '1' }, false, false);
    assignedRequest(1).flush(
      assignedList(2, [assignedItem(50, 30, 'Problema real', 'Competencia real', 'A')]),
    );
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 1, acceptedProblems: 0 });
    expect(page.assignments()).toEqual([]);
    expect(page.error()).toContain('otro equipo');
  });
  it('cancels a pending assignment catalog and clears the selected problem on team change', async () => {
    const { page, params } = await setup(ProgressLive, { teamId: '1' }, false, false);
    const old = assignedRequest(1);
    const oldProgress = http.expectOne('/api/analytics/teams/1/progress/me');
    page.form.controls.competitionProblemId.setValue('50');
    params.next(convertToParamMap({ teamId: '2' }));
    expect(old.cancelled).toBe(true);
    expect(oldProgress.cancelled).toBe(true);
    expect(page.form.controls.competitionProblemId.value).toBe('');
    assignedRequest(2).flush(assignedList(2, []));
    http.expectOne('/api/analytics/teams/2/progress/me').flush({ teamId: 2, acceptedProblems: 0 });
    expect(page.assignments()).toEqual([]);
  });
  it('distinguishes the same problem assigned to different competitions by the returned assignment ID', async () => {
    const { fixture, page, root } = await setup(ProgressLive, { teamId: '1' }, false, false);
    assignedRequest(1).flush(
      assignedList(1, [
        assignedItem(50, 30, 'Problema compartido', 'Competencia Alfa', 'A'),
        assignedItem(51, 31, 'Problema compartido', 'Competencia Beta', 'B'),
      ]),
    );
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 1, acceptedProblems: 0 });
    fixture.detectChanges();
    const select = root.querySelector<HTMLSelectElement>(
      'select[formControlName="competitionProblemId"]',
    )!;
    expect(select.textContent).toContain('Competencia Alfa');
    expect(select.textContent).toContain('Competencia Beta');
    select.value = '51';
    select.dispatchEvent(new Event('change'));
    page.form.controls.language.setValue('Java');
    page.register();
    http.expectOne('/api/competitions/teams/1/problems/51/resolutions').flush({
      registrationMethod: 'MANUAL_PROVISIONAL',
      resolution: {},
      progress: { teamId: 1, acceptedProblems: 1 },
    });
  });
  it('does not allow an assignment that was not returned by the team catalog', async () => {
    const { page } = await setup(ProgressLive);
    http.expectOne('/api/analytics/teams/1/progress/me').flush({ teamId: 1, acceptedProblems: 0 });
    page.form.setValue({ competitionProblemId: '999', language: 'Java', evidenceUrl: '' });
    page.register();
    http.expectNone((r) => r.method === 'POST');
  });
  it('does not describe a failed history request as an empty official history', async () => {
    const { page, fixture, root } = await setup(ResultsLive);
    http
      .expectOne('/api/competitions/teams/1/official-results')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({ competitionId: 30, teamId: 1, status: 'PENDIENTE' });
    fixture.detectChanges();
    expect(root.textContent).not.toContain('No hay resultados confirmados.');
    expect(root.textContent).toContain('El historial aún no está disponible.');
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
    http.expectOne('/api/competitions/30/official-result').flush({
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
  it.each([
    { message: 'Ya existe un resultado para esta competencia; complete el pendiente mediante PUT' },
    {},
  ])('explains a duplicate official result on create (409 %j)', async (body) => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({}, { status: 404, statusText: 'Not Found' });
    page.save(false);
    http
      .expectOne((r) => r.method === 'POST')
      .flush(body, { status: 409, statusText: 'Conflict' });
    expect(page.error()).toContain('ya tiene un resultado registrado');
    expect(page.error()).not.toContain('inconsistentes');
  });
  it('keeps the backend message for a conflict that is not a duplicate', async () => {
    const { page } = await setup(ResultsLive);
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    page.open(30);
    http
      .expectOne('/api/competitions/30/official-result')
      .flush({}, { status: 404, statusText: 'Not Found' });
    page.save(false);
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { message: 'La competencia no tiene un equipo asociado' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(page.error()).toBe('La competencia no tiene un equipo asociado');
  });
  it('reports a lost connection with the usual message and no proxy hint', async () => {
    const { page } = await setup(TopicsLive);
    http.expectOne('/api/analytics/teams/1/weaknesses').error(new ProgressEvent('error'));
    expect(page.error()).toBe('No pudimos conectar con el servidor. Inténtalo de nuevo.');
    expect(page.error()).not.toContain('proxy');
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
    competitionsRequest(1).flush(competitionList(1, [competitionItem(30, 'Competencia real')]));
    http.expectOne('/api/competitions/teams/1/official-results').flush([]);
    http.expectOne('/api/competitions/30/official-result').flush({
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
