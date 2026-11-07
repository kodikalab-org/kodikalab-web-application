import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../../../core/api';
import type { CatalogProblem } from '../../../../../core/problems-api';
import { AssignmentStore } from '../../assignment-store';
import { ConfigurarAsignacion } from './configurar-asignacion';

function problem(id: number, title: string): CatalogProblem {
  return {
    id,
    title,
    url: null,
    sourcePlatform: 'CSES',
    sourceCode: `CSES-${id}`,
    difficultyRating: null,
    timeLimitMs: 1000,
    memoryLimitMb: 512,
    topics: [],
  };
}

const group = (groupId: number, name: string, status = 'ACTIVO') => ({
  groupId,
  name,
  status,
  visibility: 'PUBLICO',
  activeMembers: 3,
  pendingRequests: 0,
  invitationCode: 'X',
});

const competition = (id: number, name: string, status: string) => ({
  id,
  eventName: name,
  status,
  startsAt: '2026-11-01T19:00:00Z',
  endsAt: '2026-11-02T04:59:00Z',
  problemsCount: 0,
});

describe('ConfigurarAsignacion', () => {
  let http: HttpTestingController;

  async function setup(selected: CatalogProblem[] = [problem(7, 'Weird Algorithm'), problem(9, 'Missing Number')]) {
    await TestBed.configureTestingModule({
      imports: [ConfigurarAsignacion],
      providers: [
        AssignmentStore,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(AssignmentStore);
    selected.forEach((p) => store.toggle(p));
    const fixture = TestBed.createComponent(ConfigurarAsignacion);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    /** Answers /teams/me and, for the only team, its competitions. */
    const loadSingleTeam = async (items: ReturnType<typeof competition>[]) => {
      http.expectOne('/api/teams/me').flush([group(12, 'Equipo Alfa')]);
      await settle();
      http.expectOne((r) => r.url === '/api/competitions').flush({ teamId: 12, total: items.length, items });
      await settle();
    };
    const continuar = () =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Continuar'))!;
    return { fixture, root, store, settle, loadSingleTeam, continuar };
  }

  afterEach(() => http.verify());

  it('no longer asks who receives the problems: the assignment is for the whole team', async () => {
    const { root, loadSingleTeam } = await setup();
    await loadSingleTeam([competition(30, 'Simulacro semanal', 'PROGRAMADA')]);
    expect(root.querySelector('app-elegir-destinatarios')).toBeNull();
    expect(root.querySelector('input[type="radio"][name*="destinatarios"]')).toBeNull();
    expect(root.textContent).not.toContain('Destinatarios');
    expect(root.textContent).not.toContain('Integrantes elegidos');
    expect(root.textContent).toContain('Todo el equipo');
  });

  it('lists only the PROGRAMADA and EN_CURSO competitions of the coach team', async () => {
    const { root, loadSingleTeam } = await setup();
    await loadSingleTeam([
      competition(30, 'Simulacro semanal', 'PROGRAMADA'),
      competition(31, 'Maratón interna', 'EN_CURSO'),
      competition(32, 'Contest de práctica', 'FINALIZADA'),
    ]);
    const radios = root.querySelectorAll('mat-radio-group[aria-label="Competencia de destino"] input[type="radio"]');
    expect(radios.length).toBe(2);
    expect(root.textContent).toContain('Simulacro semanal');
    expect(root.textContent).toContain('Maratón interna');
    expect(root.textContent).not.toContain('Contest de práctica');
  });

  it('offers to create a contest when the team has no competition open to new problems', async () => {
    const { root, loadSingleTeam } = await setup();
    await loadSingleTeam([competition(32, 'Contest de práctica', 'FINALIZADA')]);
    expect(root.textContent).toContain('no tiene concursos');
    const link = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Crear concurso'))!;
    expect(link.getAttribute('href')).toBe('/coach/concursos/nuevo');
  });

  it('asks for the competitions of the team the coach picks when there are several', async () => {
    const { fixture, root, settle } = await setup();
    http.expectOne('/api/teams/me').flush([group(12, 'Equipo Alfa'), group(13, 'Equipo Beta'), group(14, 'Borrador', 'BORRADOR')]);
    await settle();
    http.expectNone((r) => r.url === '/api/competitions');
    const select = root.querySelector<HTMLSelectElement>('select[formcontrolname="equipo"]')!;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Elige un equipo',
      'Equipo Alfa',
      'Equipo Beta',
    ]);
    select.value = '13';
    select.dispatchEvent(new Event('change'));
    const request = http.expectOne((r) => r.url === '/api/competitions');
    expect(request.request.params.get('teamId')).toBe('13');
    request.flush({ teamId: 13, total: 1, items: [competition(40, 'Contest Beta', 'EN_CURSO')] });
    await settle();
    expect(fixture.nativeElement.textContent).toContain('Contest Beta');
  });

  it('shows one configuration row per selected problem with the backend defaults', async () => {
    const { root, loadSingleTeam } = await setup();
    await loadSingleTeam([competition(30, 'Simulacro semanal', 'PROGRAMADA')]);
    expect(root.querySelectorAll('input[formcontrolname="letra"]').length).toBe(2);
    expect(root.textContent).toContain('Weird Algorithm');
    expect(root.textContent).toContain('CSES-9');
    const letra = root.querySelector<HTMLInputElement>('input[formcontrolname="letra"]')!;
    const puntaje = root.querySelector<HTMLInputElement>('input[formcontrolname="puntaje"]')!;
    const color = root.querySelector<HTMLInputElement>('input[formcontrolname="color"]')!;
    expect([letra.value, puntaje.value, color.value]).toEqual(['', '1', '#FF0000']);
  });

  it('blocks Continuar until a competition is chosen, then saves the settings in the store and goes to confirm', async () => {
    const { fixture, root, store, settle, loadSingleTeam, continuar } = await setup();
    await loadSingleTeam([competition(30, 'Simulacro semanal', 'PROGRAMADA')]);
    expect(continuar().disabled).toBe(true);

    root.querySelector<HTMLInputElement>('mat-radio-group[aria-label="Competencia de destino"] input[type="radio"]')!.click();
    const letra = root.querySelector<HTMLInputElement>('input[formcontrolname="letra"]')!;
    letra.value = 'c';
    letra.dispatchEvent(new Event('input'));
    const puntaje = root.querySelector<HTMLInputElement>('input[formcontrolname="puntaje"]')!;
    puntaje.value = '100';
    puntaje.dispatchEvent(new Event('input'));
    await settle();
    expect(continuar().disabled).toBe(false);
    expect(root.querySelector('aside')?.textContent).toContain('Simulacro semanal');

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    continuar().click();
    expect(navigate).toHaveBeenCalledWith(['/coach/asignar-problema/confirmar']);
    expect(store.request()).toEqual({
      competitionId: 30,
      problems: [
        { problemId: 7, letter: 'C', score: 100, balloonColor: '#FF0000' },
        { problemId: 9, letter: null, score: 1, balloonColor: '#FF0000' },
      ],
    });
    expect(fixture.nativeElement.textContent).toContain('101');
  });

  it('disables Continuar and shows the error when the balloon color is invalid', async () => {
    const { root, settle, loadSingleTeam, continuar } = await setup();
    await loadSingleTeam([competition(30, 'Simulacro semanal', 'PROGRAMADA')]);
    root.querySelector<HTMLInputElement>('mat-radio-group[aria-label="Competencia de destino"] input[type="radio"]')!.click();
    const color = root.querySelector<HTMLInputElement>('input[formcontrolname="color"]')!;
    color.value = 'rojo';
    color.dispatchEvent(new Event('input'));
    color.dispatchEvent(new Event('blur'));
    await settle();
    expect(root.textContent).toContain('Usa un color hexadecimal, por ejemplo #FF0000');
    expect(continuar().disabled).toBe(true);
  });

  it('shows the backend errors next to the problem they belong to', async () => {
    const { store, root, settle } = await setup();
    store.competitionId.set(30);
    store.submit().subscribe({ error: () => undefined });
    http.expectOne('/api/problems/assign').flush(
      {
        message: 'No se registró ninguna asignación; las existentes se mantienen',
        errors: { 'problems[1].letter': 'La letra ya está en uso en la competencia' },
      },
      { status: 409, statusText: 'Conflict' },
    );
    http.expectOne('/api/teams/me').flush([group(12, 'Equipo Alfa')]);
    await settle();
    http.expectOne((r) => r.url === '/api/competitions').flush({ teamId: 12, total: 0, items: [] });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se registró ninguna asignación');
    const rows = root.querySelectorAll('[formarrayname="problemas"] > div');
    expect(rows[0].textContent).not.toContain('La letra ya está en uso');
    expect(rows[1].textContent).toContain('La letra ya está en uso en la competencia');
  });

  it('asks to pick problems first when the selection is empty', async () => {
    const { root, loadSingleTeam, continuar } = await setup([]);
    await loadSingleTeam([]);
    expect(root.textContent).toContain('Primero elige problemas');
    expect(continuar().disabled).toBe(true);
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema');
  });

  it('reports a failed teams request and lets the coach retry', async () => {
    const { root, settle } = await setup();
    http.expectOne('/api/teams/me').flush({}, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar');
  });
});
