import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { OnboardingPlataformas } from './plataformas';

describe('OnboardingPlataformas', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingPlataformas],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingPlataformas);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const save = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { root, save, type };
  }

  it('shows step 3 of 3 with the three platforms and an enabled save button', async () => {
    const { root, save } = await setup();
    expect(root.textContent).toContain('PASO 3 DE 3');
    expect(root.querySelectorAll('input').length).toBe(3);
    expect(save().disabled).toBe(false);
  });

  it('disables saving and shows the format error for an invalid username', async () => {
    const { root, save, type } = await setup();
    await type('codeforces', 'camila rojas!');
    expect(save().disabled).toBe(true);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Usa solo letras, números, punto, guion y guion bajo (máx. 50)',
    );
  });

  it('accepts letters, numbers, dots, hyphens and underscores', async () => {
    const { root, save, type } = await setup();
    await type('atcoder', 'camila_r-1.x');
    expect(save().disabled).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('OnboardingPlataformas (estados con ?estado=)', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingPlataformas }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingPlataformas);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { root, settle };
  }

  it('shows the format error for ?estado=error-formato', async () => {
    const { root } = await abrir('?estado=error-formato');
    expect(root.querySelector<HTMLInputElement>('#codeforces')!.value).toBe('camila rojas!');
    expect(root.querySelector<HTMLInputElement>('#atcoder')!.value).toBe('camila_r');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Usa solo letras, números, punto, guion y guion bajo (máx. 50)',
    );
    expect(root.querySelectorAll('[role="alert"]').length).toBe(1);
  });

  it('shows the saving state for ?estado=guardando', async () => {
    const { root } = await abrir('?estado=guardando');
    const busy = root.querySelector<HTMLButtonElement>('button[aria-busy="true"]')!;
    expect(busy.textContent).toContain('Guardando perfil…');
    expect(busy.disabled).toBe(true);
    expect(root.textContent).not.toContain('Omitir por ahora');
    expect(root.querySelector<HTMLInputElement>('#vjudge')!.value).toBe('camila_vj');
    expect(root.querySelector<HTMLInputElement>('#vjudge')!.readOnly).toBe(true);
  });
});
