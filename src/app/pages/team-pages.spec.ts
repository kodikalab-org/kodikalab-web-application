import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Session } from '../core/session';
import { signIn } from '../testing/sign-in';

const PAGES = [
  { url: '/ranking', role: 'PRACTICANTE', title: 'Ranking' },
  { url: '/progreso/equipos', role: 'PRACTICANTE', title: 'Mi progreso por equipo' },
  { url: '/coach/rendimiento', role: 'COACH', title: 'Rendimiento' },
  { url: '/coach/competencias', role: 'COACH', title: 'Resultados oficiales' },
] as const;

describe('Pantallas de equipo conectadas a la API', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((request) => request.flush([]));
    http.verify();
    TestBed.inject(Session).logout();
  });

  for (const page of PAGES) {
    it(`${page.url} muestra la pantalla real, sin datos de ejemplo ni avisos de demostración`, async () => {
      signIn(page.role);
      const harness = await RouterTestingHarness.create(page.url);
      await harness.fixture.whenStable();
      const root = harness.routeNativeElement!;
      expect(root.querySelector('h1')?.textContent).toContain(page.title);
      expect(root.querySelector('[role="note"]')).toBeNull();
      expect(root.textContent).not.toMatch(/Demostración|de ejemplo|Equipo Alfa|Camila Rojas|Sebastián Cruz/);
    }, 15000);
  }

  it('los resultados oficiales no se abren sin sesión ni con rol practicante', async () => {
    const harness = await RouterTestingHarness.create('/coach/competencias');
    expect(TestBed.inject(Router).url).toContain('/login');
    signIn('PRACTICANTE');
    await harness.navigateByUrl('/coach/competencias');
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });
});
