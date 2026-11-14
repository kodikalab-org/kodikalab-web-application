import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
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
    expect(root.querySelector('mat-toolbar.sticky.top-0.z-40.backdrop-blur-xl')).not.toBeNull();
    expect(root.querySelector('mat-toolbar')!.closest('.overflow-hidden')).toBeNull();
    expect(root.querySelectorAll('input').length).toBe(3);
    expect(root.querySelector<HTMLInputElement>('#codeforces')!.disabled).toBe(false);
    expect(root.querySelector<HTMLInputElement>('#atcoder')!.disabled).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#vjudge')!.disabled).toBe(true);
    expect(root.textContent?.match(/En mantenimiento/g)?.length).toBe(2);
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

describe('OnboardingPlataformas (guardado real)', () => {
  it('shows the saving state while the API request is in flight', async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPlataformas],
      providers: [provideRouter([])],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.academic = { codigo: '123', carrera: 'Ingeniería de Software', ciclo: '5.º ciclo', distrito: '' };
    profiles.competitive = { nivel: 'INTERMEDIO' };
    const request = new Subject<never>();
    vi.spyOn(profiles, 'save').mockReturnValue(request as never);
    const fixture = TestBed.createComponent(OnboardingPlataformas);
    await fixture.whenStable();
    void (fixture.componentInstance as unknown as { guardar(): Promise<void> }).guardar();
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const busy = root.querySelector<HTMLButtonElement>('button[aria-busy="true"]')!;
    expect(busy.textContent).toContain('Guardando perfil…');
    expect(busy.disabled).toBe(true);
    expect(root.textContent).not.toContain('Omitir por ahora');
  });

  it('starts with empty usernames', async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPlataformas],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingPlataformas);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLInputElement>('#codeforces')!.value).toBe('');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
