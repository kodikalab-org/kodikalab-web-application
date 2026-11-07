import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/api';
import { ProblemasAsignados } from './problemas-asignados';

const membership = (groupId: number, name: string, status: string) => ({
  groupId,
  name,
  description: null,
  expectedLevel: null,
  maxCapacity: null,
  sessionSchedule: null,
  status: 'ACTIVO',
  visibility: 'PUBLICO',
  membership: { membershipId: groupId * 10, status, teamRole: 'MIEMBRO', joinedAt: null, leftAt: null },
});

function item(id: number, letter: string, title: string, status: string | null, competition = 30, difficulty: string | null = '1000') {
  return {
    competitionProblemId: id,
    letter,
    score: 100,
    balloonColor: '#FF0000',
    assignedAt: '2026-10-20T10:00:00Z',
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
    status,
    attemptCount: 0,
    lastAttempt: null,
  };
}

const LIST = {
  teamId: 12,
  total: 4,
  items: [
    item(50, 'A', 'Theatre Square', 'SIN_INTENTOS'),
    item(51, 'B', 'Weird Algorithm', 'EN_PROGRESO', 31, null),
    item(52, 'C', 'Missing Number', 'PENDIENTE', 31, null),
    item(53, 'D', 'Watermelon', 'RESUELTO', 31, '800'),
  ],
};

describe('ProblemasAsignados (practitioner)', () => {
  let http: HttpTestingController;

  async function setup(teams = [membership(12, 'Equipo Alfa', 'ACTIVO'), membership(13, 'Equipo Beta', 'ACTIVO'), membership(14, 'Pendiente', 'PENDIENTE')]) {
    await TestBed.configureTestingModule({
      imports: [ProblemasAsignados],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProblemasAsignados);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
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
    return { fixture, root, settle, list, loadTeams, loadList, choose };
  }

  afterEach(() => http.verify());

  it('offers only the teams where the practitioner is an active member and loads the first one', async () => {
    const { root, list, loadTeams, settle } = await setup();
    await loadTeams();
    const radios = root.querySelectorAll('mat-radio-group[aria-label="Equipo"] input[type="radio"]');
    expect(radios.length).toBe(2);
    expect(root.textContent).toContain('Equipo Alfa');
    expect(root.textContent).not.toContain('Pendiente');
    const request = list();
    expect(request.request.params.get('teamId')).toBe('12');
    expect(request.request.params.keys()).toEqual(['teamId']);
    request.flush(LIST);
    await settle();
  });

  it('shows the assigned problems from the backend with the personal state mapped to Spanish labels', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    expect(root.querySelector('h1')?.textContent).toContain('Problemas asignados');
    expect(root.querySelectorAll('ul.problemas > li').length).toBe(4);
    const estados = Array.from(root.querySelectorAll('ul.problemas > li')).map((li) =>
      li.querySelector('[data-estado]')?.textContent?.trim(),
    );
    expect(estados).toEqual(['Mi estado: Sin intentos', 'Mi estado: En progreso', 'Mi estado: Por verificar', 'Mi estado: Resuelto']);
    expect(root.textContent).toContain('Theatre Square');
    expect(root.textContent).toContain('Maratón interna');
  });

  it('links each problem to its detail route with the assignment id and the team', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const hrefs = Array.from(root.querySelectorAll('ul.problemas a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/practicante/problemas-asignados/detalle/51?teamId=12');
    expect(hrefs.length).toBe(4);
  });

  it('builds the competition, difficulty and competition-status filters from the returned assignments', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const options = (name: string) =>
      Array.from(root.querySelectorAll<HTMLOptionElement>(`select[formcontrolname="${name}"] option`)).map((o) => o.textContent?.trim());
    expect(options('competencia')).toEqual(['Todas', 'Simulacro semanal', 'Maratón interna']);
    expect(options('dificultad')).toEqual(['Todas', '1000', '800']);
    expect(options('estado')).toEqual(['Todos', 'Programada', 'En curso', 'Finalizada']);
    expect(options('miEstado')).toEqual(['Todos', 'Sin intentos', 'En progreso', 'Por verificar', 'Resuelto']);
  });

  it('maps every filter and the sort to the query parameters of GET /problems/assigned', async () => {
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

    choose('miEstado', 'PENDIENTE');
    request = list();
    expect(request.request.params.get('status')).toBe('PENDIENTE');
    request.flush(LIST);
    await settle();

    choose('dificultad', '800');
    request = list();
    expect(request.request.params.get('difficulty')).toBe('800');
    request.flush(LIST);
    await settle();

    choose('orden', 'title');
    request = list();
    expect(request.request.params.get('sort')).toBe('title');
    expect(request.request.params.get('order')).toBe('asc');
    request.flush(LIST);
    await settle();

    choose('sentido', 'desc');
    request = list();
    expect(request.request.params.get('order')).toBe('desc');
    request.flush(LIST);
    await settle();

    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'theatre';
    search.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    request = list();
    const params = request.request.params;
    expect(Object.fromEntries(params.keys().map((key) => [key, params.get(key)]))).toEqual({
      teamId: '12',
      competitionId: '31',
      competitionStatus: 'EN_CURSO',
      status: 'PENDIENTE',
      difficulty: '800',
      sort: 'title',
      order: 'desc',
      q: 'theatre',
    });
    request.flush(LIST);
  });

  it('clears the filters with Limpiar and asks again without them', async () => {
    const { root, loadTeams, loadList, list, choose, settle } = await setup();
    await loadTeams();
    await loadList();
    choose('miEstado', 'RESUELTO');
    list().flush(LIST);
    await settle();
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Limpiar'))!.click();
    const request = list();
    expect(request.request.params.keys()).toEqual(['teamId']);
    request.flush(LIST);
  });

  it('loads the assignments of another team and starts again without the previous filters', async () => {
    const { root, loadTeams, loadList, list, choose, settle } = await setup();
    await loadTeams();
    await loadList();
    choose('miEstado', 'RESUELTO');
    list().flush(LIST);
    await settle();
    root.querySelectorAll<HTMLInputElement>('mat-radio-group[aria-label="Equipo"] input[type="radio"]')[1].click();
    const request = list();
    expect(request.request.params.get('teamId')).toBe('13');
    expect(request.request.params.has('status')).toBe(false);
    request.flush({ teamId: 13, total: 0, items: [] });
    await settle();
    expect(root.textContent).toContain('no tiene problemas asignados');
  });

  it('summarizes the progress in the team from the assignments', async () => {
    const { root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const aside = root.querySelector('aside')!;
    expect(aside.textContent).toContain('1/4');
    expect(aside.textContent).toContain('Tu avance en el equipo');
    expect(aside.textContent).toContain('Por verificar');
    expect(aside.textContent).toContain('Simulacro semanal');
  });

  it('shows an error if the search is longer than 100 characters and does not ask the backend', async () => {
    const { fixture, root, loadTeams, loadList } = await setup();
    await loadTeams();
    await loadList();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'a'.repeat(101);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Usa como máximo 100 caracteres');
    http.expectNone((r) => r.url === '/api/problems/assigned');
  });

  it('explains 403 and 404 errors with the backend message and lets the practitioner retry', async () => {
    const { root, loadTeams, list, settle } = await setup();
    await loadTeams();
    list().flush({ message: 'No tiene acceso a los problemas de este equipo' }, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No tiene acceso a los problemas de este equipo');
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    list().flush({ message: 'El equipo no existe' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El equipo no existe');
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    list().flush({}, { status: 401, statusText: 'Unauthorized' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('sesión');
  });

  it('tells a practitioner without active teams where to join one', async () => {
    const { root, loadTeams } = await setup([membership(14, 'Pendiente', 'PENDIENTE')]);
    await loadTeams();
    expect(root.textContent).toContain('no perteneces a ningún equipo');
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/grupos');
  });
});
