import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL, CoachProfile } from '../../../../core/api';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingPresentacion } from './presentacion';

const URL = 'http://localhost:8080/api/users/me';
const PERFIL: CoachProfile = {
  email: 'marco@example.com', role: 'COACH', especialidadPrincipal: 'Grafos',
  organizacionClub: null, aniosExperiencia: 4, presentacion: null,
};

describe('OnboardingPresentacion (cuenta real)', () => {
  async function setup(conBorrador = true) {
    await TestBed.configureTestingModule({
      imports: [OnboardingPresentacion],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    if (conBorrador) profiles.coach = { especialidad: ' Grafos ', organizacion: '  ', anios: 4 };
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OnboardingPresentacion);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const botones = () => [...root.querySelectorAll('button')];
    const finalizar = () => botones().find((b) => b.textContent?.includes('Guardar y finalizar'))!;
    const omitir = () => botones().find((b) => b.textContent?.includes('Omitir por ahora'))!;
    const type = async (value: string) => {
      const el = root.querySelector<HTMLTextAreaElement>('#presentacion')!;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      await settle();
    };
    return { fixture, root, profiles, http, navigate, settle, finalizar, omitir, type };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('previews the first-step draft instead of the sample coach', async () => {
    const { root } = await setup();
    expect(texto(root)).toContain('Coach · Grafos · 4 años');
    expect(texto(root)).not.toContain('Club de Programación Competitiva');
  });

  it('limits the presentation to 500 characters', async () => {
    const { root, finalizar, type } = await setup();
    await type('P'.repeat(501));
    expect(texto(root)).toContain('La presentación no puede superar los 500 caracteres');
    expect(finalizar().disabled).toBe(true);
    await type('P'.repeat(500));
    expect(finalizar().disabled).toBe(false);
  });

  it('sends the trimmed draft and the presentation, with null for empty optional text', async () => {
    const { http, navigate, finalizar, type, settle } = await setup();
    await type('  Entreno equipos ICPC. ');
    finalizar().click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      especialidadPrincipal: 'Grafos', organizacionClub: null, aniosExperiencia: 4, presentacion: 'Entreno equipos ICPC.',
    });
    req.flush({ message: 'Perfil actualizado correctamente', profile: { ...PERFIL, presentacion: 'Entreno equipos ICPC.' } });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/onboarding/coach/completado'));
  });

  it('sends a null presentation when blank or skipped', async () => {
    const { http, omitir, type, settle } = await setup();
    await type('Texto que se omite');
    omitir().click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body.presentacion).toBeNull();
    req.flush({ message: 'ok', profile: PERFIL });
  });

  it('goes back to the first step when the draft is incomplete', async () => {
    const { http, navigate, omitir, settle } = await setup(false);
    omitir().click();
    await settle();
    http.expectNone(URL);
    expect(navigate).toHaveBeenCalledWith('/onboarding/coach/experiencia');
  });

  it('shows the presentation error under its input and lists first-step errors with a link back', async () => {
    const { root, http, profiles, finalizar, type, settle } = await setup();
    await type('Hola');
    finalizar().click();
    await settle();
    http.expectOne(URL).flush({ message: 'Datos inválidos', errors: {
      presentacion: 'Presentación inválida', especialidadPrincipal: 'Especialidad inválida', aniosExperiencia: 'Años inválidos',
    } }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => expect(texto(root)).toContain('Especialidad inválida'));
    expect(texto(root)).toContain('Presentación inválida');
    expect(texto(root)).toContain('Años inválidos');
    const enlace = [...root.querySelectorAll('a')].find((a) => a.textContent?.includes('Volver a'))!;
    expect(enlace.getAttribute('href')).toBe('/onboarding/coach/experiencia');
    expect(profiles.draftErrors).toEqual({ especialidadPrincipal: 'Especialidad inválida', aniosExperiencia: 'Años inválidos' });
    expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.value).toBe('Hola');
    expect(profiles.profile()).toBeNull();
  });

  it('keeps what was typed and allows retrying after a server failure', async () => {
    const { root, http, profiles, finalizar, type, settle } = await setup();
    await type('Hola');
    finalizar().click();
    await settle();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar con el servidor'));
    expect(root.querySelector<HTMLTextAreaElement>('#presentacion')!.value).toBe('Hola');
    expect(profiles.profile()).toBeNull();
    expect(finalizar().disabled).toBe(false);
  });

  it('does not send twice while the first request is in flight', async () => {
    const { http, fixture, finalizar, settle } = await setup();
    finalizar().click();
    await settle();
    const instancia = fixture.componentInstance as unknown as { guardar(omitir?: boolean): Promise<void> };
    void instancia.guardar();
    void instancia.guardar(true);
    http.expectOne(URL).flush({ message: 'ok', profile: PERFIL });
  });
});
