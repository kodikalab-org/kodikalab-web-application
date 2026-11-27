import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { CoachProfile, ProfileResponse } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { OnboardingCoachCompletado } from '../onboarding/completado/completado';
import { OnboardingPresentacion } from '../onboarding/presentacion/presentacion';
import { CoachPerfilEditar } from '../perfil-editar/perfil-editar';
import { CoachPerfil } from './perfil';

describe('Coach screens with real account data', () => {
  const coach: CoachProfile = {
    fullName: 'Ángela María Quispe', email: 'coach@example.invalid', role: 'COACH',
    especialidadPrincipal: 'Grafos', organizacionClub: null, aniosExperiencia: 1, presentacion: null,
  };

  async function render<T>(component: Type<T>, prepare?: (profiles: ProfileApi) => void) {
    await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] })
      .compileComponents();
    TestBed.inject(Session).demo.set(null);
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(coach);
    prepare?.(profiles);
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  const text = (root: HTMLElement) => root.textContent!.replace(/\s+/g, ' ');
  const button = (root: HTMLElement, label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent!.includes(label))!;

  async function failLater(response: Subject<ProfileResponse>) {
    response.error(new HttpErrorResponse({ status: 500 }));
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('uses the singular for one year and skips the missing organization row', async () => {
    const { root } = await render(CoachPerfil);
    expect(text(root)).toContain('1 año de experiencia entrenando');
    expect(root.querySelectorAll('img[src="images/perfil-coach/building-18.svg"]').length).toBe(0);
  });

  it('uses the singular for one year in the onboarding summary', async () => {
    const { root } = await render(OnboardingCoachCompletado);
    expect(text(root)).toContain('1 año de experiencia');
    expect(text(root)).not.toContain('1 años');
  });

  it('shows the account initials and name in the onboarding header once the profile exists', async () => {
    const { root } = await render(OnboardingCoachCompletado);
    expect(root.querySelector('.account-avatar')?.textContent?.trim()).toBe('ÁQ');
    expect(root.querySelector('.account-name')?.textContent?.trim()).toBe('Ángela María Quispe');
  });

  it('shows the account initials in the edit screen menu', async () => {
    const { root } = await render(CoachPerfilEditar);
    expect(root.querySelector('app-user-menu')?.textContent?.trim()).toBe('ÁQ');
  });

  it('shows the save error and re-enables saving when the edit request fails', async () => {
    const response = new Subject<ProfileResponse>();
    const { fixture, root } = await render(CoachPerfilEditar, (profiles) => {
      vi.spyOn(profiles, 'save').mockReturnValue(response);
    });
    button(root, 'Guardar cambios').click();
    await fixture.whenStable();
    await failLater(response);
    await fixture.whenStable();
    expect(text(root)).toContain('No pudimos conectar con el servidor.');
    expect(button(root, 'Guardar cambios')?.disabled).toBe(false);
  });

  it('shows the save error and restores the actions when the presentation request fails', async () => {
    const response = new Subject<ProfileResponse>();
    const { fixture, root } = await render(OnboardingPresentacion, (profiles) => {
      profiles.coach = { especialidad: 'Geometría', organizacion: '', anios: 1 };
      vi.spyOn(profiles, 'save').mockReturnValue(response);
    });
    button(root, 'Guardar y finalizar').click();
    await fixture.whenStable();
    await failLater(response);
    await fixture.whenStable();
    expect(text(root)).toContain('No pudimos conectar con el servidor.');
    expect(button(root, 'Guardar y finalizar')).toBeDefined();
  });

  it('previews what the coach typed instead of the demo summary', async () => {
    const { root } = await render(OnboardingPresentacion, (profiles) => {
      profiles.coach = { especialidad: 'Geometría', organizacion: '', anios: 1 };
    });
    expect(text(root)).toContain('Coach · Geometría · 1 año');
    expect(text(root)).not.toContain('Club de Programación Competitiva');
    expect(text(root)).not.toContain('4 años');
  });
});
