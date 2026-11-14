import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { throwError } from 'rxjs';
import { ProfileApi } from '../../../core/profile-api';
import { Session } from '../../../core/session';
import { signIn } from '../../../testing/sign-in';
import { CoachPerfilEditar } from './perfil-editar';

const PERFIL = { especialidadPrincipal: 'Grafos y Programación Dinámica', organizacionClub: 'Club de pruebas',
  aniosExperiencia: 4, presentacion: 'Entrenador de maratones ICPC. Trabajo con grafos.' };

describe('CoachPerfilEditar', () => {
  async function abrir(url = '/coach/perfil/editar', profile: Record<string, unknown> | null = PERFIL) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'coach/perfil/editar', component: CoachPerfilEditar }])],
    }).compileComponents();
    if (profile) signIn('COACH', profile);
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
    return { root, settle, input, type, guardar, step, harness };
  }
  afterEach(() => TestBed.inject(Session).logout());

  it('fills the form from the profile loaded from the API, with no errors', async () => {
    const { root, input } = await abrir();
    expect(input('especialidad').value).toBe('Grafos y Programación Dinámica');
    expect(input('organizacion').value).toBe('Club de pruebas');
    expect(input('anios').value).toBe('4');
    expect(input('presentacion').value).toContain('Entrenador de maratones ICPC');
    expect(root.textContent).toContain('Los campos con * son obligatorios');
    expect(root.textContent).toContain('Texto libre, máximo 120 caracteres.');
    expect(root.querySelectorAll('mat-error').length).toBe(0);
    expect(root.textContent).not.toContain('No pudimos guardar tus cambios');
  });

  it('starts with empty controls when there is no profile yet', async () => {
    const { input } = await abrir('/coach/perfil/editar', null);
    expect(input('especialidad').value).toBe('');
    expect(input('organizacion').value).toBe('');
    expect(input('anios').value).toBe('');
    expect(input('presentacion').value).toBe('');
  });

  it('links Cancelar and keeps saving as an explicit action, not an unverified success link', async () => {
    const { root, guardar } = await abrir();
    expect(root.querySelector('a[href="/coach/perfil"]')).not.toBeNull();
    expect(guardar().tagName).toBe('BUTTON');
    expect(guardar().getAttribute('href')).toBeNull();
  });

  it('shows "Ingresa tu especialidad principal" when the specialty is empty', async () => {
    const { root, type } = await abrir();
    await type('especialidad', '');
    expect(root.querySelector('mat-error')?.textContent).toContain(
      'Ingresa tu especialidad principal',
    );
  });

  it('shows "Ingresa un valor entre 0 y 60" for 75 years', async () => {
    const { root, type } = await abrir();
    await type('anios', '75');
    expect(root.textContent).toContain('Ingresa un valor entre 0 y 60');
  });

  it('steps the years between 0 and 60', async () => {
    const { input, step, settle, type } = await abrir();
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
    const { root, type } = await abrir();
    await type('presentacion', 'Hola');
    expect(root.textContent).toContain('4/500');
  });

  it('shows the notice and the errors when saving an invalid form', async () => {
    const { root, type, guardar, settle } = await abrir();
    await type('especialidad', '');
    expect(root.textContent).not.toContain('No pudimos guardar tus cambios');
    guardar().click();
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos guardar tus cambios',
    );
    expect(root.textContent).toContain('Revisa los campos marcados e inténtalo de nuevo.');
  });

  it('shows the API error when saving fails', async () => {
    const { harness } = await abrir();
    vi.spyOn(TestBed.inject(ProfileApi), 'save').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Especialidad inválida' } })),
    );
    const pantalla = harness.routeDebugElement!.componentInstance as { guardar(): Promise<void>; error: string };
    await pantalla.guardar();
    expect(pantalla.error).toContain('Especialidad inválida');
  });
});
