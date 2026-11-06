import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_URL, CoachProfile } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { CoachPerfilEditar } from './perfil-editar';

describe('CoachPerfilEditar (cuenta real)', () => {
  const URL = 'http://localhost:8080/api/users/me';
  const GUARDADO: CoachProfile = {
    email: 'marco@example.com', role: 'COACH', especialidadPrincipal: 'Grafos',
    organizacionClub: 'Club UPC', aniosExperiencia: 4, presentacion: 'Entreno equipos ICPC.',
  };

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [CoachPerfilEditar],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(GUARDADO);
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CoachPerfilEditar);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const guardar = () =>
      [...root.querySelectorAll<HTMLButtonElement>('form button')].find((b) =>
        b.textContent?.includes('Guardar cambios') || b.textContent?.includes('Guardando'))!;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      await settle();
    };
    const enviar = async () => { guardar().click(); await settle(); };
    return { fixture, root, form, profiles, http, navigate, guardar, type, enviar, settle };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';
  const ok = (patch: Partial<CoachProfile> = {}) => ({ message: 'Perfil actualizado correctamente', profile: { ...GUARDADO, ...patch } });

  it('loads the saved profile and shows the character counters', async () => {
    const { root } = await setup();
    expect(root.querySelector<HTMLInputElement>('#especialidad')!.value).toBe('Grafos');
    expect(root.querySelector<HTMLInputElement>('#organizacion')!.value).toBe('Club UPC');
    expect(root.querySelector<HTMLInputElement>('#anios')!.value).toBe('4');
    expect(texto(root)).toContain('8/150');
    expect(texto(root)).toContain('21/500');
  });

  it('updates the organization counter while typing', async () => {
    const { root, type } = await setup();
    await type('organizacion', 'Club');
    expect(texto(root)).toContain('4/150');
  });

  it('sends trimmed values and null for empty optional fields', async () => {
    const { http, navigate, type, enviar } = await setup();
    await type('especialidad', '  Programación dinámica ');
    await type('organizacion', '   ');
    await type('presentacion', '');
    await enviar();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      especialidadPrincipal: 'Programación dinámica', organizacionClub: null, aniosExperiencia: 4, presentacion: null,
    });
    req.flush(ok({ especialidadPrincipal: 'Programación dinámica', organizacionClub: null, presentacion: null }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/coach/perfil'], { queryParams: { estado: 'actualizado' } }));
  });

  it('rejects a blank specialty and one longer than 120 characters', async () => {
    const { root, type, form } = await setup();
    await type('especialidad', '   ');
    expect(texto(root)).toContain('Ingresa tu especialidad principal');
    await type('especialidad', 'E'.repeat(121));
    expect(texto(root)).toContain('La especialidad no puede superar los 120 caracteres');
    expect(form.invalid).toBe(true);
    await type('especialidad', 'E'.repeat(120));
    expect(form.valid).toBe(true);
  });

  it('rejects an organization over 150 and a presentation over 500 characters', async () => {
    const { root, type, form } = await setup();
    await type('organizacion', 'O'.repeat(151));
    await type('presentacion', 'P'.repeat(501));
    expect(texto(root)).toContain('La organización no puede superar los 150 caracteres');
    expect(texto(root)).toContain('La presentación no puede superar los 500 caracteres');
    expect(form.invalid).toBe(true);
    await type('organizacion', 'O'.repeat(150));
    await type('presentacion', 'P'.repeat(500));
    expect(form.valid).toBe(true);
  });

  it('accepts 0 and 60 years and rejects -1, 61, decimals and empty', async () => {
    const { root, form, type } = await setup();
    for (const valido of ['0', '60']) { await type('anios', valido); expect(form.valid).toBe(true); }
    for (const invalido of ['-1', '61', '']) { await type('anios', invalido); expect(form.invalid).toBe(true); }
    expect(texto(root)).toContain('Ingresa un valor entre 0 y 60');
    await type('anios', '2.5');
    expect(form.controls['anios'].hasError('integer')).toBe(true);
    expect(texto(root)).toContain('Los años de experiencia deben ser un número entero');
  });

  it('shows 400 field errors under their controls and keeps what was typed and the saved profile', async () => {
    const { root, http, profiles, form, enviar, type } = await setup();
    await type('especialidad', 'Nueva especialidad');
    await enviar();
    http.expectOne(URL).flush({ message: 'Datos inválidos', errors: {
      especialidadPrincipal: 'La especialidad es obligatoria', organizacionClub: 'Organización demasiado larga',
      aniosExperiencia: 'Los años deben estar entre 0 y 60', presentacion: 'Presentación demasiado larga', otro: 'Campo desconocido',
    } }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => expect(texto(root)).toContain('Campo desconocido'));
    for (const mensaje of ['La especialidad es obligatoria', 'Organización demasiado larga', 'Los años deben estar entre 0 y 60', 'Presentación demasiado larga']) {
      expect(texto(root)).toContain(mensaje);
    }
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos guardar tus cambios');
    expect(root.querySelector<HTMLInputElement>('#especialidad')!.value).toBe('Nueva especialidad');
    expect((profiles.profile() as CoachProfile).especialidadPrincipal).toBe('Grafos');
    expect(form.invalid).toBe(true);
    await type('especialidad', 'Otra');
    expect(texto(root)).not.toContain('La especialidad es obligatoria');
  });

  it('keeps the form and the saved profile when the server fails', async () => {
    const { root, http, profiles, guardar, enviar, type, settle } = await setup();
    const antes = profiles.profile();
    await type('organizacion', 'Otro club');
    await enviar();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('p[role="alert"]')?.textContent).toContain('No pudimos conectar con el servidor'));
    expect(root.querySelector<HTMLInputElement>('#organizacion')!.value).toBe('Otro club');
    expect(profiles.profile()).toBe(antes);
    await settle();
    expect(guardar().disabled).toBe(false);
  });

  it('does not send twice while the first request is in flight', async () => {
    const { http, fixture, guardar, enviar } = await setup();
    await enviar();
    expect(guardar().disabled).toBe(true);
    void (fixture.componentInstance as unknown as { guardar(): Promise<void> }).guardar();
    http.expectOne(URL).flush(ok());
  });
});
