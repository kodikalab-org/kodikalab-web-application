import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { signIn } from '../../../../testing/sign-in';
import { OnboardingCompletado } from './completado';

const PERFIL = { codigoEstudiante: '20240001', carrera: 'Ingeniería de Software', cicloAcademico: 5,
  nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: 'usuario_cf', codeforcesRating: 1432,
  atcoderHandle: null, vjudgeHandle: null };

describe('OnboardingCompletado', () => {
  async function abrir(message = 'Perfil guardado correctamente.', profile: Record<string, unknown> = PERFIL) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingCompletado }])],
    }).compileComponents();
    signIn('PRACTICANTE', profile);
    TestBed.inject(ProfileApi).message.set(message);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla', OnboardingCompletado);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }
  afterEach(() => TestBed.inject(Session).logout());

  it('shows the success message and the summary that comes from the saved profile', async () => {
    const root = await abrir();
    expect(root.querySelector('h1')?.textContent).toContain('¡Tu perfil está listo!');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Perfil actualizado correctamente');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Perfil guardado correctamente.');
    expect(root.textContent).toContain('Código 20240001');
    expect(root.textContent).toContain('Codeforces: usuario_cf · rating 1432');
    expect(root.textContent).toContain('usuario@example.com');
    expect(root.textContent).not.toMatch(/Camila|camila_/);
  });

  it('keeps the "(completado)" suffix of the three steps for screen readers only', async () => {
    const root = await abrir();
    const hidden = Array.from(root.querySelectorAll('ol .sr-only'));
    expect(hidden.length).toBe(3);
    for (const sr of hidden) {
      expect(sr.textContent).toBe(' (completado)');
    }
  });

  it('shows the Codeforces warning when the API says it could not confirm the handle', async () => {
    const root = await abrir('Codeforces no confirmó el identificador', { ...PERFIL, codeforcesHandle: null, codeforcesRating: null });
    const status = root.querySelector('[role="status"]')!.textContent!;
    expect(status).toContain('Perfil actualizado, pero Codeforces no confirmó el identificador');
    expect(root.textContent).toContain('Codeforces sin vincular');
    expect(root.textContent).not.toContain('rating');
  });
});
