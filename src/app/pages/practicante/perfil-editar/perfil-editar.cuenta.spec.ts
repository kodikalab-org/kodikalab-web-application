import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_URL, PractitionerProfile } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { PerfilEditar } from './perfil-editar';

describe('PerfilEditar (cuenta real)', () => {
  const URL = 'http://localhost:8080/api/users/me';
  const PENDING_MESSAGE =
    'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';
  const GUARDADO: PractitionerProfile = {
    email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
    carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
    codeforcesHandle: 'ana_cf', codeforcesRating: 1432, atcoderHandle: null, vjudgeHandle: 'ana_vj',
  };

  async function setup(guardado: PractitionerProfile = GUARDADO) {
    await TestBed.configureTestingModule({
      imports: [PerfilEditar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(guardado);
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PerfilEditar);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const guardar = () =>
      [...root.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Guardar cambios') || b.textContent?.includes('Guardando')) as HTMLButtonElement;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
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
  const respuesta = (patch: Partial<PractitionerProfile> = {}, message = 'Perfil actualizado correctamente') =>
    ({ message, profile: { ...GUARDADO, ...patch } });

  it('loads the saved profile, parses the cycle and disables the fields the backend does not have', async () => {
    const { root, form } = await setup();
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('U202412345');
    expect(form.getRawValue()).toMatchObject({ carrera: 'Ingeniería de Software', ciclo: '5.º ciclo', nivel: 'INTERMEDIO' });
    expect(root.querySelector<HTMLInputElement>('#handle-codeforces')!.value).toBe('ana_cf');
    expect(root.querySelector<HTMLInputElement>('#handle-atcoder')!.value).toBe('');
    for (const campo of ['distrito', 'experiencia', 'franja', 'dias', 'objetivo']) expect(form.get(campo)!.disabled).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#experiencia')!.disabled).toBe(true);
    expect(texto(root)).toContain('aún no se guardan en tu cuenta');
  });

  it('sends trimmed values, a numeric cycle and null for empty handles, without unsupported fields', async () => {
    const { http, navigate, type, enviar, form } = await setup();
    await type('codigo', '  U20250001  ');
    await type('handle-codeforces', '   ');
    await type('handle-atcoder', ' ana.ac ');
    form.get('carrera')!.setValue('  Ciencias de la Computación ');
    await enviar();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      codigoEstudiante: 'U20250001', carrera: 'Ciencias de la Computación', cicloAcademico: 5,
      nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: null, atcoderHandle: 'ana.ac', vjudgeHandle: 'ana_vj',
    });
    req.flush(respuesta({ codigoEstudiante: 'U20250001' }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/perfil'], { queryParams: { estado: 'actualizado' } }));
  });

  it('rejects a whitespace-only student code and one longer than 20 characters', async () => {
    const { root, guardar, type } = await setup();
    await type('codigo', '    ');
    expect(guardar().disabled).toBe(true);
    expect(texto(root)).toContain('Ingresa tu código de estudiante');
    await type('codigo', 'A'.repeat(21));
    expect(guardar().disabled).toBe(true);
    expect(texto(root)).toContain('El código no puede superar los 20 caracteres');
    await type('codigo', 'A'.repeat(20));
    expect(guardar().disabled).toBe(false);
  });

  it('requires the career (not blank, at most 100 characters)', async () => {
    const { root, form, guardar, settle } = await setup();
    const casos = [['', 'Selecciona tu carrera'], ['   ', 'Selecciona tu carrera'], ['C'.repeat(101), 'La carrera no puede superar los 100 caracteres']];
    for (const [valor, mensaje] of casos) {
      form.get('carrera')!.setValue(valor);
      form.get('carrera')!.markAsTouched();
      await settle();
      expect(guardar().disabled).toBe(true);
      expect(texto(root)).toContain(mensaje);
    }
  });

  it('requires a whole academic cycle >= 1', async () => {
    const { root, form, guardar, settle } = await setup();
    for (const valor of ['', '0.º ciclo', '-1', '2.5', 'primero']) {
      form.get('ciclo')!.setValue(valor);
      form.get('ciclo')!.markAsTouched();
      await settle();
      expect(guardar().disabled).toBe(true);
    }
    expect(texto(root)).toContain('El ciclo debe ser un número entero mayor o igual a 1');
    form.get('ciclo')!.setValue('1.º ciclo');
    await settle();
    expect(guardar().disabled).toBe(false);
  });

  it('only accepts the three competitive levels', async () => {
    const { root, form, guardar, settle } = await setup();
    form.get('nivel')!.setValue('EXPERTO');
    form.get('nivel')!.markAsTouched();
    await settle();
    expect(guardar().disabled).toBe(true);
    expect(texto(root)).toContain('El nivel debe ser Principiante, Intermedio o Avanzado');
    form.get('nivel')!.setValue(null);
    await settle();
    expect(texto(root)).toContain('Selecciona tu nivel competitivo');
    form.get('nivel')!.setValue('AVANZADO');
    await settle();
    expect(guardar().disabled).toBe(false);
  });

  it('shows a specific message for the handle length and format rules', async () => {
    const { root, type, guardar } = await setup();
    await type('handle-vjudge', 'a'.repeat(51));
    expect(texto(root)).toContain('Máximo 50 caracteres');
    expect(guardar().disabled).toBe(true);
    await type('handle-vjudge', 'ana vj');
    expect(texto(root)).toContain('Usa solo letras, números, punto, guion y guion bajo (máx. 50)');
  });

  it('shows 400 field errors under their controls, keeps what was typed and the saved profile', async () => {
    const { root, http, profiles, form, guardar, enviar, type } = await setup();
    await type('codigo', 'U-NUEVO');
    await enviar();
    http.expectOne(URL).flush({ message: 'Datos inválidos', errors: {
      codigoEstudiante: 'El código no es válido', carrera: 'La carrera es obligatoria',
      cicloAcademico: 'El ciclo debe ser mayor o igual a 1', nivelCompetitivo: 'Nivel inválido',
      codeforcesHandle: 'Handle de Codeforces inválido', atcoderHandle: 'Handle de AtCoder inválido',
      vjudgeHandle: 'Handle de VJudge inválido', distrito: 'Campo sin control',
    } }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => expect(form.get('codigo')!.hasError('server')).toBe(true));
    await vi.waitFor(() => expect(texto(root)).toContain('Campo sin control'));
    const contenido = texto(root);
    for (const mensaje of ['El código no es válido', 'La carrera es obligatoria', 'El ciclo debe ser mayor o igual a 1', 'Nivel inválido',
      'Handle de Codeforces inválido', 'Handle de AtCoder inválido', 'Handle de VJudge inválido']) {
      expect(contenido).toContain(mensaje);
    }
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Tus datos guardados no se modificaron');
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('U-NUEVO');
    expect((profiles.profile() as PractitionerProfile).codigoEstudiante).toBe('U202412345');
    expect(guardar().disabled).toBe(true);
    await type('codigo', 'U-OTRO');
    expect(texto(root)).not.toContain('El código no es válido');
  });

  it('shows the 409 conflict under the student code with the backend message', async () => {
    const { root, http, profiles, enviar, type } = await setup();
    await type('codigo', 'U-OCUPADO');
    await enviar();
    http.expectOne(URL).flush({ message: 'El código de estudiante ya está registrado' }, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() => expect(root.querySelector('mat-error')?.textContent).toContain('El código de estudiante ya está registrado'));
    expect(root.querySelector<HTMLInputElement>('#codigo')!.value).toBe('U-OCUPADO');
    expect((profiles.profile() as PractitionerProfile).codigoEstudiante).toBe('U202412345');
    await type('codigo', 'U-LIBRE');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('uses a default message for a 409 without a body message', async () => {
    const { root, http, enviar } = await setup();
    await enviar();
    http.expectOne(URL).flush({}, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() => expect(texto(root)).toContain('Este código de estudiante ya está vinculado a otro practicante'));
  });

  it('keeps the form and the saved profile when the server fails', async () => {
    const { root, http, profiles, guardar, enviar, type, settle } = await setup();
    const antes = profiles.profile();
    await type('handle-atcoder', 'ana_ac');
    await enviar();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('p[role="alert"]')?.textContent).toContain('No pudimos conectar con el servidor'));
    expect(root.querySelector<HTMLInputElement>('#handle-atcoder')!.value).toBe('ana_ac');
    expect(profiles.profile()).toBe(antes);
    await settle();
    expect(guardar().disabled).toBe(false);
  });

  it('does not send twice while the first request is in flight', async () => {
    const { http, guardar, enviar, fixture } = await setup();
    const instancia = fixture.componentInstance as unknown as { guardar(): Promise<void> };
    await enviar();
    expect(guardar().disabled).toBe(true);
    void instancia.guardar();
    const req = http.expectOne(URL);
    req.flush(respuesta());
  });

  it('marks the Codeforces link as pending when the backend does not confirm the handle and lets retry it', async () => {
    const { root, http, profiles, type, enviar, settle, navigate } = await setup();
    await type('handle-codeforces', 'ana_nuevo');
    await enviar();
    http.expectOne(URL).flush(respuesta({}, PENDING_MESSAGE));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(profiles.pendingLink()).toMatchObject({ handle: 'ana_nuevo', notice: PENDING_MESSAGE });
    await settle();
    expect(texto(root)).toContain('Pendiente');
    expect(texto(root)).toContain('Vinculación pendiente');
    expect(texto(root)).toContain('Codeforces no confirmó el identificador informado');
    const reintentar = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!;
    reintentar.click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body.codeforcesHandle).toBe('ana_nuevo');
    req.flush(respuesta({ codeforcesHandle: 'ana_nuevo', codeforcesRating: 1500 }));
    await vi.waitFor(() => expect(profiles.pendingLink()).toBeNull());
    await settle();
    expect(texto(root)).toContain('Vinculación confirmada');
    expect(texto(root)).not.toContain('Reintentar vinculación');
  });
});
