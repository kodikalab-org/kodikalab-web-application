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
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); TestBed.inject(Session).logout(); });

  for (const role of ['PRACTICANTE', 'COACH'] as const) {
    it(`opens every sidebar destination for ${role} without backend requests`, async () => {
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

  it('preserves the coach group entry point added in develop', async () => {
    TestBed.inject(Session).startDemo('COACH');
    const harness = await RouterTestingHarness.create('/coach/grupos');
    expect(TestBed.inject(Router).url).toBe('/coach/grupos/crear');
    expect(harness.routeNativeElement?.querySelector('h1')).not.toBeNull();
  });
});
