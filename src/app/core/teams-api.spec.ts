import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from './api';
import { TeamsApi, classifyDecisionError, classifyJoinError, httpStatus, normalizeText, readFieldErrors } from './teams-api';

const BASE = 'http://localhost:8080/api';

describe('TeamsApi', () => {
  let api: TeamsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(TeamsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista los grupos disponibles en GET /teams', () => {
    api.loadGroups().subscribe();
    const request = http.expectOne(`${BASE}/teams`);
    expect(request.request.method).toBe('GET');
    request.flush([{ groupId: 1, name: 'Grafos', status: 'ACTIVO', visibility: 'PUBLICO' }]);

    expect(api.groups().length).toBe(1);
    expect(api.loading()).toBe(false);
  });

  it('consulta los grupos propios en GET /teams/me', () => {
    api.loadMine().subscribe();
    http.expectOne(`${BASE}/teams/me`).flush([{ groupId: 1 }]);

    expect(api.mine().length).toBe(1);
  });

  it('crea el grupo con POST /teams y envía solo los campos del contrato', () => {
    const body = {
      name: 'Grafos',
      description: null,
      expectedLevel: 'INTERMEDIO',
      maxCapacity: 15,
      sessionSchedule: 'Mar, Jue de 19:00 a 21:00',
      visibility: 'PUBLICO' as const,
    };
    api.create(body).subscribe();
    const request = http.expectOne(`${BASE}/teams`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect('draft' in request.request.body).toBe(false);
    request.flush({ message: 'ok', groupId: 9, name: 'Grafos', invitationCode: 'ABC123' });

    expect(api.lastCreated()?.invitationCode).toBe('ABC123');
  });

  it('se une con POST /teams/{id}/join y recorta el código de invitación', () => {
    api.join(4, '  A1B2C3  ').subscribe();
    const request = http.expectOne((r) => r.url === `${BASE}/teams/4/join`);
    expect(request.request.method).toBe('POST');
    expect(request.request.params.get('invitationCode')).toBe('A1B2C3');
    request.flush({ message: 'ok', membershipId: 1, groupId: 4, status: 'ACTIVO' });
  });

  it('no envía invitationCode cuando el código está vacío', () => {
    api.join(4, '   ').subscribe();
    const request = http.expectOne((r) => r.url === `${BASE}/teams/4/join`);
    expect(request.request.params.has('invitationCode')).toBe(false);
    request.flush({ message: 'ok', membershipId: 1, groupId: 4, status: 'PENDIENTE' });
  });

  it('pide solo las postulaciones PENDIENTE del grupo', () => {
    api.loadRequests(4).subscribe();
    const request = http.expectOne((r) => r.url === `${BASE}/teams/4/memberships`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('PENDIENTE');
    request.flush([{ membershipId: 7, groupId: 4, status: 'PENDIENTE', requestedAt: 'x' }]);

    expect(api.requests().length).toBe(1);
    expect(api.loading()).toBe(false);
  });

  it('decide con PATCH y solo el campo decision, y retira la solicitud de la lista', () => {
    api.requests.set([
      { membershipId: 7, groupId: 4, status: 'PENDIENTE', requestedAt: 'x' },
      { membershipId: 8, groupId: 4, status: 'PENDIENTE', requestedAt: 'y' },
    ]);
    api.decide(4, 7, 'RECHAZAR').subscribe();
    const request = http.expectOne(`${BASE}/teams/4/memberships/7`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ decision: 'RECHAZAR' });
    request.flush({ message: 'ok', membershipId: 7, groupId: 4, status: 'RECHAZADO' });

    expect(api.requests().map((item) => item.membershipId)).toEqual([8]);
  });

  it('no retira la solicitud si el backend rechaza la decisión', () => {
    api.requests.set([{ membershipId: 7, groupId: 4, status: 'PENDIENTE', requestedAt: 'x' }]);
    let status = 0;
    api.decide(4, 7, 'ACEPTAR').subscribe({ error: (e: HttpErrorResponse) => (status = e.status) });
    http
      .expectOne(`${BASE}/teams/4/memberships/7`)
      .flush({ message: 'No hay cupo' }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
    expect(api.requests().length).toBe(1);
  });

  it('no expone operaciones de borrador ni de aclaración', () => {
    const superficie = api as unknown as Record<string, unknown>;
    for (const nombre of ['updateDraft', 'publish', 'respondClarification']) {
      expect(superficie[nombre]).toBeUndefined();
    }
  });
});

describe('readFieldErrors y httpStatus', () => {
  it('lee los errores por campo del cuerpo 400', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Datos inválidos',
        errors: { name: 'Obligatorio', maxCapacity: 'Entre 1 y 1000' },
      },
    });

    expect(readFieldErrors(error)).toEqual({ name: 'Obligatorio', maxCapacity: 'Entre 1 y 1000' });
    expect(httpStatus(error)).toBe(400);
  });

  it('ignora valores que no son texto y cuerpos sin errors', () => {
    expect(
      readFieldErrors(
        new HttpErrorResponse({ status: 400, error: { errors: { a: 1, b: '', c: 'ok' } } }),
      ),
    ).toEqual({ c: 'ok' });
    expect(
      readFieldErrors(new HttpErrorResponse({ status: 400, error: { message: 'x' } })),
    ).toEqual({});
    expect(readFieldErrors(new HttpErrorResponse({ status: 400, error: null }))).toEqual({});
    expect(readFieldErrors(new Error('otro'))).toEqual({});
  });

  it('devuelve 0 cuando no hubo respuesta HTTP', () => {
    expect(httpStatus(new Error('red'))).toBe(0);
    expect(httpStatus(new HttpErrorResponse({ status: 0 }))).toBe(0);
  });
});

describe('classifyJoinError', () => {
  const conflicto = (message: string) =>
    new HttpErrorResponse({ status: 409, error: { message } });

  const casos: [string, string][] = [
    ['Ya tienes una solicitud pendiente para este grupo', 'SOLICITUD_DUPLICADA'],
    ['YA TIENES UNA SOLICITUD PENDIENTE', 'SOLICITUD_DUPLICADA'],
    ['Solicitud duplicada', 'SOLICITUD_DUPLICADA'],
    ['Ya eres miembro de este grupo', 'YA_ES_MIEMBRO'],
    ['Ya eres MIEMBRO activo', 'YA_ES_MIEMBRO'],
    ['El grupo alcanzó su cupo máximo', 'SIN_CUPO'],
    ['El grupo está lleno', 'SIN_CUPO'],
    ['No hay vacantes disponibles', 'SIN_CUPO'],
    ['El grupo llegó a su capacidad', 'SIN_CUPO'],
    ['Un integrante expulsado no puede volver a solicitar ingreso', 'EXPULSADO'],
    ['USTED FUE EXPULSADO', 'EXPULSADO'],
    ['El grupo archivado no admite postulaciones', 'NO_ADMITE'],
    ['El grupo no está publicado', 'NO_ADMITE'],
    ['Algo inesperado', 'OTRO'],
    ['', 'OTRO'],
  ];
  for (const [mensaje, esperado] of casos) {
    it(`409 «${mensaje}» es ${esperado}`, () => {
      expect(classifyJoinError(conflicto(mensaje))).toBe(esperado);
    });
  }

  it('clasifica por código cuando no es un conflicto', () => {
    expect(classifyJoinError(new HttpErrorResponse({ status: 403 }))).toBe('SIN_PERMISO');
    expect(classifyJoinError(new HttpErrorResponse({ status: 404 }))).toBe('NO_ENCONTRADO');
    expect(classifyJoinError(new HttpErrorResponse({ status: 500 }))).toBe('OTRO');
    expect(classifyJoinError(new HttpErrorResponse({ status: 409, error: null }))).toBe('OTRO');
    expect(classifyJoinError(new Error('red'))).toBe('OTRO');
  });
});

describe('normalizeText', () => {
  it('quita acentos, pasa a minúsculas y recorta', () => {
    expect(normalizeText('  Búsqueda BINARIA Ñandú ')).toBe('busqueda binaria nandu');
  });
});

describe('classifyDecisionError', () => {
  const conflicto = (message: string) =>
    new HttpErrorResponse({ status: 409, error: { message } });

  it('distingue la falta de cupo de una postulación ya atendida en un 409', () => {
    expect(classifyDecisionError(conflicto('El grupo no tiene CUPO disponible'))).toBe('SIN_CUPO');
    expect(classifyDecisionError(conflicto('El grupo está lleno'))).toBe('SIN_CUPO');
    expect(classifyDecisionError(conflicto('La solicitud ya fue respondida'))).toBe('YA_RESPONDIDA');
    expect(classifyDecisionError(conflicto('Mensaje inesperado'))).toBe('YA_RESPONDIDA');
    expect(classifyDecisionError(new HttpErrorResponse({ status: 409 }))).toBe('YA_RESPONDIDA');
  });

  it('clasifica 403, 404 y el resto por código', () => {
    expect(classifyDecisionError(new HttpErrorResponse({ status: 403 }))).toBe('SIN_PERMISO');
    expect(classifyDecisionError(new HttpErrorResponse({ status: 404 }))).toBe('NO_ENCONTRADA');
    expect(classifyDecisionError(new HttpErrorResponse({ status: 500 }))).toBe('OTRO');
    expect(classifyDecisionError(new Error('red'))).toBe('OTRO');
  });
});
