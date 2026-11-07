import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../../../core/api';
import type { CatalogProblem } from '../../../../../core/problems-api';
import { AssignmentStore } from '../../assignment-store';
import { ConfirmarAsignacion } from './confirmar-asignacion';

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

describe('ConfirmarAsignacion', () => {
  let http: HttpTestingController;

  async function setup(configure = true) {
    await TestBed.configureTestingModule({
      imports: [ConfirmarAsignacion],
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
    if (configure) {
      store.toggle(problem(7, 'Weird Algorithm'));
      store.toggle(problem(9, 'Missing Number'));
      store.setSettings({
        7: { letter: 'c', score: 100, color: '#22c55e' },
        9: { letter: '', score: 50, color: '#FF0000' },
      });
      store.teams.set([
        { groupId: 12, name: 'Equipo Alfa', status: 'ACTIVO' } as never,
      ]);
      store.teamId.set(12);
      store.competitions.set([
        {
          competitionId: 30,
          teamId: 12,
          eventName: 'Simulacro semanal',
          status: 'PROGRAMADA',
          startsAt: '2026-11-01T19:00:00Z',
          endsAt: '2026-11-02T04:59:00Z',
          problemsCount: 0,
        },
      ]);
      store.competitionId.set(30);
    }
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ConfirmarAsignacion);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const asignar = () =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Asignar problemas'))!;
    return { fixture, root, store, navigate, asignar };
  }

  afterEach(() => http.verify());

  it('shows the team, the competition and the chosen problems and says the whole team receives them', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Revisar asignación');
    expect(root.textContent).toContain('Equipo Alfa');
    expect(root.textContent).toContain('Simulacro semanal');
    expect(root.textContent).toContain('Todo el equipo');
    expect(root.textContent).not.toContain('Destinatarios');
    expect(root.textContent).toContain('Weird Algorithm');
    expect(root.textContent).toContain('Primera libre');
    expect(root.textContent).toContain('150');
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema/configurar');
    expect(hrefs).toContain('/coach/problemas-asignados');
  });

  it('posts the body held by the store and then opens the assigned problems with a success message', async () => {
    const { fixture, asignar, navigate } = await setup();
    asignar().click();
    fixture.detectChanges();
    const request = http.expectOne('/api/problems/assign');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      competitionId: 30,
      problems: [
        { problemId: 7, letter: 'C', score: 100, balloonColor: '#22C55E' },
        { problemId: 9, letter: null, score: 50, balloonColor: '#FF0000' },
      ],
    });
    request.flush(
      {
        competitionId: 30,
        teamId: 12,
        assigned: [
          { competitionProblemId: 1, problemId: 7, title: 'Weird Algorithm', letter: 'C', score: 100, balloonColor: '#22C55E', assignedAt: '2026-11-01T10:00:00Z' },
          { competitionProblemId: 2, problemId: 9, title: 'Missing Number', letter: 'A', score: 50, balloonColor: '#FF0000', assignedAt: '2026-11-01T10:00:00Z' },
        ],
      },
      { status: 201, statusText: 'Created' },
    );
    expect(navigate).toHaveBeenCalledWith(['/coach/problemas-asignados'], {
      queryParams: { asignados: 2, competencia: 'Simulacro semanal' },
    });
  });

  it('sends the request only once even if the button is pressed twice', async () => {
    const { fixture, asignar } = await setup();
    asignar().click();
    fixture.detectChanges();
    expect(asignar().disabled).toBe(true);
    asignar().click();
    http.expectOne('/api/problems/assign').flush({ competitionId: 30, teamId: 12, assigned: [] }, { status: 201, statusText: 'Created' });
  });

  it('goes back to the configuration with the field errors when the backend rejects a letter', async () => {
    const { fixture, asignar, navigate, store } = await setup();
    asignar().click();
    http.expectOne('/api/problems/assign').flush(
      {
        message: 'No se registró ninguna asignación; las existentes se mantienen',
        errors: { 'problems[0].letter': 'La letra ya está en uso en la competencia' },
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/coach/asignar-problema/configurar']);
    expect(store.rowErrors(0)).toEqual(['La letra ya está en uso en la competencia']);
    expect(store.selected().length).toBe(2);
  });

  it('keeps the page and shows the message when the whole request is refused', async () => {
    const { fixture, root, asignar, navigate } = await setup();
    asignar().click();
    http
      .expectOne('/api/problems/assign')
      .flush({ message: 'La competencia ya finalizó y no admite nuevos problemas', errors: {} }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('La competencia ya finalizó');
    expect(asignar().disabled).toBe(false);
  });

  it('asks to complete the previous steps when there is nothing to assign', async () => {
    const { root, asignar } = await setup(false);
    expect(root.textContent).toContain('Completa los pasos anteriores');
    expect(asignar().disabled).toBe(true);
  });
});
