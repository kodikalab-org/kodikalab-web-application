import { TestBed } from '@angular/core/testing';
import { Session } from '../../../core/session';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PerfilEditar } from './perfil-editar';

describe('PerfilEditar', () => {
  async function setup(params: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [PerfilEditar],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
      ],
    }).compileComponents();
    TestBed.inject(Session).demo.set('PRACTICANTE');
    const fixture = TestBed.createComponent(PerfilEditar);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const guardar = () =>
      [...root.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Guardar cambios'),
      ) as HTMLButtonElement;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, root, guardar, type };
  }

  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('loads the current profile data into the form', async () => {
    const { root, guardar } = await setup();
    expect(
      root.querySelector('nav[aria-label="Vista del perfil"] a[aria-current="page"]')?.textContent,
    ).toContain('Editar perfil');
    expect(texto(root)).toContain('Los campos con * son obligatorios');
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('20240001');
    expect(texto(root)).toContain('Ingeniería de Software');
    expect(texto(root)).toContain('5.º ciclo');
    expect(texto(root)).toContain('San Miguel');
    expect(root.querySelector<HTMLInputElement>('#experiencia')!.value).toBe('12');
    expect(root.querySelector<HTMLInputElement>('#handle-codeforces')!.value).toBe('_matjavi_');
    expect(root.querySelector<HTMLInputElement>('#handle-atcoder')!.value).toBe('matjavi');
    expect(root.querySelector<HTMLInputElement>('#handle-vjudge')!.value).toBe('matjavi');
    expect(root.querySelector('section#plataformas')).not.toBeNull();
    expect(guardar().disabled).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('preselects level, time slot, days and goal', async () => {
    const { root } = await setup();
    expect(root.querySelector('mat-button-toggle.mat-button-toggle-checked')?.textContent).toContain(
      'Intermedio',
    );
    const seleccionados = [...root.querySelectorAll('mat-chip-option.mat-mdc-chip-selected')].map(
      (chip) => chip.textContent?.trim(),
    );
    expect(seleccionados).toEqual(['Noche', 'Mié', 'Vie']);
    expect(root.querySelector('mat-radio-button.mat-mdc-radio-checked')?.textContent).toContain(
      'Clasificar a competencias',
    );
  });

  it('requires the student code and disables saving without it', async () => {
    const { root, guardar, type } = await setup();
    await type('codigo', '');
    expect(guardar().disabled).toBe(true);
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu código de estudiante',
    );
  });

  it('limits the student code to 20 characters', async () => {
    const { root, guardar, type } = await setup();
    expect(root.querySelector('#codigo')?.getAttribute('maxlength')).toBe('20');
    await type('codigo', '12345678901234567890');
    expect(guardar().disabled).toBe(false);
  });

  it('accepts only letters, numbers, dot, hyphen and underscore in handles', async () => {
    const { root, guardar, type } = await setup();
    await type('handle-atcoder', 'camila_r-1.x');
    expect(guardar().disabled).toBe(false);
    await type('handle-atcoder', 'camila rojas!');
    expect(guardar().disabled).toBe(true);
    expect(texto(root)).toContain('Usa solo letras, números, punto, guion y guion bajo (máx. 50)');
    await type('handle-atcoder', '');
    expect(guardar().disabled).toBe(false);
  });

  it('rejects handles longer than 50 characters', async () => {
    const { guardar, type } = await setup();
    await type('handle-vjudge', 'a'.repeat(51));
    expect(guardar().disabled).toBe(true);
  });

  it('shows the 409 conflict and keeps what was typed (?estado=errores)', async () => {
    const { root, guardar } = await setup({ estado: 'errores' });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos guardar tus cambios',
    );
    expect(texto(root)).toContain('Revisa los campos marcados e inténtalo de nuevo.');
    expect(texto(root)).toContain('Este código de estudiante ya está vinculado a otro practicante');
    expect(texto(root)).toContain('Usa solo letras, números, punto, guion y guion bajo (máx. 50)');
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('20240001');
    expect(root.querySelector<HTMLInputElement>('#handle-codeforces')!.value).toBe('_matjavi_');
    expect(guardar().disabled).toBe(true);
  });

  it('clears the errors once the rejected values change', async () => {
    const { root, guardar, type } = await setup({ estado: 'errores' });
    await type('codigo', '20240002');
    expect(texto(root)).not.toContain('ya está vinculado a otro practicante');
    await type('handle-codeforces', 'matjavi');
    expect(guardar().disabled).toBe(false);
  });

  it('links Cancel to the profile and the plain editor shows no error banner', async () => {
    const { root } = await setup();
    const cancelar = [...root.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Cancelar'),
    );
    expect(cancelar?.getAttribute('href')).toBe('/perfil');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
