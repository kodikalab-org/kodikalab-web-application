import { TestBed } from '@angular/core/testing';
import { Session } from '../../../../core/session';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { OnboardingPerfilCompetitivo } from './perfil-competitivo';

describe('OnboardingPerfilCompetitivo', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [OnboardingPerfilCompetitivo],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('PRACTICANTE');
    const fixture = TestBed.createComponent(OnboardingPerfilCompetitivo);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const next = () => root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    const levelButtons = () =>
      Array.from(root.querySelectorAll<HTMLButtonElement>('.onb-level button'));
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { root, next, levelButtons, settle };
  }

  it('shows step 2 of 3 with the three levels and Continuar disabled', async () => {
    const { root, next, levelButtons } = await setup();
    expect(root.textContent).toContain('PASO 2 DE 3');
    expect(levelButtons().length).toBe(3);
    expect(next().disabled).toBe(true);
  });

  it('shows the level error only after touching the group without a choice', async () => {
    const { root, levelButtons, settle } = await setup();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    levelButtons()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona tu nivel competitivo',
    );
  });

  it('enables Continuar once a level is selected', async () => {
    const { next, levelButtons, settle } = await setup();
    levelButtons()[1].click();
    await settle();
    expect(next().disabled).toBe(false);
  });
});

describe('OnboardingPerfilCompetitivo (estados con ?estado=)', () => {
  async function abrir(consulta: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'pantalla', component: OnboardingPerfilCompetitivo }])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('PRACTICANTE');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla' + consulta, OnboardingPerfilCompetitivo);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { root, settle };
  }

  it('keeps completed steps readable only for screen readers', async () => {
    const { root } = await abrir('');
    const hidden = root.querySelector('ol li .sr-only');
    expect(hidden?.textContent).toBe(' (completado)');
    const label = root.querySelector('ol li > span:last-child')!;
    expect(label.textContent).toContain('Datos académicos');
    expect(root.querySelector('ol [aria-current="step"]')?.textContent).toContain(
      'Perfil competitivo',
    );
  });

  it('preloads every value of the Figma frame for ?estado=completo', async () => {
    const { root } = await abrir('?estado=completo');
    expect(root.querySelector('.onb-level .mat-button-toggle-checked')?.textContent).toContain(
      'Intermedio',
    );
    expect(root.querySelector<HTMLInputElement>('#experiencia')!.value).toBe('12');
    const selected = Array.from(root.querySelectorAll('mat-chip-option.mat-mdc-chip-selected')).map(
      (chip) => chip.textContent?.trim(),
    );
    expect(selected).toEqual(['Noche', 'Mié', 'Vie']);
    expect(root.querySelector('mat-radio-button.mat-mdc-radio-checked')?.textContent).toContain(
      'Clasificar a competencias',
    );
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the level error with the rest filled for ?estado=nivel-sin-seleccionar', async () => {
    const { root } = await abrir('?estado=nivel-sin-seleccionar');
    expect(root.querySelector('.onb-level .mat-button-toggle-checked')).toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona tu nivel competitivo',
    );
    expect(root.querySelector<HTMLInputElement>('#experiencia')!.value).toBe('12');
  });
});
