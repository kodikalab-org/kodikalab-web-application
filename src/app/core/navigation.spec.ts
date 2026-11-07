import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { HEADER_LINK_COUNT, navigationFor, profileMenuFor } from './navigation';
import { Session } from './session';
import { ProfileApi } from './profile-api';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

/** Destinations whose pages are built elsewhere; here only their hrefs are asserted, never opened. */
const NOT_OPENED_HERE = ['/concursos', '/coach/concursos', '/practicante/problemas-asignados', '/coach/problemas-asignados'];

describe('Application navigation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    // /progreso reads the real topic progress (US-10) even in the demo; every other page must stay offline.
    http.match((request) => request.url.includes('/analytics/teams/'))
      .forEach((request) => request.flush(null, { status: 503, statusText: 'Service Unavailable' }));
    http.verify();
    TestBed.inject(Session).logout();
  });

  for (const role of ['PRACTICANTE', 'COACH'] as const) {
    it(`opens every header and dropdown destination for ${role} without backend requests`, async () => {
      const session = TestBed.inject(Session);
      session.startDemo(role);
      const load = vi.spyOn(TestBed.inject(ProfileApi), 'load');
      const harness = await RouterTestingHarness.create();
      for (const link of navigationFor(role === 'COACH').filter((item) => !NOT_OPENED_HERE.includes(item.path))) {
        const url = link.path + (link.fragment ? `#${link.fragment}` : '');
        await harness.navigateByUrl(url);
        expect(TestBed.inject(Router).url, link.label).toBe(url);
        expect(harness.routeNativeElement?.querySelector('h1'), link.label).not.toBeNull();
      }
      expect(load).not.toHaveBeenCalled();
    }, 15000);
  }

  it('points every header link to its own page for both roles', () => {
    const header = (coach: boolean) => navigationFor(coach).slice(0, HEADER_LINK_COUNT).map((link) => [link.label, link.path, link.fragment]);
    expect(header(false)).toEqual([
      ['Inicio', '/inicio', undefined],
      ['Problemas', '/practicante/problemas-asignados', undefined],
      ['Concursos', '/concursos', undefined],
      ['Grupos', '/grupos', undefined],
      ['Recursos', '/recursos', undefined],
    ]);
    expect(header(true)).toEqual([
      ['Inicio', '/coach/inicio', undefined],
      ['Problemas', '/coach/problemas-asignados', undefined],
      ['Concursos', '/coach/concursos', undefined],
      ['Grupos', '/grupos', undefined],
      ['Recursos', '/recursos', undefined],
    ]);
  });

  it('keeps Solicitudes and the official results in the coach dropdown only', () => {
    const labels = (coach: boolean) => profileMenuFor(coach).map((link) => link.label);
    expect(profileMenuFor(true).find((link) => link.label === 'Solicitudes')?.path).toBe('/coach/grupos/solicitudes');
    expect(profileMenuFor(true).find((link) => link.label === 'Resultados oficiales')?.path).toBe('/coach/competencias');
    expect(labels(true)).toEqual(expect.arrayContaining(['Seguimiento de grupos', 'Rendimiento', 'Mi perfil', 'Editar perfil']));
    expect(labels(true)).not.toContain('Ranking');
    expect(labels(false)).not.toContain('Solicitudes');
    expect(labels(false)).not.toContain('Resultados oficiales');
  });

  it('points the Grupos link to the shared /grupos page for both roles', () => {
    for (const coach of [true, false]) {
      expect(navigationFor(coach).find((link) => link.label === 'Grupos')?.path, String(coach)).toBe('/grupos');
    }
  });

  it('redirects the old coach group entry point to /grupos', async () => {
    TestBed.inject(Session).startDemo('COACH');
    const harness = await RouterTestingHarness.create('/coach/grupos');
    expect(TestBed.inject(Router).url).toBe('/grupos');
    expect(harness.routeNativeElement?.querySelector('h1')).not.toBeNull();
  });
});
