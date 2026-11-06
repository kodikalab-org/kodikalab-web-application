import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import { API_URL, Role } from './core/api';
import { authInterceptor } from './core/auth-interceptor';
import { ProfileApi } from './core/profile-api';
import { Session } from './core/session';

describe('Integración de grupos y rendimiento', () => {
  let http: HttpTestingController;
  let session: Session;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
    session.logout();
    vi.spyOn(TestBed.inject(ProfileApi), 'load').mockReturnValue(
      of({ message: 'OK', profile: {} as never }),
    );
  });

  afterEach(() => {
    http.verify();
    session.logout();
  });

  function authenticate(role: Role) {
    session.account.set({
      token: '',
      email: 'integration@example.com',
      role,
      expiresAt: 0,
      cookie: true,
    });
  }

  function respond(url: string, body: object) {
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(body);
  }

  it('renderiza grupos en el cliente para evitar una redirección estática al login', () => {
    expect(serverRoutes.find((route) => route.path === 'grupos')?.renderMode).toBe(
      RenderMode.Client,
    );
  });

  it('redirige el área de grupos del coach al formulario de creación', async () => {
    authenticate('COACH');
    const harness = await RouterTestingHarness.create('/coach/grupos');
    expect(TestBed.inject(Router).url).toBe('/coach/grupos/crear');
    expect(harness.routeNativeElement?.querySelector('#grupo-nombre')).not.toBeNull();
    http.expectNone(() => true);
  });

  it('guarda un borrador desde la ruta protegida y muestra la respuesta del servicio', async () => {
    authenticate('COACH');
    const harness = await RouterTestingHarness.create('/coach/grupos/crear');
    const root = harness.routeNativeElement!;
    const name = root.querySelector<HTMLInputElement>('#grupo-nombre')!;
    name.value = 'Grupo integración';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();
    const save = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Guardar borrador'),
    )!;
    save.click();
    const request = http.expectOne('/api/teams');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toMatchObject({ name: 'Grupo integración', draft: true });
    request.flush({
      message: 'Borrador guardado',
      groupId: 8,
      name: 'Grupo integración',
      status: 'BORRADOR',
      invitationCode: 'TEST12345678',
    });
    harness.detectChanges();
    expect(root.textContent).toContain('Borrador guardado');
    await harness.navigateByUrl('/coach/grupos/creado');
    expect(harness.routeNativeElement?.textContent).toContain('Grupo integración');
    expect(harness.routeNativeElement?.textContent).toContain('TEST12345678');
  });

  it('consulta el catálogo y las membresías con la sesión autenticada', async () => {
    authenticate('PRACTICANTE');
    const harness = await RouterTestingHarness.create('/grupos');
    respond('/api/teams', [
      {
        groupId: 8,
        name: 'Grupo integración',
        description: null,
        expectedLevel: 'INTERMEDIO',
        maxCapacity: 10,
        sessionSchedule: null,
        status: 'ACTIVO',
        visibility: 'PUBLICO',
      },
    ]);
    respond('/api/teams/me', []);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Grupo integración');
  });

  it('consulta las solicitudes únicamente para el grupo seleccionado del coach', async () => {
    authenticate('COACH');
    const harness = await RouterTestingHarness.create('/coach/grupos/solicitudes?grupo=8');
    respond('/api/teams/me', [
      {
        groupId: 8,
        name: 'Grupo integración',
        description: null,
        expectedLevel: 'INTERMEDIO',
        maxCapacity: 10,
        sessionSchedule: null,
        status: 'ACTIVO',
        visibility: 'PUBLICO',
        invitationCode: 'TEST12345678',
        activeMembers: 2,
        pendingRequests: 0,
      },
    ]);
    respond('/api/teams/8/memberships?status=PENDIENTE', []);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('TEST12345678');
    expect(harness.routeNativeElement?.textContent).toContain('No hay solicitudes');
  });

  const pages = [
    {
      path: '/coach/ranking',
      role: 'COACH',
      endpoint: '/api/analytics/teams/8/standings',
      body: { teamId: 8, status: 'NO_ACTIVITY', members: [] },
      selector: 'app-ranking-live',
    },
    {
      path: '/coach/rendimiento',
      role: 'COACH',
      endpoint: '/api/analytics/teams/8/weaknesses',
      body: { teamId: 8, activeMembers: 2, pendingResolutions: 0, topics: [] },
      selector: 'app-topics-live',
    },
    {
      path: '/coach/competencias',
      role: 'COACH',
      endpoint: '/api/competitions/teams/8/official-results',
      body: [],
      selector: 'app-results-live',
    },
    {
      path: '/progreso/equipos',
      role: 'PRACTICANTE',
      endpoint: '/api/analytics/teams/8/progress/me',
      body: { teamId: 8, membershipId: 3, userId: 2, acceptedProblems: 0 },
      selector: 'app-progress-live',
    },
  ] as const;

  for (const page of pages) {
    it(`conserva la ruta protegida y el contexto de equipo de ${page.path}`, async () => {
      authenticate(page.role);
      const harness = await RouterTestingHarness.create(`${page.path}?teamId=8`);
      respond('/api/teams/me', []);
      if (page.path === '/coach/competencias') respond('/api/competitions/teams/8', []);
      if (page.path === '/progreso/equipos') respond('/api/competitions/teams/8/problems', []);
      respond(page.endpoint, page.body);
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe(`${page.path}?teamId=8`);
      expect(harness.routeNativeElement?.querySelector(page.selector)).not.toBeNull();
    });
  }

  it('permite navegar de grupos al ranking y cambiar de equipo sin reutilizar métricas', async () => {
    authenticate('PRACTICANTE');
    const harness = await RouterTestingHarness.create('/grupos');
    respond('/api/teams', []);
    respond('/api/teams/me', []);
    await harness.navigateByUrl('/ranking?teamId=8');
    respond('/api/teams/me', []);
    respond('/api/analytics/teams/8/standings', {
      teamId: 8,
      status: 'CALCULATED',
      members: [
        {
          membershipId: 1,
          userId: 2,
          fullName: 'Integrante del equipo 8',
          position: 1,
          acceptedProblems: 2,
        },
      ],
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Integrante del equipo 8');
    await harness.navigateByUrl('/ranking?teamId=9');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Integrante del equipo 8');
    respond('/api/analytics/teams/9/standings', { teamId: 9, status: 'NO_ACTIVITY', members: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Integrante del equipo 8');
  });

  it.each(['/grupos', '/coach/grupos', '/coach/grupos/solicitudes', ...pages.map((p) => p.path)])(
    'impide entrar sin sesión a %s sin consultar datos del equipo',
    async (path) => {
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login');
      http.expectNone(() => true);
    },
  );
});
