import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Session } from '../../core/session';

describe('Recursos académicos estáticos · US-19', () => {
  async function abrir(estado = '') {
    await TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] }).compileComponents();
    TestBed.inject(Session).startDemo('PRACTICANTE');
    const harness = await RouterTestingHarness.create(`/recursos?estado=${estado}`);
    await harness.fixture.whenStable();
    return harness.routeNativeElement!;
  }
  afterEach(() => TestBed.inject(Session).logout());
  it('presenta dos recursos pertinentes y el contexto fijo sin IA', async () => {
    const root = await abrir();
    expect(root.querySelectorAll('article')).toHaveLength(2);
    expect(root.textContent).toContain('Competitive Programmer’s Handbook');
    expect(root.textContent).toContain('Equipo Alfa');
    expect(root.textContent).toContain('Sin IA');
    expect([...root.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });
  it('distingue alternativas de coincidencias directas', async () => {
    const root = await abrir('relacionados');
    expect(root.textContent).toContain('No hay materiales vinculados directamente');
    expect(root.textContent).toContain('Colas y búsqueda en anchura');
  });
  it('conserva el contexto pero no presenta resultados cuando falla el catálogo', async () => {
    const root = await abrir('catalogo-no-disponible');
    expect(root.querySelectorAll('article')).toHaveLength(0);
    expect(root.textContent).toContain('No pudimos consultar el catálogo');
    expect(root.textContent).toContain('Equipo Alfa');
  });
  it('omite materiales y contexto no disponible', async () => {
    const root = await abrir('contexto-no-disponible');
    expect(root.querySelectorAll('article, aside')).toHaveLength(0);
    expect(root.textContent).toContain('No está disponible el contexto del problema');
  });
  it('usa recursos pertinentes ante un estado desconocido', async () => {
    expect((await abrir('otro')).querySelectorAll('article')).toHaveLength(2);
  });
});
