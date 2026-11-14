import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { onboardingRoutes, privateRoutes, routes } from './app.routes';
import { AppShell } from './layouts/app-shell/app-shell';
import { accessGuard } from './core/access-guard';
import { Session } from './core/session';
import { signIn } from './testing/sign-in';
import { API_URL } from './core/api';
import { AssignmentStore } from './pages/coach/asignar-problema/assignment-store';

describe('Group routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.match(() => true).filter((request) => !request.cancelled)
      .forEach((request) => request.flush(null, { status: 503, statusText: 'Service Unavailable' }));
    http.verify();
    TestBed.inject(Session).logout();
  });

  it('declares /grupos without a fixed role so both coaches and practitioners pass the guard', () => {
    const route = privateRoutes.find((item) => item.path === 'grupos');
    expect(route?.data?.['role']).toBeNull();
  });

  it('keeps the coach management pages restricted to coaches', () => {
    expect(privateRoutes.find((item) => item.path === 'coach/grupos')?.data?.['role']).toBe('COACH');
  });

  it('sends a coach who opens a group detail to that group management page', async () => {
    signIn('COACH');
    await RouterTestingHarness.create('/grupos/7');
    expect(TestBed.inject(Router).url).toBe('/coach/grupos/solicitudes?grupo=7');
  });

  for (const role of ['PRACTICANTE', 'COACH'] as const) {
    it(`opens /grupos and the tab query for ${role}`, async () => {
      signIn(role);
      const harness = await RouterTestingHarness.create('/grupos?tab=mis-grupos');
      expect(TestBed.inject(Router).url).toBe('/grupos?tab=mis-grupos');
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Grupos');
    });
  }
});

describe('rutas de asignación de problemas', () => {
  const rol = (path: string) => privateRoutes.find((r) => r.path === path)?.data?.['role'];

  it('las pantallas del coach exigen el rol COACH', () => {
    expect(rol('coach/asignar-problema')).toBe('COACH');
    expect(rol('coach/problemas-asignados')).toBe('COACH');
  });

  it('las pantallas del practicante exigen el rol PRACTICANTE', () => {
    expect(rol('practicante/problemas-asignados')).toBe('PRACTICANTE');
  });

  it('el flujo de asignación del coach comparte su estado entre los tres pasos y ya no tiene el paso de destinatarios', () => {
    const flujo = privateRoutes.find((r) => r.path === 'coach/asignar-problema');
    expect(flujo?.providers).toContain(AssignmentStore);
    expect(flujo?.children?.map((paso) => paso.path)).toEqual(['', 'configurar', 'confirmar']);
  });
});

describe('rutas con parámetros de problemas asignados', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(Session).logout();
  });

  it('el detalle del practicante lleva el id de la asignación en la ruta y pide ese problema', async () => {
    signIn('PRACTICANTE');
    await RouterTestingHarness.create('/practicante/problemas-asignados/detalle/51?teamId=12');
    expect(TestBed.inject(Router).url).toBe('/practicante/problemas-asignados/detalle/51?teamId=12');
    const request = TestBed.inject(HttpTestingController).expectOne('/api/problems/assigned/51');
    expect(request.request.method).toBe('GET');
    request.flush({}, { status: 404, statusText: 'Not Found' });
  });

  it('el detalle sin id de asignación ya no existe y muestra la página 404', async () => {
    signIn('PRACTICANTE');
    const harness = await RouterTestingHarness.create('/practicante/problemas-asignados/detalle');
    expect(TestBed.inject(Router).url).toBe('/practicante/problemas-asignados/detalle');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('No encontramos esta página');
  });
});

describe('marco único de la aplicación', () => {
  const shell = routes.find((route) => route.children === privateRoutes);

  it('todas las rutas privadas son hijas de una ruta sin path que usa AppShell y el guard', () => {
    expect(shell?.path).toBe('');
    expect(shell?.component).toBe(AppShell);
    expect(shell?.canActivateChild).toContain(accessGuard);
  });

  it('cada ruta privada declara su rol en data, sin deducirlo del prefijo', () => {
    for (const route of privateRoutes) {
      expect(route.data && 'role' in route.data, route.path).toBe(true);
      const expected = route.path === 'recursos' || route.path === 'grupos' ? null : route.path!.startsWith('coach/') ? 'COACH' : 'PRACTICANTE';
      expect(route.data?.['role'], route.path).toBe(expected);
    }
  });

  it('las URLs privadas se conservan', () => {
    expect(privateRoutes.map((route) => route.path).sort()).toEqual([
      'coach/asignar-problema', 'coach/competencias', 'coach/concursos', 'coach/grupos', 'coach/inicio',
      'coach/perfil', 'coach/perfil/editar', 'coach/problemas-asignados', 'coach/ranking', 'coach/rendimiento',
      'concursos', 'grupos', 'inicio', 'perfil', 'perfil/editar', 'practicante/problemas-asignados', 'progreso',
      'progreso/equipos', 'ranking', 'recursos',
    ]);
  });

  it('las pantallas de acceso y los asistentes de onboarding quedan fuera del marco', () => {
    const fuera = routes.filter((route) => route !== shell).map((route) => route.path);
    for (const path of ['', 'login', 'registro', 'recuperar-contrasena', 'sin-conexion']) expect(fuera).toContain(path);
    expect(onboardingRoutes).toHaveLength(7);
    for (const route of onboardingRoutes) {
      expect(route.path).toMatch(/^onboarding\/(practicante|coach)\//);
      expect(route.canActivate).toContain(accessGuard);
      expect(route.data?.['role']).toBe(route.path!.startsWith('onboarding/coach/') ? 'COACH' : 'PRACTICANTE');
    }
  });

  it('una dirección desconocida muestra la página 404 dentro del marco, con enlace al inicio', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    signIn('COACH');
    const harness = await RouterTestingHarness.create('/no-existe');
    expect(TestBed.inject(Router).url).toBe('/no-existe');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('app-header header')).not.toBeNull();
    expect(root.querySelector('main h1')?.textContent).toContain('No encontramos esta página');
    expect(root.querySelector('main a[href="/coach/inicio"]')?.textContent).toContain('Ir al inicio');
    expect(root.querySelector('app-site-footer')).not.toBeNull();
    TestBed.inject(Session).logout();
  });

  it('la 404 enlaza a la raíz cuando no hay sesión', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create('/no-existe');
    expect(harness.routeNativeElement?.querySelector('main a[href="/"]')).not.toBeNull();
  });
});
