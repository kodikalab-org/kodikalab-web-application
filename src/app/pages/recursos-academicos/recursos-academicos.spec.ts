import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Session } from '../../core/session';
import { signIn } from '../../testing/sign-in';

describe('Recursos académicos · estado vacío', () => {
  async function abrir(role: 'PRACTICANTE' | 'COACH' = 'PRACTICANTE') {
    await TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] }).compileComponents();
    signIn(role);
    const harness = await RouterTestingHarness.create('/recursos');
    await harness.fixture.whenStable();
    return harness.routeNativeElement!;
  }
  afterEach(() => TestBed.inject(Session).logout());

  it('no muestra recursos inventados y ofrece volver al inicio', async () => {
    const root = await abrir();
    expect(root.querySelector('h1')?.textContent).toContain('Recursos de estudio');
    expect(root.querySelectorAll('article')).toHaveLength(0);
    expect(root.textContent).toContain('Aún no hay recursos disponibles');
    expect(root.textContent).not.toMatch(/Handbook|Camino mínimo|Equipo Alfa|Sin IA/);
    expect(root.querySelector('a[href="/inicio"]')).not.toBeNull();
  });

  it('el coach vuelve a su propio inicio', async () => {
    const root = await abrir('COACH');
    expect(root.querySelector('a[href="/coach/inicio"]')).not.toBeNull();
  });
});
