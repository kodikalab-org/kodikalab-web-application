import { TestBed } from '@angular/core/testing';
import { Session } from '../../../../core/session';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { OnboardingExperiencia } from './experiencia';

describe('OnboardingExperiencia', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingExperiencia],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('COACH');
    const fixture = TestBed.createComponent(OnboardingExperiencia);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const next = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const input = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const step = (label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label} años de experiencia"]`)!;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const type = async (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
      input(id).dispatchEvent(new Event('blur'));
      await settle();
    };
    return { root, next, input, step, settle, type };
  }

  it('shows step 1 of 2 with Continuar disabled and no errors', async () => {
    const { root, next } = await setup();
    expect(root.textContent).toContain('PASO 1 DE 2');
    expect(next().disabled).toBe(true);
    expect(root.querySelectorAll('mat-error').length).toBe(0);
  });

  it('requires the specialty and shows its error after touching it', async () => {
    const { root, input, settle } = await setup();
    input('especialidad').dispatchEvent(new Event('blur'));
    await settle();
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu especialidad principal',
    );
  });

  it('steps the years between 0 and 60 and enables Continuar with a specialty', async () => {
    const { next, input, step, settle, type } = await setup();
    step('Disminuir').click();
    await settle();
    expect(input('anios').value).toBe('0');
    step('Aumentar').click();
    await settle();
    expect(input('anios').value).toBe('1');
    await type('especialidad', 'Grafos');
    expect(next().disabled).toBe(false);
  });

  it('shows the years error for a value above 60', async () => {
    const { root, next, type } = await setup();
    await type('especialidad', 'Grafos');
    await type('anios', '61');
    expect(next().disabled).toBe(true);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Ingresa un valor entre 0 y 60',
    );
  });
});

describe('OnboardingExperiencia (estados con ?estado=)', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingExperiencia }])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('COACH');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingExperiencia);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { root, settle };
  }

  it('shows both required errors without typing for ?estado=errores', async () => {
    const { root } = await abrir('?estado=errores');
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu especialidad principal',
    );
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Ingresa un valor entre 0 y 60',
    );
  });

  it('preloads the Figma values for ?estado=completa and enables Continuar', async () => {
    const { root } = await abrir('?estado=completa');
    expect(root.querySelector<HTMLInputElement>('#especialidad')!.value).toBe(
      'Grafos y Programación Dinámica',
    );
    expect(root.querySelector<HTMLInputElement>('#organizacion')!.value).toBe(
      'Club de Programación Competitiva',
    );
    expect(root.querySelector<HTMLInputElement>('#anios')!.value).toBe('4');
    const selected = Array.from(root.querySelectorAll('mat-chip-option.mat-mdc-chip-selected')).map(
      (chip) => chip.textContent?.trim(),
    );
    expect(selected).toEqual(['Grafos', 'Programación dinámica']);
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(false);
    expect(root.querySelectorAll('mat-error').length).toBe(0);
  });
});
