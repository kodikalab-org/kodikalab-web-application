import { TestBed } from '@angular/core/testing';
import { Session } from '../../../core/session';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CoachPerfilEditar } from './perfil-editar';

describe('CoachPerfilEditar', () => {
  async function abrir(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'coach/perfil/editar', component: CoachPerfilEditar }])],
    }).compileComponents();
    TestBed.inject(Session).demo.set('COACH');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, CoachPerfilEditar);
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    await settle();
    const input = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const type = async (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
      input(id).dispatchEvent(new Event('blur'));
      await settle();
    };
    const guardar = () =>
      Array.from(root.querySelectorAll<HTMLElement>('form a, form button')).find((e) =>
        e.textContent?.includes('Guardar cambios'),
      )!;
    const step = (label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label} años de experiencia"]`)!;
    return { root, settle, input, type, guardar, step };
  }

  it('shows the form prefilled with the coach data and no errors', async () => {
    const { root, input } = await abrir('/coach/perfil/editar');
    expect(input('especialidad').value).toBe('Grafos y Programación Dinámica');
    expect(input('organizacion').value).toBe('Club de Programación Competitiva');
    expect(input('anios').value).toBe('4');
    expect(input('presentacion').value).toContain('Entrenador de maratones ICPC');
    expect(root.textContent).toContain('Los campos con * son obligatorios');
    expect(root.textContent).toContain('Texto libre, máximo 120 caracteres.');
    expect(root.textContent).toContain('95/500');
    expect(root.textContent).toContain(
      'Cuéntales a los practicantes quién eres y cómo entrenas. Opcional.',
    );
    expect(root.querySelectorAll('mat-error').length).toBe(0);
    expect(root.textContent).not.toContain('No pudimos guardar tus cambios');
  });

  it('links Cancelar and keeps saving as an explicit action, not an unverified success link', async () => {
    const { root, guardar } = await abrir('/coach/perfil/editar');
    expect(root.querySelector('a[href="/coach/perfil"]')).not.toBeNull();
    expect(guardar().tagName).toBe('BUTTON');
    expect(guardar().getAttribute('href')).toBeNull();
  });

  it('shows "Ingresa tu especialidad principal" when the specialty is empty', async () => {
    const { root, type, guardar } = await abrir('/coach/perfil/editar');
    await type('especialidad', '');
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu especialidad principal',
    );
    expect(guardar().tagName).toBe('BUTTON');
  });

  it('shows "Ingresa un valor entre 0 y 60" for 75 years', async () => {
    const { root, type } = await abrir('/coach/perfil/editar');
    await type('anios', '75');
    expect(root.textContent).toContain('Ingresa un valor entre 0 y 60');
  });

  it('steps the years between 0 and 60', async () => {
    const { input, step, settle, type } = await abrir('/coach/perfil/editar');
    step('Aumentar').click();
    await settle();
    expect(input('anios').value).toBe('5');
    await type('anios', '60');
    step('Aumentar').click();
    await settle();
    expect(input('anios').value).toBe('60');
    await type('anios', '0');
    step('Disminuir').click();
    await settle();
    expect(input('anios').value).toBe('0');
  });

  it('updates the presentation counter', async () => {
    const { root, type } = await abrir('/coach/perfil/editar');
    await type('presentacion', 'Hola');
    expect(root.textContent).toContain('4/500');
  });

  it('shows the notice and the errors when saving an invalid form', async () => {
    const { root, type, guardar, settle } = await abrir('/coach/perfil/editar');
    await type('especialidad', '');
    expect(root.textContent).not.toContain('No pudimos guardar tus cambios');
    guardar().click();
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos guardar tus cambios',
    );
    expect(root.textContent).toContain('Revisa los campos marcados e inténtalo de nuevo.');
  });

  it('opens with every error visible for ?estado=errores', async () => {
    const { root, input } = await abrir('/coach/perfil/editar?estado=errores');
    expect(input('especialidad').value).toBe('');
    expect(input('anios').value).toBe('75');
    expect(root.textContent).toContain('No pudimos guardar tus cambios');
    expect(root.textContent).toContain('Ingresa tu especialidad principal');
    expect(root.textContent).toContain('Ingresa un valor entre 0 y 60');
  });
});
