import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../../../core/api';
import { ProblemaElegido } from './problema-elegido';

function detalle(status: string | null, competitionStatus = 'EN_CURSO', attempts: unknown[] = ATTEMPTS, platform: 'CSES' | 'CODEFORCES' = 'CSES') {
  const cf = platform === 'CODEFORCES';
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
        url: cf ? 'https://codeforces.com/contest/1850/problem/A' : 'https://cses.fi/problemset/task/1068',
        sourcePlatform: platform,
        sourceCode: cf ? '1850A' : 'CSES-1068',
        difficultyRating: null,
        timeLimitMs: 1000,
        memoryLimitMb: 512,
        topics: ['Matemática', 'Implementación'],
      },
      status,
      attemptCount: attempts.length,
      lastAttempt: (attempts[0] as unknown) ?? null,
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

describe('ProblemaElegido · verificación de Codeforces', () => {
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
    const detailRequest = () => http.expectOne((r) => r.url === '/api/problems/assigned/51');
    const verifRequest = () => http.expectOne((r) => r.url === '/api/problems/assigned/51/verification');
    const boton = (texto: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement | undefined;
    detailRequest().flush(detalle('SIN_INTENTOS', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    return { harness, root, settle, detailRequest, verifRequest, boton };
  }

  const ENVIO = {
    externalId: 301234571,
    verdict: 'ACCEPTED',
    language: 'GNU C++17 (64)',
    timeMs: 31,
    memoryKb: 3400,
    passedTests: 12,
    submittedAt: '2026-10-29T14:12:00Z',
    url: 'https://codeforces.com/contest/1850/submission/301234571',
    imported: true,
    beforeCompetition: false,
  };
  const RESULTADO = { competitionProblemId: 51, found: true, status: 'RESUELTO', fileStored: false, submissions: [ENVIO] };

  function elegirArchivo(root: HTMLElement, archivo: File) {
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('shows "Tu solución" with the Codeforces submit link and no manual registration', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Tu solución');
    const resolver = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Resolver en Codeforces'))!;
    expect(resolver.getAttribute('href')).toBe('https://codeforces.com/contest/1850/submit/A');
    expect(resolver.getAttribute('target')).toBe('_blank');
    expect(root.textContent).not.toContain('Registrar solución');
    expect(root.querySelector('app-registro-problemas-resueltos')).toBeNull();
  });

  it('verifies without a file and shows the found submission, then reloads the detail', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    boton('Verificar mi solución')!.click();
    const pedido = verifRequest();
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toBeNull();
    expect(pedido.request.params.keys()).toEqual([]);
    await settle();
    expect(boton('Verificando')!.disabled).toBe(true);
    pedido.flush(RESULTADO);
    detailRequest().flush(detalle('RESUELTO', 'EN_CURSO', [{ resolutionId: 9, verdict: 'ACCEPTED', language: 'GNU C++17 (64)', submittedAt: ENVIO.submittedAt, evidenceUrl: ENVIO.url, executionTimeMs: 31, memoryUsedKb: 3400, passedTests: 12, origin: 'PLATAFORMA', fileName: 'sol.cpp' }], 'CODEFORCES'));
    await settle();
    const tarjeta = root.querySelector('ul[aria-label="Envíos encontrados"]')!.textContent!;
    expect(tarjeta).toContain('Aceptado');
    expect(tarjeta).toContain('GNU C++17 (64)');
    expect(tarjeta).toContain('31 ms');
    expect(tarjeta).toContain('3.3 MB');
    expect(tarjeta).toContain('12');
    expect(root.querySelector('ul[aria-label="Envíos encontrados"] a')?.getAttribute('href')).toBe(ENVIO.url);
    // the attempts history shows the new fields
    const fila = root.querySelector('tbody tr')!.textContent!;
    expect(fila).toContain('Plataforma');
    expect(fila).toContain('31 ms');
    expect(fila).toContain('sol.cpp');
    expect(root.textContent).toContain('Resuelto');
  });

  it('sends a valid file as multipart and reports that it was stored', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    elegirArchivo(root, new File(['int main(){}'], 'sol.cpp'));
    await settle();
    boton('Verificar mi solución')!.click();
    const pedido = verifRequest();
    expect(pedido.request.body).toBeInstanceOf(FormData);
    expect(((pedido.request.body as FormData).get('file') as File).name).toBe('sol.cpp');
    pedido.flush({ ...RESULTADO, fileStored: true });
    detailRequest().flush(detalle('RESUELTO', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.textContent).toContain('Guardamos tu archivo');
  });

  it('rejects an invalid file on the client without calling the backend', async () => {
    const { root, settle } = await setup();
    elegirArchivo(root, new File(['x'], 'nota.txt'));
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('código fuente');
    elegirArchivo(root, new File([new Uint8Array(64 * 1024 + 1)], 'grande.cpp'));
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('64 kB');
    http.expectNone((r) => r.url.endsWith('/verification'));
  });

  it('offers to search the last 100 submissions when nothing is found', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    boton('Verificar mi solución')!.click();
    verifRequest().flush({ competitionProblemId: 51, found: false, status: 'SIN_INTENTOS', fileStored: false, submissions: [] });
    detailRequest().flush(detalle('SIN_INTENTOS', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.textContent).toContain('No encontramos un envío de este problema entre tus últimos 10 envíos');
    boton('Buscar en los últimos 100')!.click();
    const ampliada = http.expectOne((r) => r.url === '/api/problems/assigned/51/verification');
    expect(ampliada.request.params.get('count')).toBe('100');
    ampliada.flush(RESULTADO);
    detailRequest().flush(detalle('RESUELTO', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.textContent).not.toContain('No encontramos un envío');
    expect(root.querySelector('ul[aria-label="Envíos encontrados"]')).not.toBeNull();
  });

  it('shows the submissions sent before the competition apart and says they do not count', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    boton('Verificar mi solución')!.click();
    verifRequest().flush({
      ...RESULTADO,
      status: 'SIN_INTENTOS',
      submissions: [{ ...ENVIO, externalId: 5, imported: false, beforeCompetition: true }],
    });
    detailRequest().flush(detalle('SIN_INTENTOS', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.querySelector('ul[aria-label="Envíos anteriores a la competencia"]')?.textContent).toContain(
      'Enviado antes del inicio de la competencia · no cuenta',
    );
    expect(root.querySelector('ul[aria-label="Envíos encontrados"]')).toBeNull();
  });

  it('verifies again every 5 s while a submission is EN_EVALUACION, at most 12 times', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    vi.useFakeTimers();
    boton('Verificar mi solución')!.click();
    const enEvaluacion = {
      ...RESULTADO,
      status: 'PENDIENTE',
      submissions: [{ ...ENVIO, verdict: 'EN_EVALUACION', timeMs: null, memoryKb: null, passedTests: null }],
    };
    verifRequest().flush(enEvaluacion);
    detailRequest().flush(detalle('PENDIENTE', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.textContent).toContain('Codeforces todavía está evaluando…');
    // First automatic retry: no new request before 5 s, then it is judged.
    vi.advanceTimersByTime(4999);
    http.expectNone((r) => r.url.endsWith('/verification'));
    vi.advanceTimersByTime(1);
    verifRequest().flush(RESULTADO);
    detailRequest().flush(detalle('RESUELTO', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    expect(root.textContent).not.toContain('Codeforces todavía está evaluando');
    vi.advanceTimersByTime(60000);
    http.expectNone((r) => r.url.endsWith('/verification'));
  });

  it('stops retrying after 12 automatic attempts', async () => {
    const { root, settle, boton, verifRequest, detailRequest } = await setup();
    vi.useFakeTimers();
    const enEvaluacion = { ...RESULTADO, status: 'PENDIENTE', submissions: [{ ...ENVIO, verdict: 'EN_EVALUACION' }] };
    boton('Verificar mi solución')!.click();
    for (let i = 0; i < 13; i++) {
      verifRequest().flush(enEvaluacion);
      detailRequest().flush(detalle('PENDIENTE', 'EN_CURSO', [], 'CODEFORCES'));
      if (i < 12) vi.advanceTimersByTime(5000);
    }
    await settle();
    vi.advanceTimersByTime(60000);
    http.expectNone((r) => r.url.endsWith('/verification'));
    expect(root.textContent).toContain('vuelve a verificar en unos minutos');
  });

  it('cancels the automatic retry when the screen is destroyed', async () => {
    const { harness, settle, boton, verifRequest, detailRequest } = await setup();
    vi.useFakeTimers();
    boton('Verificar mi solución')!.click();
    verifRequest().flush({ ...RESULTADO, submissions: [{ ...ENVIO, verdict: 'EN_EVALUACION' }] });
    detailRequest().flush(detalle('PENDIENTE', 'EN_CURSO', [], 'CODEFORCES'));
    await settle();
    harness.fixture.destroy();
    vi.advanceTimersByTime(30000);
    http.expectNone((r) => r.url.endsWith('/verification'));
  });

  it('links to the profile when the account has no Codeforces handle (409)', async () => {
    const { root, settle, boton, verifRequest } = await setup();
    boton('Verificar mi solución')!.click();
    verifRequest().flush(
      { message: 'Vincula tu usuario de Codeforces en tu perfil para verificar' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();
    const alerta = root.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('Vincula tu usuario de Codeforces');
    const enlace = alerta.querySelector('a')!;
    expect(enlace.getAttribute('href')).toBe('/perfil/editar#plataformas');
  });

  it('shows the backend message when the competition has not started (409)', async () => {
    const { root, settle, boton, verifRequest } = await setup();
    boton('Verificar mi solución')!.click();
    verifRequest().flush({ message: 'La competencia aún no comenzó' }, { status: 409, statusText: 'Conflict' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('La competencia aún no comenzó');
    expect(root.querySelector('[role="alert"] a')).toBeNull();
  });

  it('asks to retry in a few minutes when Codeforces does not answer (503)', async () => {
    const { root, settle, boton, verifRequest } = await setup();
    boton('Verificar mi solución')!.click();
    verifRequest().flush({ message: 'x' }, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Codeforces no responde ahora. Inténtalo en unos minutos.');
    boton('Reintentar')!.click();
    verifRequest().flush(RESULTADO);
    http.expectOne((r) => r.url === '/api/problems/assigned/51').flush(detalle('RESUELTO', 'EN_CURSO', [], 'CODEFORCES'));
  });

  it('loads the latest submissions on demand and highlights the ones of this problem', async () => {
    const { root, settle, boton } = await setup();
    expect(root.textContent).toContain('Tus últimos 10 envíos en Codeforces');
    http.expectNone((r) => r.url.endsWith('/platform-submissions'));
    boton('Ver mis últimos envíos')!.click();
    const pedido = http.expectOne((r) => r.url === '/api/problems/assigned/51/platform-submissions');
    expect(pedido.request.params.get('count')).toBe('10');
    pedido.flush({
      competitionProblemId: 51,
      handle: 'ana',
      count: 10,
      submissions: [
        { externalId: 2, contestId: 1850, problemIndex: 'A', verdict: 'WRONG_ANSWER', platformVerdict: 'WRONG_ANSWER', language: 'Java 21', timeMs: 15, memoryKb: 0, passedTests: 2, submittedAt: '2026-10-29T14:00:00Z', url: 'https://codeforces.com/contest/1850/submission/2', matchesProblem: true },
        { externalId: 1, contestId: 4, problemIndex: 'A', verdict: 'ACCEPTED', platformVerdict: 'OK', language: 'Python 3', timeMs: 46, memoryKb: 2000, passedTests: 5, submittedAt: '2026-10-28T14:00:00Z', url: null, matchesProblem: false },
      ],
    });
    await settle();
    const filas = root.querySelectorAll('table[aria-label], table');
    const tabla = Array.from(filas).find((t) => t.querySelector('caption'))!;
    const trs = tabla.querySelectorAll('tbody tr');
    expect(trs.length).toBe(2);
    expect(trs[0].getAttribute('data-coincide')).toBe('true');
    expect(trs[1].getAttribute('data-coincide')).toBeNull();
    expect(trs[0].textContent).toContain('1850A');
    expect(trs[0].textContent).toContain('Respuesta incorrecta');
    boton('Actualizar')!.click();
    http.expectOne((r) => r.url === '/api/problems/assigned/51/platform-submissions').flush({ competitionProblemId: 51, handle: 'ana', count: 10, submissions: [] });
    await settle();
    expect(root.textContent).toContain('no tiene envíos recientes');
  });
});

describe('ProblemaElegido · otras plataformas', () => {
  let http: HttpTestingController;
  afterEach(() => http.verify());

  it('keeps the manual form and notes that automatic verification is not available yet', async () => {
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
    await harness.navigateByUrl('/detalle/51?teamId=12', ProblemaElegido);
    http.expectOne((r) => r.url === '/api/problems/assigned/51').flush(detalle('EN_PROGRESO'));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('La verificación automática aún no está disponible para CSES');
    expect(root.textContent).toContain('Registrar solución');
    expect(root.textContent).not.toContain('Verificar mi solución');
    expect(root.textContent).not.toContain('Tus últimos 10 envíos en Codeforces');
  });
});
