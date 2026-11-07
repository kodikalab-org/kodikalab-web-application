import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../../../core/api';
import { ProblemaElegido } from './problema-elegido';

function detalle(status: string | null, competitionStatus = 'EN_CURSO', attempts = ATTEMPTS) {
  return {
    assignment: {
      competitionProblemId: 51,
      letter: 'B',
      score: 100,
      balloonColor: '#22C55E',
      assignedAt: '2026-10-20T10:00:00Z',
      competition: {
        id: 30,
        name: 'Maratón interna UPC',
        status: competitionStatus,
        startsAt: '2026-10-28T05:00:00Z',
        endsAt: '2026-11-03T04:59:00Z',
        durationMinutes: 1440,
        penaltyRule: 'ICPC_20_MIN',
        scoreboardFreezeMinutes: 0,
        accessType: 'PRIVADO',
      },
      problem: {
        id: 9,
        title: 'Weird Algorithm',
        url: 'https://cses.fi/problemset/task/1068',
        sourcePlatform: 'CSES',
        sourceCode: 'CSES-1068',
        difficultyRating: null,
        timeLimitMs: 1000,
        memoryLimitMb: 512,
        topics: ['Matemática', 'Implementación'],
      },
      status,
      attemptCount: attempts.length,
      lastAttempt: attempts[0] ?? null,
    },
    attempts,
  };
}

const ATTEMPTS = [
  { resolutionId: 2, verdict: 'WRONG_ANSWER', language: 'C++17', submittedAt: '2026-10-29T20:14:00Z', evidenceUrl: null },
  { resolutionId: 1, verdict: 'TLE', language: 'Python 3.11', submittedAt: '2026-10-28T19:40:00Z', evidenceUrl: 'https://cses.fi/result/1' },
];

describe('ProblemaElegido', () => {
  let http: HttpTestingController;

  async function setup(url = '/detalle/51?teamId=12') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'detalle/:competitionProblemId', component: ProblemaElegido }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ProblemaElegido);
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const request = () => http.expectOne((r) => r.url === '/api/problems/assigned/51');
    const load = async (body = detalle('EN_PROGRESO')) => {
      request().flush(body);
      await settle();
    };
    const registrar = () =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Registrar solución'))!;
    return { harness, root, settle, request, load, registrar };
  }

  afterEach(() => http.verify());

  it('reads the assignment id from the route and asks GET /problems/assigned/{id}', async () => {
    const { request } = await setup();
    const pedido = request();
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.keys()).toEqual([]);
    pedido.flush(detalle('EN_PROGRESO'));
  });

  it('shows the conditions, the competition, the personal state and the attempts from the backend', async () => {
    const { root, load } = await setup();
    await load();
    expect(root.querySelector('h1')?.textContent).toContain('Weird Algorithm');
    expect(root.querySelector('header')?.textContent).toContain('B');
    expect(root.textContent).toContain('Condiciones de realización');
    expect(root.textContent).toContain('CSES-1068');
    expect(root.textContent).toContain('1 s');
    expect(root.textContent).toContain('512 MB');
    expect(root.textContent).toContain('100 · #22C55E');
    expect(root.textContent).toContain('Maratón interna UPC');
    expect(root.textContent).toContain('En curso');
    expect(root.textContent).toContain('Matemática');
    expect(root.textContent).toContain('ICPC');
    expect(root.textContent).toContain('En progreso');
    const filas = Array.from(root.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(filas.length).toBe(2);
    expect(filas[0]).toContain('C++17');
    expect(filas[0]).toContain('Respuesta incorrecta');
    expect(filas[1]).toContain('Tiempo excedido');
    expect(root.querySelector('tbody a')?.getAttribute('href')).toBe('https://cses.fi/result/1');
  });

  it('links back to the list of the same team and to the problem on its platform', async () => {
    const { root, load } = await setup();
    await load();
    const volver = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Volver a problemas asignados'))!;
    expect(volver.getAttribute('href')).toBe('/practicante/problemas-asignados?teamId=12');
    const abrir = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Abrir en CSES'))!;
    expect(abrir.getAttribute('href')).toBe('https://cses.fi/problemset/task/1068');
    expect(abrir.getAttribute('target')).toBe('_blank');
  });

  it('opens the registration form with the team of the route and refreshes the detail after registering', async () => {
    const { root, settle, request, load, registrar } = await setup();
    await load();
    expect(root.querySelector('dialog app-registro-problemas-resueltos')).toBeNull();
    registrar().click();
    await settle();
    const dialogo = root.querySelector('dialog app-registro-problemas-resueltos');
    expect(dialogo).not.toBeNull();
    expect(root.querySelector('dialog textarea')).toBeNull();

    const lenguaje = root.querySelector<HTMLSelectElement>('dialog select[formcontrolname="lenguaje"]')!;
    lenguaje.value = 'C++17';
    lenguaje.dispatchEvent(new Event('change'));
    await settle();
    root.querySelector('dialog form')!.dispatchEvent(new Event('submit'));
    const registro = http.expectOne('/api/competitions/teams/12/problems/51/resolutions');
    expect(registro.request.body).toEqual({ language: 'C++17', evidenceUrl: null });
    registro.flush(
      {
        resolution: { resolutionId: 3, verdict: 'ACCEPTED' },
        registrationMethod: 'MANUAL_PROVISIONAL',
        progress: { teamId: 12, membershipId: 1, userId: 1, acceptedProblems: 1 },
      },
      { status: 201, statusText: 'Created' },
    );
    const recarga = request();
    recarga.flush(detalle('RESUELTO', 'EN_CURSO', [{ resolutionId: 3, verdict: 'ACCEPTED', language: 'C++17', submittedAt: '2026-11-04T10:00:00Z', evidenceUrl: null }, ...ATTEMPTS]));
    await settle();
    expect(root.textContent).toContain('Resuelto');
    expect(root.textContent).toContain('Registraste este problema como resuelto');
    expect(root.querySelectorAll('tbody tr').length).toBe(3);
    expect(registrar().disabled).toBe(true);
  });

  it('does not allow registering a problem that is already solved', async () => {
    const { load, registrar, root } = await setup();
    await load(detalle('RESUELTO'));
    expect(registrar().disabled).toBe(true);
    expect(root.textContent).toContain('Ya registraste este problema');
  });

  it('does not allow registering while the competition has not started', async () => {
    const { load, registrar, root } = await setup();
    await load(detalle('SIN_INTENTOS', 'PROGRAMADA', []));
    expect(registrar().disabled).toBe(true);
    expect(root.textContent).toContain('aún no ha comenzado');
  });

  it('asks to open the problem from the list when the route has no team', async () => {
    const { load, registrar, root } = await setup('/detalle/51');
    await load();
    expect(registrar().disabled).toBe(true);
    expect(root.textContent).toContain('Abre el problema desde tu lista');
  });

  it('rejects an invalid assignment id without asking the backend', async () => {
    const { root } = await setup('/detalle/abc?teamId=12');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no es válido');
    http.expectNone((r) => r.url.startsWith('/api/problems/assigned'));
  });

  it('shows the backend message of a 404 and the permission message of a 403', async () => {
    const { root, request, settle } = await setup();
    request().flush({ message: 'El problema asignado no existe' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El problema asignado no existe');
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    request().flush({}, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('permiso');
  });
});
