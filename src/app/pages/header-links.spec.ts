import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Session } from '../core/session';

const PRACTITIONER_HEADER = ['/inicio', '/practicante/problemas-asignados', '/concursos', '/grupos', '/recursos'];
const COACH_HEADER = ['/coach/inicio', '/coach/problemas-asignados', '/coach/concursos', '/grupos', '/recursos'];

const PAGES = [
  { url: '/coach/competencias', role: 'COACH', header: COACH_HEADER },
  { url: '/progreso', role: 'PRACTICANTE', header: PRACTITIONER_HEADER },
  { url: '/progreso/equipos', role: 'PRACTICANTE', header: PRACTITIONER_HEADER },
  { url: '/ranking', role: 'PRACTICANTE', header: PRACTITIONER_HEADER },
  { url: '/coach/rendimiento', role: 'COACH', header: COACH_HEADER },
] as const;

describe('Header links of the progress, ranking and results pages', () => {
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((request) => request.flush(null, { status: 503, statusText: 'Service Unavailable' }));
    TestBed.inject(Session).logout();
  });

  for (const page of PAGES) {
    it(`${page.url} uses the shared header with real destinations and no disabled items`, async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
      });
      TestBed.inject(Session).startDemo(page.role);
      const harness = await RouterTestingHarness.create(page.url);
      await harness.fixture.whenStable();
      harness.detectChanges();
      const root = harness.routeNativeElement!;

      expect(root.querySelectorAll('app-header')).toHaveLength(1);
      expect(root.querySelector('span[aria-disabled]')).toBeNull();
      expect(root.querySelector('app-header [title="Pendiente de integración"], app-header [title="Próximamente"]')).toBeNull();
      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('app-header nav[aria-label="Navegación principal"] a'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual([...page.header]);
      expect(links.map((link) => link.textContent?.trim())).toEqual(['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos']);
      expect(root.querySelector('a[href*="#problemas"], a[href*="#competencias"], a[href*="#grupos"]')).toBeNull();
    }, 15000);
  }
});
