import { TestBed } from '@angular/core/testing';
import { Session } from '../../../../core/session';
import { signIn } from '../../../../testing/sign-in';
import { provideRouter } from '@angular/router';
import { OnboardingCoachCompletado } from './completado';

describe('OnboardingCoachCompletado', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingCoachCompletado],
      providers: [provideRouter([])],
    }).compileComponents();
    signIn('COACH', { especialidadPrincipal: 'Grafos', organizacionClub: 'Club de pruebas', aniosExperiencia: 4 });
    const fixture = TestBed.createComponent(OnboardingCoachCompletado);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }
  afterEach(() => TestBed.inject(Session).logout());

  it('shows the coach success state with the summary saved in the API and its actions', async () => {
    const root = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('¡Tu perfil de coach está listo!');
    expect(root.querySelector('h1')?.textContent).not.toContain('Marco');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Tu perfil de coach ya está disponible para crear equipos.',
    );
    expect(root.textContent).toContain('Grafos');
    expect(root.textContent).toContain('Club de pruebas');
    expect(root.textContent).toContain('4 años de experiencia');
    expect(root.textContent).toContain('usuario@example.com');
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
