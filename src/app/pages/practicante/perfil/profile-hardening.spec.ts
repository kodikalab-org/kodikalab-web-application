import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { PractitionerProfile, ProfileResponse } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { OnboardingCompletado } from '../onboarding/completado/completado';
import { OnboardingPlataformas } from '../onboarding/plataformas/plataformas';
import { PerfilEditar } from '../perfil-editar/perfil-editar';
import { Perfil } from './perfil';

describe('Practitioner screens with real account data', () => {
  const practitioner: PractitionerProfile = {
    fullName: 'Ana María Núñez', email: 'student@example.invalid', role: 'PRACTICANTE',
    codigoEstudiante: 'TEST001', carrera: 'Ingeniería de Software', cicloAcademico: 5,
    nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: null, codeforcesRating: null,
    atcoderHandle: null, vjudgeHandle: null,
  };

  async function render<T>(component: Type<T>, prepare?: (profiles: ProfileApi) => void) {
    await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] })
      .compileComponents();
    TestBed.inject(Session).demo.set(null);
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(practitioner);
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

  it('shows the level label instead of the API code in the onboarding summary', async () => {
    const { root } = await render(OnboardingCompletado);
    expect(text(root)).toContain('Nivel Intermedio');
    expect(text(root)).not.toContain('INTERMEDIO');
  });

  it('shows the account initials and name in the onboarding header once the profile exists', async () => {
    const { root } = await render(OnboardingCompletado);
    expect(root.querySelector('.account-avatar')?.textContent?.trim()).toBe('AN');
    expect(root.querySelector('.account-name')?.textContent?.trim()).toBe('Ana María Núñez');
  });

  it('shows the level label instead of the API code on the profile', async () => {
    const { root } = await render(Perfil);
    expect(text(root)).toContain('Intermedio · TEST001');
  });

  it('shows the account initials in the edit screen menu', async () => {
    const { root } = await render(PerfilEditar);
    expect(root.querySelector('app-user-menu')?.textContent?.trim()).toBe('AN');
  });

  it('shows the save error and re-enables saving when the edit request fails', async () => {
    const response = new Subject<ProfileResponse>();
    const { fixture, root } = await render(PerfilEditar, (profiles) => {
      vi.spyOn(profiles, 'save').mockReturnValue(response);
    });
    button(root, 'Guardar cambios').click();
    await fixture.whenStable();
    await failLater(response);
    await fixture.whenStable();
    expect(text(root)).toContain('No pudimos conectar con el servidor.');
    expect(button(root, 'Guardar cambios')?.disabled).toBe(false);
  });

  it('shows the save error and restores the actions when linking platforms fails', async () => {
    const response = new Subject<ProfileResponse>();
    const { fixture, root } = await render(OnboardingPlataformas, (profiles) => {
      profiles.academic = { codigo: 'TEST001', carrera: 'Ingeniería de Software', ciclo: '5.º ciclo', distrito: '' };
      profiles.competitive = { nivel: 'INTERMEDIO' };
      vi.spyOn(profiles, 'save').mockReturnValue(response);
    });
    button(root, 'Guardar y finalizar').click();
    await fixture.whenStable();
    await failLater(response);
    await fixture.whenStable();
    expect(text(root)).toContain('No pudimos conectar con el servidor.');
    expect(button(root, 'Guardar y finalizar')).toBeDefined();
  });
});
