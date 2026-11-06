import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProblemasAsignados } from './problemas-asignados';

describe('ProblemasAsignados', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [ProblemasAsignados],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProblemasAsignados);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra los equipos, los problemas y el avance de ejemplo', async () => {
    const { root } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('Problemas asignados');
    expect(root.querySelectorAll('input[type="radio"]').length).toBe(3);
    expect(root.textContent).toContain('Tu avance en el equipo');
    expect(root.textContent).toContain('Por verificar');
  });

  it('enlaza cada problema con su detalle', async () => {
    const { root } = await setup();
    const enlaces = Array.from(root.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/practicante/problemas-asignados/detalle',
    );
    expect(enlaces.length).toBe(6);
  });

  it('muestra un error si la búsqueda supera 100 caracteres', async () => {
    const { fixture, root } = await setup();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'a'.repeat(101);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Usa como máximo 100 caracteres');
  });
});
