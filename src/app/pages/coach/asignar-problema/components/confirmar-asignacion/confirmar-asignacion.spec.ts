import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmarAsignacion } from './confirmar-asignacion';

describe('ConfirmarAsignacion', () => {
  it('muestra el resumen y los enlaces de navegación', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarAsignacion],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmarAsignacion);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Revisar asignación');
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema/configurar');
    expect(hrefs).toContain('/coach/problemas-asignados');
  });
});
