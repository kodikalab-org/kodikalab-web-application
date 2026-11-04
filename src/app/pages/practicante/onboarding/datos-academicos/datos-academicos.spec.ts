import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { OnboardingDatosAcademicos } from './datos-academicos';

describe('OnboardingDatosAcademicos', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingDatosAcademicos],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingDatosAcademicos);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const next = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const codigo = () => root.querySelector<HTMLInputElement>('#codigo')!;
    return { fixture, root, next, codigo };
  }

  it('shows step 1 of 3 with Continuar disabled and no errors', async () => {
    const { root, next } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('Cuéntanos sobre ti');
    expect(root.textContent).toContain('PASO 1 DE 3');
    expect(next().disabled).toBe(true);
    expect(root.querySelectorAll('mat-error').length).toBe(0);
  });

  it('shows the required error for the student code after touching it', async () => {
    const { fixture, root, codigo } = await setup();
    codigo().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu código de estudiante',
    );
  });

  it('keeps Continuar disabled until career and cycle are also chosen', async () => {
    const { fixture, next, codigo } = await setup();
    codigo().value = '20240001';
    codigo().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(next().disabled).toBe(true);
  });
});

describe('OnboardingDatosAcademicos (estados con ?estado=)', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingDatosAcademicos }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingDatosAcademicos);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { root, settle };
  }

  it('shows the required errors without typing for ?estado=errores', async () => {
    const { root } = await abrir('?estado=errores');
    const errors = Array.from(root.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(errors.length).toBe(3);
    expect(errors.join('|')).toContain('Ingresa tu código de estudiante');
    expect(errors.join('|')).toContain('Selecciona tu carrera');
    expect(errors.join('|')).toContain('Selecciona tu ciclo académico');
  });

  it('shows the 409 banner and error for ?estado=duplicado and keeps the other data', async () => {
    const { root } = await abrir('?estado=duplicado');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos guardar tus datos',
    );
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Revisa el código de estudiante e inténtalo de nuevo.',
    );
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Este código de estudiante ya está vinculado a otro practicante',
    );
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('20240001');
    expect(root.textContent).toContain('Ingeniería de Software');
    expect(root.textContent).toContain('5.º ciclo');
    expect(root.textContent).toContain('San Miguel');
  });

  it('clears the 409 error when another code is typed', async () => {
    const { root, settle } = await abrir('?estado=duplicado');
    const input = root.querySelector<HTMLInputElement>('#codigo')!;
    input.value = '20240002';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('mat-error')).toBeNull();
  });

  it('renders the default state when ?estado= is unknown', async () => {
    const { root } = await abrir('?estado=otro');
    expect(root.querySelectorAll('mat-error').length).toBe(0);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
