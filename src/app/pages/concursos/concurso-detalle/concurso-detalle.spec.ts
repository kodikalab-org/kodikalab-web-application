import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ConcursoDetalle } from './concurso-detalle';
import {
  HOUR, TEAMS, assignedItem, assignedRequest, competitionItem, competitionsRequest, configure, iso,
  teamRequest,
} from '../concursos-test-data';

const STANDINGS = {
  competitionId: 10,
  teamId: 1,
  eventName: 'Contest A',
  status: 'EN_CURSO',
  penaltyRule: 'ICPC_20_MIN',
  startsAt: null,
  endsAt: null,
  problems: ['A', 'B', 'C', 'D'].map((letter, i) => ({
    competitionProblemId: 101 + i, letter, title: `Problema ${letter}`, score: null,
  })),
  rows: [
    {
      position: 1, userId: 7, fullName: 'Ana Perez', solved: 2, score: 0, penaltyMinutes: 85,
      cells: [
        { competitionProblemId: 101, letter: 'A', result: 'RESUELTO', attempts: 1, minutes: 25 },
        { competitionProblemId: 102, letter: 'B', result: 'RESUELTO', attempts: 3, minutes: 60 },
        { competitionProblemId: 103, letter: 'C', result: 'EN_PROGRESO', attempts: 3, minutes: null },
        { competitionProblemId: 104, letter: 'D', result: 'PENDIENTE', attempts: 1, minutes: null },
      ],
    },
    {
      position: 2, userId: 8, fullName: 'Luis Rojas', solved: 0, score: 0, penaltyMinutes: 0,
      cells: ['A', 'B', 'C', 'D'].map((letter, i) => ({
        competitionProblemId: 101 + i, letter, result: 'SIN_INTENTOS', attempts: 0, minutes: null,
      })),
    },
  ],
};

describe('ConcursoDetalle', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = configure([
      provideRouter([
        { path: 'concursos/:teamId/:competitionId', component: ConcursoDetalle },
        { path: 'concursos', children: [] },
      ]),
    ]);
  });

  const statuses = ['RESUELTO', 'PENDIENTE', 'EN_PROGRESO', 'SIN_INTENTOS'];
  const assignedBody = (competitionStatus: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' = 'EN_CURSO') => ({
    teamId: 1,
    total: 4,
    items: statuses.map((status, i) =>
      assignedItem(101 + i, 10, 'ABCD'[i], status, competitionStatus),
    ),
  });

  async function open(url: string, status: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' = 'EN_CURSO') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ConcursoDetalle);
    teamRequest(http).flush(TEAMS);
    competitionsRequest(http, 1).flush({
      teamId: 1,
      total: 1,
      items: [
        competitionItem(
          10, 'Contest A', status,
          iso(status === 'PROGRAMADA' ? 3 * HOUR : -HOUR),
          iso(status === 'PROGRAMADA' ? 5 * HOUR : HOUR),
          4,
        ),
      ],
    });
    assignedRequest(http, 1).flush(assignedBody(status));
    http.expectOne('/api/competitions/10/standings').flush({ ...STANDINGS, status });
    http
      .expectOne('/api/analytics/teams/1/progress/me')
      .flush({ teamId: 1, membershipId: 10, userId: 7, acceptedProblems: 1 });
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, root: harness.routeNativeElement as HTMLElement };
  }

  it('shows the contest header with team, status, duration, penalty rule and remaining time', async () => {
    const { root } = await open('/concursos/1/10');
    const header = root.querySelector('header')!.textContent!;
    expect(header).toContain('Contest A');
    expect(header).toContain('Alfa ICPC');
    expect(header).toContain('En curso');
    expect(header).toContain('2 h');
    expect(header).toContain('ICPC (20 min por envío incorrecto)');
    expect(header).toMatch(/Termina en \d+ h|Termina en \d+ min/);
  });

  it('lists the problems with the statement link and the Codeforces submit link built by submitUrl', async () => {
    const { root } = await open('/concursos/1/10');
    const rows = root.querySelectorAll('table[aria-label="Problemas del concurso"] tbody tr');
    expect(rows.length).toBe(4);
    const statement = rows[0].querySelector<HTMLAnchorElement>('a[href="https://codeforces.com/contest/1850/problem/A"]')!;
    expect(statement.target).toBe('_blank');
    const submit = Array.from(rows[0].querySelectorAll('a')).find((a) => a.textContent?.includes('Enviar en Codeforces'))!;
    expect(submit.getAttribute('href')).toBe('https://codeforces.com/contest/1850/submit/A');
    expect(submit.target).toBe('_blank');
    expect(rows[0].textContent).toContain('Resuelto');
    expect(rows[1].textContent).toContain('Pendiente de verificación');
    expect(rows[0].textContent).toContain('1200');
    expect(rows[0].textContent).toContain('Greedy');
  });

  it('registers a submission with language and evidence URL, then refreshes the statuses', async () => {
    const { harness, root } = await open('/concursos/1/10');
    const row = root.querySelectorAll('table[aria-label="Problemas del concurso"] tbody tr')[3];
    Array.from(row.querySelectorAll('button')).find((b) => b.textContent?.includes('Registrar envío'))!.click();
    harness.detectChanges();
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    const language = dialog.querySelector<HTMLSelectElement>('select[aria-label="Lenguaje"]')!;
    language.value = 'Python 3.11';
    language.dispatchEvent(new Event('change'));
    const evidence = dialog.querySelector<HTMLInputElement>('input[aria-label="URL de evidencia del envío"]')!;
    evidence.value = 'https://codeforces.com/contest/1850/submission/1';
    evidence.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar envío'))!.click();
    const post = http.expectOne('/api/competitions/teams/1/problems/104/resolutions');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      language: 'Python 3.11',
      evidenceUrl: 'https://codeforces.com/contest/1850/submission/1',
    });
    post.flush({
      resolution: { resolutionId: 5, membershipId: 10, membershipTeamId: 1, competitionProblemId: 104, competitionId: 10, competitionTeamId: 1, problemId: 104, verdict: 'PENDIENTE' },
      registrationMethod: 'MANUAL',
      progress: { teamId: 1, membershipId: 10, userId: 7, acceptedProblems: 1 },
    });
    assignedRequest(http, 1).flush(assignedBody());
    http.expectOne('/api/competitions/10/standings').flush(STANDINGS);
    harness.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).toContain('Envío registrado');
  });

  async function registerProblemD(refreshedStatus: string) {
    const { harness, root } = await open('/concursos/1/10');
    const row = root.querySelectorAll('table[aria-label="Problemas del concurso"] tbody tr')[3];
    Array.from(row.querySelectorAll('button')).find((b) => b.textContent?.includes('Registrar envío'))!.click();
    harness.detectChanges();
    const dialog = root.querySelector('[role="dialog"]')!;
    Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar envío'))!.click();
    http.expectOne('/api/competitions/teams/1/problems/104/resolutions').flush({
      resolution: { resolutionId: 5, membershipId: 10, membershipTeamId: 1, competitionProblemId: 104, competitionId: 10, competitionTeamId: 1, problemId: 104, verdict: 'PENDIENTE' },
      registrationMethod: 'MANUAL',
      progress: { teamId: 1, membershipId: 10, userId: 7, acceptedProblems: 1 },
    });
    const body = assignedBody();
    assignedRequest(http, 1).flush({
      ...body,
      items: body.items.map((item) => (item.competitionProblemId === 104 ? { ...item, status: refreshedStatus } : item)),
    });
    http.expectOne('/api/competitions/10/standings').flush(STANDINGS);
    harness.detectChanges();
    return root;
  }

  it('says the problem is solved when the refreshed status is RESUELTO, not that it is pending', async () => {
    const root = await registerProblemD('RESUELTO');
    const text = root.textContent!;
    expect(text).toContain('Envío registrado: el problema D quedó como resuelto.');
    expect(text).not.toContain('Quedó pendiente de verificación');
  });

  it('says it is pending verification only when the refreshed status is PENDIENTE', async () => {
    const root = await registerProblemD('PENDIENTE');
    expect(root.textContent).toContain('Envío registrado para el problema D. Quedó pendiente de verificación.');
  });

  it('uses a neutral message for any other resulting status', async () => {
    const root = await registerProblemD('EN_PROGRESO');
    expect(root.textContent).toContain('Envío registrado para el problema D.');
    expect(root.textContent).not.toContain('Quedó pendiente de verificación');
    expect(root.textContent).not.toContain('quedó como resuelto');
  });

  it('disables "Registrar envío" for a solved problem with an explanation and keeps the others enabled', async () => {
    const { root } = await open('/concursos/1/10');
    const buttons = Array.from(root.querySelectorAll('table[aria-label="Problemas del concurso"] tbody tr')).map(
      (row) => Array.from(row.querySelectorAll('button')).find((b) => b.textContent?.includes('Registrar envío'))!,
    );
    expect(buttons.map((b) => b.disabled)).toEqual([true, false, false, false]);
    expect(buttons[0].getAttribute('aria-description')).toBe('Ya resolviste este problema');
    expect(buttons[0].getAttribute('title')).toBe('Ya resolviste este problema');
    expect(buttons[1].hasAttribute('aria-description')).toBe(false);
  });

  it('disables registering submissions while the contest is PROGRAMADA', async () => {
    const { root } = await open('/concursos/1/10', 'PROGRAMADA');
    const buttons = Array.from(root.querySelectorAll('table[aria-label="Problemas del concurso"] button')).filter(
      (b) => b.textContent?.includes('Registrar envío'),
    ) as HTMLButtonElement[];
    expect(buttons.length).toBe(4);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(root.querySelector('header')!.textContent).toContain('Empieza en');
  });

  it('renders the standings with +, +N, -N and ? cells, positions and highlights my row', async () => {
    const { root } = await open('/concursos/1/10?tab=clasificacion');
    const table = root.querySelector('table[aria-label="Clasificación del concurso"]')!;
    const header = table.querySelector('thead')!.textContent!;
    expect(header).toContain('Penalización');
    ['A', 'B', 'C', 'D'].forEach((letter) => expect(header).toContain(letter));
    const rows = table.querySelectorAll('tbody tr');
    const ana = Array.from(rows[0].querySelectorAll('td')).map((td) => td.textContent!.trim());
    expect(ana[0]).toBe('1');
    expect(ana[1]).toContain('Ana Perez');
    expect(ana[2]).toBe('2');
    expect(ana[3]).toBe('85');
    expect(ana[4]).toContain('+');
    expect(ana[4]).toContain('0:25');
    expect(ana[5]).toContain('+2');
    expect(ana[5]).toContain('1:00');
    expect(ana[6]).toBe('-3');
    expect(ana[7]).toBe('?');
    const luis = Array.from(rows[1].querySelectorAll('td')).map((td) => td.textContent!.trim());
    expect(luis.slice(4)).toEqual(['', '', '', '']);
    expect(rows[0].getAttribute('aria-current')).toBe('true');
    expect(rows[1].getAttribute('aria-current')).toBeNull();
  });

  it('shows points instead of penalty for IOI contests', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/concursos/1/10?tab=clasificacion', ConcursoDetalle);
    teamRequest(http).flush(TEAMS);
    competitionsRequest(http, 1).flush({ teamId: 1, total: 1, items: [competitionItem(10, 'Contest A', 'EN_CURSO', iso(-HOUR), iso(HOUR))] });
    assignedRequest(http, 1).flush(assignedBody());
    http.expectOne('/api/competitions/10/standings').flush({ ...STANDINGS, penaltyRule: 'IOI_POINTS' });
    http.expectOne('/api/analytics/teams/1/progress/me').flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('thead')!.textContent).toContain('Puntos');
    expect(root.querySelector('header')!.textContent).toContain('IOI (puntos)');
    expect(root.querySelector('tr[aria-current="true"]')).toBeNull();
  });

  it('links the group tab to the team ranking and the progress tab to my team progress', async () => {
    const group = await open('/concursos/1/10?tab=grupo');
    const ranking = group.root.querySelector<HTMLAnchorElement>('a[href="/ranking?teamId=1"]');
    expect(ranking).not.toBeNull();
  });

  it('shows my progress in the contest by status', async () => {
    const { root } = await open('/concursos/1/10?tab=progreso');
    expect(root.textContent).toContain('1/4');
    expect(root.querySelector('a[href="/progreso/equipos?teamId=1"]')).not.toBeNull();
    expect(root.textContent).toMatch(/Resueltos\s*1/);
    expect(root.textContent).toMatch(/Pendientes de verificación\s*1/);
  });

  it('changes the tab through the tab query param', async () => {
    const { harness, root } = await open('/concursos/1/10');
    Array.from(root.querySelectorAll<HTMLAnchorElement>('[role="tab"]'))
      .find((a) => a.textContent?.includes('Clasificación'))!
      .click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('tab=clasificacion');
  });

  it('shows a friendly no-access message when the team membership is not ACTIVO', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/concursos/3/30', ConcursoDetalle);
    teamRequest(http).flush(TEAMS);
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('No tienes acceso a este concurso');
    expect(root.querySelector('a[href="/concursos"]')).not.toBeNull();
    http.expectNone((r) => r.url === '/api/competitions');
  });

  it('shows the no-access message when the contest is not in the team', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/concursos/1/99', ConcursoDetalle);
    teamRequest(http).flush(TEAMS);
    competitionsRequest(http, 1).flush({ teamId: 1, total: 1, items: [competitionItem(10, 'Contest A', 'EN_CURSO', iso(-HOUR), iso(HOUR))] });
    assignedRequest(http, 1).flush(assignedBody());
    harness.detectChanges();
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('No tienes acceso a este concurso');
  });
});
