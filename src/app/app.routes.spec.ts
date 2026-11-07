import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { Session } from './core/session';

describe('Group routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(Session).logout();
  });

  it('declares /grupos without a fixed role so both coaches and practitioners pass the guard', () => {
    const route = routes.find((item) => item.path === 'grupos');
    expect(route?.data?.['role']).toBeNull();
    expect(route?.canActivate?.length).toBe(1);
  });

  it('keeps the coach management pages restricted to coaches', () => {
    expect(routes.find((item) => item.path === 'coach/grupos')?.data?.['role']).toBe('COACH');
  });

  it('sends a coach who opens a group detail to that group management page', async () => {
    TestBed.inject(Session).startDemo('COACH');
    await RouterTestingHarness.create('/grupos/7');
    expect(TestBed.inject(Router).url).toBe('/coach/grupos/solicitudes?grupo=7');
  });

  for (const role of ['PRACTICANTE', 'COACH'] as const) {
    it(`opens /grupos and the tab query for ${role}`, async () => {
      TestBed.inject(Session).startDemo(role);
      const harness = await RouterTestingHarness.create('/grupos?tab=mis-grupos');
      expect(TestBed.inject(Router).url).toBe('/grupos?tab=mis-grupos');
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Grupos');
    });
  }
});

describe('rutas de asignación de problemas', () => {
  const rol = (path: string) => routes.find((r) => r.path === path)?.data?.['role'];

  it('las pantallas del coach exigen el rol COACH', () => {
    expect(rol('coach/asignar-problema')).toBe('COACH');
    expect(rol('coach/problemas-asignados')).toBe('COACH');
  });

  it('las pantallas del practicante exigen el rol PRACTICANTE', () => {
    expect(rol('practicante/problemas-asignados')).toBe('PRACTICANTE');
  });
});
