import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { API_URL, Role } from './core/api';
import { authInterceptor } from './core/auth-interceptor';
import { ProfileApi } from './core/profile-api';
import { Session } from './core/session';

describe('Integración de rutas de equipo (US11 a US14)', () => {
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
      token: 'test-token',
      email: 'integration@example.com',
      role,
      expiresAt: Date.now() + 3600_000,
    });
  }

  function respond(url: string, body: object) {
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(body);
  }

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
      respond(page.endpoint, page.body);
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe(`${page.path}?teamId=8`);
      expect(harness.routeNativeElement?.querySelector(page.selector)).not.toBeNull();
    });
  }

  it('cambia de equipo sin reutilizar métricas del anterior', async () => {
    authenticate('PRACTICANTE');
    const harness = await RouterTestingHarness.create('/ranking?teamId=8');
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

  it.each(pages.map((p) => p.path))(
    'impide entrar sin sesión a %s sin consultar datos del equipo',
    async (path) => {
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login');
      http.expectNone(() => true);
    },
  );
});
