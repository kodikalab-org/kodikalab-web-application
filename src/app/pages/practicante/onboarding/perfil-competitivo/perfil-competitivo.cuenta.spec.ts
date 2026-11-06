import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingPerfilCompetitivo } from './perfil-competitivo';

describe('OnboardingPerfilCompetitivo (cuenta real)', () => {
  async function setup(prepare: (profiles: ProfileApi) => void = () => undefined) {
    await TestBed.configureTestingModule({
      imports: [OnboardingPerfilCompetitivo],
      providers: [provideRouter([])],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    // The Continuar button navigates through routerLink; there are no routes in this test.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    prepare(profiles);
    const fixture = TestBed.createComponent(OnboardingPerfilCompetitivo);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const next = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const levels = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.onb-level button'));
    return { root, form, profiles, settle, next, levels };
  }
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('disables the fields the backend does not store and says so', async () => {
    const { root, form } = await setup();
    for (const campo of ['experiencia', 'franja', 'dias', 'objetivo']) expect(form.controls[campo].disabled).toBe(true);
    expect(texto(root)).toContain('aún no se guardan en tu cuenta');
    expect(texto(root)).not.toContain('Se guarda junto con los días');
  });

  it('only accepts PRINCIPIANTE, INTERMEDIO or AVANZADO as level', async () => {
    const { root, form, next, settle } = await setup();
    form.controls['nivel'].setValue('EXPERTO');
    form.controls['nivel'].markAsTouched();
    await settle();
    expect(next().disabled).toBe(true);
    expect(texto(root)).toContain('El nivel debe ser Principiante, Intermedio o Avanzado');
    form.controls['nivel'].setValue('AVANZADO');
    await settle();
    expect(next().disabled).toBe(false);
  });

  it('stores only the level in the draft when continuing', async () => {
    const { profiles, levels, next, settle } = await setup();
    levels()[2].click();
    await settle();
    next().click();
    expect(profiles.competitive).toEqual({ nivel: 'AVANZADO' });
  });

  it('shows the level error the last step got from the backend and then forgets it', async () => {
    const { root, profiles } = await setup((api) => {
      api.competitive = { nivel: 'INTERMEDIO' };
      api.draftErrors = { nivelCompetitivo: 'Nivel competitivo inválido' };
    });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Nivel competitivo inválido');
    expect(profiles.draftErrors).toEqual({});
  });
});
