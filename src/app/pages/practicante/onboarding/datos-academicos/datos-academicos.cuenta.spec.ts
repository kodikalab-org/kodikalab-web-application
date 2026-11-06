import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingDatosAcademicos } from './datos-academicos';

describe('OnboardingDatosAcademicos (cuenta real)', () => {
  async function setup(prepare: (profiles: ProfileApi) => void = () => undefined) {
    await TestBed.configureTestingModule({
      imports: [OnboardingDatosAcademicos],
      providers: [provideRouter([])],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    // The Continuar button navigates through routerLink; there are no routes in this test.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    prepare(profiles);
    const fixture = TestBed.createComponent(OnboardingDatosAcademicos);
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
    return { fixture, root, form, profiles, settle, next, type };
  }
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('starts empty with the district disabled and marked as not saved', async () => {
    const { root, form, next } = await setup();
    expect(form.controls['distrito'].disabled).toBe(true);
    expect(texto(root)).toContain('Aún no se guarda en tu cuenta');
    expect(next().disabled).toBe(true);
  });

  it('rejects a whitespace-only code and one longer than 20 characters with their own message', async () => {
    const { root, next, type } = await setup();
    await type('codigo', '   ');
    expect(texto(root)).toContain('Ingresa tu código de estudiante');
    await type('codigo', 'X'.repeat(21));
    expect(texto(root)).toContain('El código no puede superar los 20 caracteres');
    expect(next().disabled).toBe(true);
  });

  it('rejects a career longer than 100 characters and an invalid cycle', async () => {
    const { root, form, next, settle } = await setup();
    form.patchValue({ codigo: 'U1', carrera: 'C'.repeat(101), ciclo: '2.5' });
    form.markAllAsTouched();
    await settle();
    expect(texto(root)).toContain('La carrera no puede superar los 100 caracteres');
    expect(texto(root)).toContain('El ciclo debe ser un número entero mayor o igual a 1');
    expect(next().disabled).toBe(true);
    form.patchValue({ carrera: 'Ingeniería de Software', ciclo: '0.º ciclo' });
    await settle();
    expect(next().disabled).toBe(true);
    form.patchValue({ ciclo: '5.º ciclo' });
    await settle();
    expect(next().disabled).toBe(false);
  });

  it('keeps the trimmed values in the draft when continuing, without the district', async () => {
    const { form, profiles, next, settle } = await setup();
    form.patchValue({ codigo: '  U202412345 ', carrera: ' Ingeniería de Software ', ciclo: '5.º ciclo' });
    await settle();
    next().click();
    expect(profiles.academic).toEqual({ codigo: 'U202412345', carrera: 'Ingeniería de Software', ciclo: '5.º ciclo', distrito: '' });
  });

  it('restores the draft when coming back to the step', async () => {
    const { root } = await setup((profiles) => {
      profiles.academic = { codigo: 'U1', carrera: 'Ciencias de la Computación', ciclo: '3.º ciclo', distrito: '' };
    });
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('U1');
    expect(texto(root)).toContain('3.º ciclo');
  });

  it('shows the errors the last step got from the backend under their fields and then forgets them', async () => {
    const { root, form, profiles, settle } = await setup((api) => {
      api.academic = { codigo: 'U-DUP', carrera: 'Ingeniería de Software', ciclo: '5.º ciclo', distrito: '' };
      api.draftErrors = { codigoEstudiante: 'El código de estudiante ya está registrado', cicloAcademico: 'Ciclo inválido' };
    });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos guardar tus datos');
    expect(texto(root)).toContain('El código de estudiante ya está registrado');
    expect(texto(root)).toContain('Ciclo inválido');
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('U-DUP');
    expect(profiles.draftErrors).toEqual({});
    const el = root.querySelector<HTMLInputElement>('#codigo')!;
    el.value = 'U-LIBRE';
    el.dispatchEvent(new Event('input'));
    await settle();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(form.controls['codigo'].errors).toBeNull();
  });
});
