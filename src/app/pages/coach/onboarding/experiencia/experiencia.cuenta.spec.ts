import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingExperiencia } from './experiencia';

describe('OnboardingExperiencia (cuenta real)', () => {
  async function setup(prepare: (profiles: ProfileApi) => void = () => undefined) {
    await TestBed.configureTestingModule({
      imports: [OnboardingExperiencia],
      providers: [provideRouter([])],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    // The Continuar button navigates through routerLink; there are no routes in this test.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    prepare(profiles);
    const fixture = TestBed.createComponent(OnboardingExperiencia);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const next = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      await settle();
    };
    return { root, form, profiles, settle, next, type };
  }
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('requires a non-blank specialty of at most 120 characters', async () => {
    const { root, type, next } = await setup();
    await type('especialidad', '   ');
    expect(texto(root)).toContain('Ingresa tu especialidad principal');
    await type('especialidad', 'E'.repeat(121));
    expect(texto(root)).toContain('La especialidad no puede superar los 120 caracteres');
    expect(next().disabled).toBe(true);
  });

  it('limits the organization to 150 characters and shows its counter', async () => {
    const { root, type } = await setup();
    await type('organizacion', 'Club');
    expect(texto(root)).toContain('4/150');
    await type('organizacion', 'O'.repeat(151));
    expect(texto(root)).toContain('La organización no puede superar los 150 caracteres');
  });

  it('accepts whole years between 0 and 60 only', async () => {
    const { root, form, next, type } = await setup();
    await type('especialidad', 'Grafos');
    for (const valido of ['0', '60']) { await type('anios', valido); expect(next().disabled).toBe(false); }
    for (const invalido of ['-1', '61', '']) { await type('anios', invalido); expect(next().disabled).toBe(true); }
    await type('anios', '3.5');
    expect(form.controls['anios'].hasError('integer')).toBe(true);
    expect(texto(root)).toContain('Los años de experiencia deben ser un número entero');
    expect(next().disabled).toBe(true);
  });

  it('stores trimmed values in the draft when continuing', async () => {
    const { profiles, next, type } = await setup();
    await type('especialidad', '  Grafos ');
    await type('organizacion', ' Club UPC ');
    await type('anios', '5');
    next().click();
    expect(profiles.coach).toEqual({ especialidad: 'Grafos', organizacion: 'Club UPC', anios: 5 });
  });

  it('shows the errors the last step got from the backend under their fields and then forgets them', async () => {
    const { root, profiles, type } = await setup((api) => {
      api.coach = { especialidad: 'Grafos', organizacion: 'Club', anios: 99 };
      api.draftErrors = { especialidadPrincipal: 'Especialidad inválida', aniosExperiencia: 'Años fuera de rango' };
    });
    expect(texto(root)).toContain('Especialidad inválida');
    expect(root.querySelector<HTMLInputElement>('#anios')!.value).toBe('99');
    expect(profiles.draftErrors).toEqual({});
    await type('especialidad', 'Teoría de números');
    expect(texto(root)).not.toContain('Especialidad inválida');
  });
});
