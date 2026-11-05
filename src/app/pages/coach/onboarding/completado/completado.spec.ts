import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OnboardingCoachCompletado } from './completado';

describe('OnboardingCoachCompletado', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingCoachCompletado],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingCoachCompletado);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the coach success state with its summary and actions', async () => {
    const root = await setup();
    expect(root.querySelector('h1')?.textContent).toContain(
      '¡Tu perfil de coach está listo, Marco!',
    );
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Tu perfil de coach ya está disponible para crear equipos.',
    );
    expect(root.textContent).toContain('4 años de experiencia');
    expect(root.textContent).toContain('Crear mi primer equipo');
  });

  it('keeps the completed step suffix for screen readers only', async () => {
    const root = await setup();
    const hidden = Array.from(root.querySelectorAll('ol .sr-only'));
    expect(hidden.length).toBe(2);
    for (const sr of hidden) {
      expect(sr.textContent).toBe(' (completado)');
    }
  });
});
