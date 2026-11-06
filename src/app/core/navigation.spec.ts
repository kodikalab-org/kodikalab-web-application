import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { navigationFor } from './navigation';
import { Session } from './session';
import { ProfileApi } from './profile-api';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

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
      for (const link of navigationFor(role === 'COACH')) {
        const url = link.path + (link.fragment ? `#${link.fragment}` : '');
        await harness.navigateByUrl(url);
        expect(TestBed.inject(Router).url, link.label).toBe(url);
        expect(harness.routeNativeElement?.querySelector('h1'), link.label).not.toBeNull();
      }
      expect(load).not.toHaveBeenCalled();
    }, 15000);
  }

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
