import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProblemaElegido } from './problema-elegido';

describe('ProblemaElegido', () => {
  it('muestra las condiciones, el avance y el formulario de registro', async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemaElegido],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProblemaElegido);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Weird Algorithm');
    expect(root.textContent).toContain('Condiciones de realización');
    expect(root.textContent).toContain('Mis intentos');
    expect(root.querySelector('dialog app-registro-problemas-resueltos')).not.toBeNull();
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/practicante/problemas-asignados');
  });
});
