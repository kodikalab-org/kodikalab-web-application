import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../../../core/api';
import { ProblemasAsignadosCoach } from './problemas-asignados-coach';

const group = (groupId: number, name: string, status = 'ACTIVO', activeMembers = 14) => ({
  groupId,
  name,
  status,
  visibility: 'PUBLICO',
  activeMembers,
  pendingRequests: 0,
  invitationCode: 'X',
});

function item(id: number, letter: string, title: string, competition = 30, difficulty: string | null = '1000') {
  return {
    competitionProblemId: id,
    letter,
    score: 100,
    balloonColor: '#FF0000',
    assignedAt: id === 52 ? '2026-10-25T10:00:00Z' : '2026-10-20T10:00:00Z',
    competition: {
      id: competition,
      name: competition === 30 ? 'Simulacro semanal' : 'Maratón interna',
      status: competition === 30 ? 'PROGRAMADA' : 'EN_CURSO',
      startsAt: '2026-11-01T19:00:00Z',
      endsAt: '2026-11-02T04:59:00Z',
      durationMinutes: 300,
      penaltyRule: 'ICPC_20_MIN',
      scoreboardFreezeMinutes: 0,
      accessType: 'PRIVADO',
    },
    problem: {
      id: id * 10,
      title,
      url: null,
      sourcePlatform: 'CSES',
      sourceCode: `CSES-${id}`,
      difficultyRating: difficulty,
      timeLimitMs: 1000,
      memoryLimitMb: 512,
      topics: ['Matemática'],
    },
    // The coach sees the team assignment, not a personal progress.
    status: null,
    attemptCount: null,
    lastAttempt: null,
  };
}

const LIST = {
  teamId: 12,
  total: 3,
  items: [item(50, 'A', 'Theatre Square'), item(51, 'B', 'Weird Algorithm', 31, null), item(52, 'C', 'Missing Number', 31, '800')],
};

describe('ProblemasAsignadosCoach', () => {
  let http: HttpTestingController;

  async function setup(url = '/', teams = [group(12, 'Equipo Alfa'), group(13, 'Equipo Beta'), group(14, 'Borrador', 'BORRADOR')]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: ProblemasAsignadosCoach }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ProblemasAsignadosCoach);
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const list = () => http.expectOne((r) => r.url === '/api/problems/assigned');
    const loadTeams = async () => {
      http.expectOne('/api/teams/me').flush(teams);
      await settle();
    };
    const loadList = async (body = LIST) => {
      list().flush(body);
      await settle();
    };
    const choose = (name: string, value: string) => {
      const select = root.querySelector<HTMLSelectElement>(`select[formcontrolname="${name}"]`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    return { root, settle, list, loadTeams, loadList, choose };
  }

  afterEach(() => http.verify());

  it('lists the assigned problems of the first non-draft team of the coach from the backend', async () => {
    const { root, list, loadTeams, settle } = await setup();
    await loadTeams();
    expect(root.querySelectorAll('mat-radio-group[aria-label="Equipo"] input[type="radio"]').length).toBe(2);
    const request = list();
    expect(request.request.params.get('teamId')).toBe('12');
    request.flush(LIST);
    await settle();
    expect(root.querySelector('h1')?.textContent).toContain('Problemas asignados');
    expect(root.querySelectorAll('ul.problemas > li').length).toBe(3);
    expect(root.textContent).toContain('Theatre Square');
    expect(root.textContent).toContain('Maratón interna');
    expect(root.textContent).not.toContain('Mi estado');
    expect(root.textContent).not.toContain('Borrador');
  });

  it('writes the active members of each team in the singular for one and in the plural otherwise', async () => {
    const { root, loadTeams } = await setup('/', [group(12, 'Equipo Alfa', 'ACTIVO', 1), group(13, 'Equipo Beta', 'ACTIVO', 5)]);
    await loadTeams();
    const text = root.querySelector('mat-radio-group[aria-label="Equipo"]')!.textContent!;
    expect(text).toContain('1 integrante activo');
    expect(text).not.toContain('1 integrantes');
    expect(text).toContain('5 integrantes activos');
    http.expectOne((r) => r.url === '/api/problems/assigned').flush(LIST);
  });

  it('links to the assignment flow', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema');
  });

  it('summarizes the team from the assignments, with the active members of the team', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const aside = root.querySelector('aside')!;
    expect(aside.textContent).toContain('Resumen del equipo');
    expect(aside.textContent).toMatch(/Problemas asignados\s*3/);
    expect(aside.textContent).toMatch(/Competencias\s*2/);
    expect(aside.textContent).toMatch(/Integrantes activos\s*14/);
    expect(root.textContent).toContain('14 integrantes activos');
    expect(aside.textContent).toContain('Simulacro semanal');
  });

  it('maps the filters and the sort to the query parameters', async () => {
    const { root, settle, loadTeams, loadList, list, choose } = await setup();
    await loadTeams();
    await loadList();
    choose('competencia', '31');
    let request = list();
    expect(request.request.params.get('competitionId')).toBe('31');
    request.flush(LIST);
    await settle();
    choose('estado', 'EN_CURSO');
    request = list();
    expect(request.request.params.get('competitionStatus')).toBe('EN_CURSO');
    request.flush(LIST);
    await settle();
    choose('dificultad', '800');
    request = list();
    expect(request.request.params.get('difficulty')).toBe('800');
    request.flush(LIST);
    await settle();
    choose('orden', 'assignedAt');
    request = list();
    expect(request.request.params.get('sort')).toBe('assignedAt');
    expect(request.request.params.get('order')).toBe('asc');
    request.flush(LIST);
    await settle();
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'missing';
    search.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    request = list();
    expect(request.request.params.get('q')).toBe('missing');
    expect(request.request.params.get('competitionId')).toBe('31');
    expect(request.request.params.has('status')).toBe(false);
    request.flush(LIST);
  });

  it('loads the assignments of the other team when the coach switches', async () => {
    const { root, settle, loadTeams, loadList, list } = await setup();
    await loadTeams();
    await loadList();
    root.querySelectorAll<HTMLInputElement>('mat-radio-group[aria-label="Equipo"] input[type="radio"]')[1].click();
    const request = list();
    expect(request.request.params.get('teamId')).toBe('13');
    request.flush({ teamId: 13, total: 0, items: [] });
    await settle();
    expect(root.textContent).toContain('no tiene problemas asignados');
  });

  it('shows the success message after assigning, from the query parameters of the redirect', async () => {
    const { root, loadTeams, loadList } = await setup('/?asignados=3&competencia=Simulacro%20semanal');
    await loadTeams();
    await loadList();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Asignaste 3 problemas a Simulacro semanal');
  });

  it('opens the list of the team given in the teamId query parameter', async () => {
    const { list, loadTeams, settle } = await setup('/?teamId=13');
    await loadTeams();
    const request = list();
    expect(request.request.params.get('teamId')).toBe('13');
    request.flush({ teamId: 13, total: 0, items: [] });
    await settle();
  });

  it('explains the errors of the backend and lets the coach retry', async () => {
    const { root, loadTeams, list, settle } = await setup();
    await loadTeams();
    list().flush({ message: 'Solo el coach responsable puede ver estas asignaciones' }, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Solo el coach responsable');
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    list().flush({}, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar');
  });

  it('offers to create a team when the coach has none besides drafts', async () => {
    const { root, loadTeams } = await setup('/', [group(14, 'Borrador', 'BORRADOR')]);
    await loadTeams();
    expect(root.textContent).toContain('No administras ningún equipo publicado');
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/coach/grupos/crear');
  });
});