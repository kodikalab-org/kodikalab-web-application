import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProblemasAsignadosCoach } from './problemas-asignados-coach';

describe('ProblemasAsignadosCoach', () => {
  it('muestra los problemas asignados de ejemplo y el enlace para asignar', async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemasAsignadosCoach],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProblemasAsignadosCoach);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Problemas asignados');
    expect(root.querySelectorAll('ul > li').length).toBeGreaterThanOrEqual(6);
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/asignar-problema');
  });
});
