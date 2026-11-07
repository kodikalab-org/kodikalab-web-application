import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProgresoTema } from './progreso-tema';

const BASE = 'http://localhost:8080/api';
const progressUrl = (teamId: number) => `${BASE}/analytics/teams/${teamId}/progress/me/topics`;

const team = (groupId: number, name: string, status = 'ACTIVO') => ({
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

const topic = (overrides: Record<string, unknown> = {}) => ({
  topicId: 1,
  topicName: 'Grafos',
  assignedProblems: 2,
  solvedProblems: 1,
  unsolvedProblems: 1,
  pendingProblems: 0,
  coveragePercentage: 50,
  status: 'EN_PROGRESO',
  needsReinforcement: false,
  ...overrides,
});

const progress = (teamId: number, topics: unknown[], overrides: Record<string, unknown> = {}) => ({
  teamId,
  membershipId: 7,
  userId: 10,
  assignedProblems: 3,
  solvedProblems: 1,
  unclassifiedProblems: 0,
  reinforcementCriterion: 'Criterio de refuerzo del backend',
  topics,
  ...overrides,
});

describe('ProgresoTema', () => {
  let http: HttpTestingController;

  function setup(equipo?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(equipo ? { equipo } : {}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProgresoTema);
    fixture.detectChanges();
    return fixture;
  }
  const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';
  const flushTeams = (teams: unknown[]) => http.expectOne(`${BASE}/teams/me`).flush(teams);

  afterEach(() => http.verify());

  it('shows the loading state before the teams arrive', () => {
    const fixture = setup();
    expect(text(fixture)).toContain('Cargando tus equipos');
    http.expectOne(`${BASE}/teams/me`);
  });

  it('uses the only active team directly, without a selector, and shows real indicators', async () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa'), team(2, 'Equipo Pendiente', 'PENDIENTE')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    expect(text(fixture)).toContain('Calculando tu progreso');
    http.expectOne(progressUrl(1)).flush(
      progress(1, [
        topic({ topicId: 3, topicName: 'Programación dinámica', assignedProblems: 1, solvedProblems: 0,
          unsolvedProblems: 1, coveragePercentage: 0, status: 'SIN_ACTIVIDAD', needsReinforcement: true }),
        topic(),
      ], { unclassifiedProblems: 2 }),
    );
    fixture.detectChanges();
    const content = text(fixture);
    expect(content).toContain('Equipo Alfa');
    expect(content).toContain('33.33%');
    expect(content).toContain('50.00%');
    expect(content).toContain('0.00%');
    expect(content).toContain('Sin actividad');
    expect(content).toContain('En progreso');
    expect(content).toContain('aún sin intentos');
    expect(content).toContain('Por reforzar');
    expect(content).toContain('2 problemas asignados no tienen tema');
    expect(content).toContain('Criterio de refuerzo del backend');
    expect(content).not.toContain('Aún no tienes actividad en ningún tema');
  });

  it('shows the selector with several active teams and reloads only the chosen team', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa'), team(2, 'Equipo Beta')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
    const first = http.expectOne(progressUrl(1));
    // Switching teams cancels the pending request: data is never mixed.
    const component = fixture.componentInstance as unknown as {
      teamControl: { setValue(value: number): void };
    };
    component.teamControl.setValue(2);
    expect(first.cancelled).toBe(true);
    http.expectOne(progressUrl(2)).flush(
      progress(2, [topic({ topicName: 'Tema del equipo Beta' })]),
    );
    fixture.detectChanges();
    expect(text(fixture)).toContain('Tema del equipo Beta');
  });

  it('preselects the team given in ?equipo', () => {
    const fixture = setup('2');
    flushTeams([team(1, 'Equipo Alfa'), team(2, 'Equipo Beta')]);
    http.expectOne(progressUrl(2)).flush(progress(2, [topic()]));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Grafos');
  });

  it('ignores an ?equipo that is not an active team', () => {
    const fixture = setup('99');
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush(progress(1, [topic()]));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Grafos');
  });

  it('shows the empty state when the practitioner has no active team', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa', 'PENDIENTE')]);
    fixture.detectChanges();
    expect(text(fixture)).toContain('Aún no perteneces a ningún equipo activo');
    expect(fixture.nativeElement.querySelector('a[href="/grupos"]')).not.toBeNull();
  });

  it('shows a message when the team has no assigned problems', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush(
      progress(1, [], { assignedProblems: 0, solvedProblems: 0 }),
    );
    fixture.detectChanges();
    expect(text(fixture)).toContain('Tu equipo aún no tiene problemas asignados');
  });

  it('invites to start when every topic has no activity', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush(
      progress(1, [
        topic({ solvedProblems: 0, unsolvedProblems: 2, coveragePercentage: 0,
          status: 'SIN_ACTIVIDAD', needsReinforcement: true }),
      ], { solvedProblems: 0 }),
    );
    fixture.detectChanges();
    expect(text(fixture)).toContain('Aún no tienes actividad en ningún tema');
  });

  it('on 409 shows the affected data and no indicators, and allows retrying', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush(
      { message: 'Datos inconsistentes', errors: { 'attempts[7]': 'El intento está incompleto' } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    const content = text(fixture);
    expect(content).toContain('No pudimos calcular tu progreso');
    expect(content).toContain('attempts[7]');
    expect(content).toContain('El intento está incompleto');
    expect(content).not.toContain('Problemas asignados');
    expect(content).not.toContain('Cobertura global');
    const retry = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b) => (b as HTMLElement).textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    http.expectOne(progressUrl(1)).flush(progress(1, [topic()]));
    fixture.detectChanges();
    expect(text(fixture)).toContain('Cobertura global');
    expect(text(fixture)).not.toContain('No pudimos calcular tu progreso');
  });

  it('on 503 shows the retry button and calls the backend again', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush(
      { message: 'Inténtalo de nuevo más tarde' },
      { status: 503, statusText: 'Unavailable' },
    );
    fixture.detectChanges();
    expect(text(fixture)).toContain('No pudimos obtener tus registros');
    const retry = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b) => (b as HTMLElement).textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    http.expectOne(progressUrl(1));
  });

  it('on 403 shows the denied access with a link to the teams', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush({ message: 'Sin membresía' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(text(fixture)).toContain('No pudimos mostrar este progreso');
    expect(fixture.nativeElement.querySelector('a[href="/grupos"]')).not.toBeNull();
    expect(text(fixture)).not.toContain('Reintentar');
  });

  it('on 404 explains that the team does not exist', () => {
    const fixture = setup();
    flushTeams([team(1, 'Equipo Alfa')]);
    http.expectOne(progressUrl(1)).flush({ message: 'Equipo inexistente' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(text(fixture)).toContain('No encontramos este equipo');
  });

  it('shows an error with retry when the teams cannot be loaded', () => {
    const fixture = setup();
    http.expectOne(`${BASE}/teams/me`).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(text(fixture)).toContain('No pudimos cargar tus equipos');
    const retry = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b) => (b as HTMLElement).textContent?.includes('Reintentar'),
    ) as HTMLButtonElement;
    retry.click();
    http.expectOne(`${BASE}/teams/me`);
  });
});
