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

describe('OnboardingDatosAcademicos (sin estados de maqueta)', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingDatosAcademicos }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingDatosAcademicos);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('ignores ?estado= and always starts with empty fields and no errors', async () => {
    for (const estado of ['errores', 'duplicado']) {
      const root = await abrir(`?estado=${estado}`);
      expect(root.querySelectorAll('mat-error').length).toBe(0);
      expect(root.querySelector('[role="alert"]')).toBeNull();
      expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('');
      expect(root.textContent).not.toMatch(/20240001/);
      TestBed.resetTestingModule();
    }
  });
});
