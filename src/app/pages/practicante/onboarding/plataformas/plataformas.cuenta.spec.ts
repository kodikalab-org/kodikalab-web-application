import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL, PractitionerProfile } from '../../../../core/api';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingPlataformas } from './plataformas';

const URL = 'http://localhost:8080/api/users/me';
const PENDING_MESSAGE =
  'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';
const PERFIL: PractitionerProfile = {
  email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
  codeforcesHandle: null, codeforcesRating: null, atcoderHandle: null, vjudgeHandle: null,
};

describe('OnboardingPlataformas (cuenta real)', () => {
  async function setup(conBorrador = true) {
    await TestBed.configureTestingModule({
      imports: [OnboardingPlataformas],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    if (conBorrador) {
      profiles.academic = { codigo: ' U202412345 ', carrera: ' Ingeniería de Software ', ciclo: '5.º ciclo', distrito: 'San Miguel' };
      profiles.competitive = { nivel: 'INTERMEDIO' };
    }
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OnboardingPlataformas);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const botones = () => [...root.querySelectorAll('button')];
    const finalizar = () => botones().find((b) => b.textContent?.includes('Guardar y finalizar'))!;
    const omitir = () => botones().find((b) => b.textContent?.includes('Omitir por ahora'))!;
    const type = async (id: string, value: string) => {
      const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      await settle();
    };
    return { fixture, root, profiles, http, navigate, settle, finalizar, omitir, type };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';
  const ok = (patch: Partial<PractitionerProfile> = {}, message = 'Perfil actualizado correctamente') =>
    ({ message, profile: { ...PERFIL, ...patch } });

  it('sends the trimmed draft, a numeric cycle and null for empty handles, without the district', async () => {
    const { http, navigate, finalizar, type, settle } = await setup();
    await type('codeforces', ' tourist ');
    await type('atcoder', '   ');
    finalizar().click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      codigoEstudiante: 'U202412345', carrera: 'Ingeniería de Software', cicloAcademico: 5,
      nivelCompetitivo: 'INTERMEDIO', codeforcesHandle: 'tourist', atcoderHandle: null, vjudgeHandle: null,
    });
    req.flush(ok({ codeforcesHandle: 'tourist', codeforcesRating: 3700 }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/completado'));
  });

  it('sends every handle as null when skipping', async () => {
    const { http, omitir, type, settle } = await setup();
    await type('codeforces', 'tourist');
    omitir().click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body).toMatchObject({ codeforcesHandle: null, atcoderHandle: null, vjudgeHandle: null });
    req.flush(ok());
  });

  it('parses cycle labels such as "10.º ciclo"', async () => {
    const { http, profiles, omitir, settle } = await setup();
    profiles.academic = { ...profiles.academic, ciclo: '10.º ciclo' };
    omitir().click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body.cicloAcademico).toBe(10);
    req.flush(ok({ cicloAcademico: 10 }));
  });

  it('goes back to the first step instead of sending an incomplete or invalid draft', async () => {
    const { http, navigate, profiles, omitir, settle } = await setup();
    profiles.academic = { ...profiles.academic, ciclo: '0.º ciclo' };
    omitir().click();
    await settle();
    http.expectNone(URL);
    expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/datos-academicos');
  });

  it('shows a specific message for handle length and format', async () => {
    const { root, finalizar, type } = await setup();
    await type('vjudge', 'a'.repeat(51));
    expect(texto(root)).toContain('Máximo 50 caracteres');
    expect(finalizar().disabled).toBe(true);
    await type('vjudge', 'ana vj');
    expect(texto(root)).toContain('Usa solo letras, números, punto, guion y guion bajo (máx. 50)');
    await type('vjudge', 'ana.vj');
    expect(finalizar().disabled).toBe(false);
  });

  it('shows handle errors under their input and lists errors of earlier steps with a link back', async () => {
    const { root, http, profiles, finalizar, type, settle } = await setup();
    await type('codeforces', 'tourist');
    finalizar().click();
    await settle();
    http.expectOne(URL).flush({ message: 'Datos inválidos', errors: {
      codeforcesHandle: 'Handle de Codeforces inválido', atcoderHandle: 'Handle de AtCoder inválido',
      codigoEstudiante: 'Código inválido', nivelCompetitivo: 'Nivel inválido',
    } }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => expect(texto(root)).toContain('Nivel inválido'));
    expect(texto(root)).toContain('Handle de Codeforces inválido');
    expect(texto(root)).toContain('Handle de AtCoder inválido');
    const enlaces = [...root.querySelectorAll('a')].filter((a) => a.textContent?.includes('Volver a'));
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/onboarding/practicante/datos-academicos', '/onboarding/practicante/perfil-competitivo',
    ]);
    expect(profiles.draftErrors).toEqual({ codigoEstudiante: 'Código inválido', nivelCompetitivo: 'Nivel inválido' });
    expect(root.querySelector<HTMLInputElement>('#codeforces')!.value).toBe('tourist');
    expect(profiles.profile()).toBeNull();
  });

  it('sends the student code conflict back to the first step keeping the backend message', async () => {
    const { root, http, profiles, finalizar, settle } = await setup();
    finalizar().click();
    await settle();
    http.expectOne(URL).flush({ message: 'El código de estudiante ya está registrado' }, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() => expect(texto(root)).toContain('El código de estudiante ya está registrado'));
    expect(texto(root)).toContain('Volver a Datos académicos');
    expect(profiles.draftErrors).toEqual({ codigoEstudiante: 'El código de estudiante ya está registrado' });
    expect(profiles.academic.codigo).toBe(' U202412345 ');
  });

  it('keeps what was typed and allows retrying after a server failure', async () => {
    const { root, http, profiles, finalizar, type, settle } = await setup();
    await type('atcoder', 'ana_ac');
    finalizar().click();
    await settle();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar con el servidor'));
    expect(root.querySelector<HTMLInputElement>('#atcoder')!.value).toBe('ana_ac');
    expect(profiles.profile()).toBeNull();
    expect(finalizar().disabled).toBe(false);
  });

  it('does not send twice while the first request is in flight', async () => {
    const { http, fixture, finalizar, settle } = await setup();
    const instancia = fixture.componentInstance as unknown as { guardar(omitir?: boolean): Promise<void> };
    finalizar().click();
    await settle();
    void instancia.guardar();
    void instancia.guardar(true);
    http.expectOne(URL).flush(ok());
  });

  it('leaves the Codeforces link pending when the backend does not confirm the handle', async () => {
    const { http, navigate, profiles, finalizar, type, settle } = await setup();
    await type('codeforces', 'nuevo_handle');
    finalizar().click();
    await settle();
    http.expectOne(URL).flush(ok({}, PENDING_MESSAGE));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/completado'));
    expect(profiles.pendingLink()).toMatchObject({ handle: 'nuevo_handle', notice: PENDING_MESSAGE });
    expect((profiles.profile() as PractitionerProfile).codeforcesHandle).toBeNull();
  });

  it('goes back to the first step when there is no draft', async () => {
    const { http, navigate, omitir, settle } = await setup(false);
    omitir().click();
    await settle();
    http.expectNone(URL);
    expect(navigate).toHaveBeenCalledWith('/onboarding/practicante/datos-academicos');
  });
});
