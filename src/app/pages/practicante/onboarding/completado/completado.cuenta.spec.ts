import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL, PractitionerProfile } from '../../../../core/api';
import { ProfileApi } from '../../../../core/profile-api';
import { OnboardingCompletado } from './completado';

const URL = 'http://localhost:8080/api/users/me';
const PENDING_MESSAGE =
  'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';
const PERFIL: PractitionerProfile = {
  email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
  codeforcesHandle: null, codeforcesRating: null, atcoderHandle: 'ana_ac', vjudgeHandle: null,
};

describe('OnboardingCompletado (cuenta real)', () => {
  async function abrir(perfil: PractitionerProfile, pendiente?: string) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'pantalla', component: OnboardingCompletado }]),
        provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(perfil);
    profiles.message.set(pendiente ? PENDING_MESSAGE : 'Perfil actualizado correctamente');
    if (pendiente) profiles.pendingLink.set({ email: perfil.email, handle: pendiente, notice: PENDING_MESSAGE });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla', OnboardingCompletado);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => { harness.detectChanges(); await harness.fixture.whenStable(); };
    return { root, profiles, settle, http: TestBed.inject(HttpTestingController) };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';

  it('summarizes the saved profile with the link state of each platform', async () => {
    const { root } = await abrir({ ...PERFIL, codeforcesHandle: 'ana_cf', codeforcesRating: 1432 });
    const resumen = texto(root);
    expect(resumen).toContain('Código U202412345');
    expect(resumen).toContain('5.º ciclo');
    expect(resumen).toContain('Codeforces: ana_cf · rating 1432');
    expect(resumen).toContain('AtCoder: ana_ac');
    expect(resumen).not.toContain('VJudge');
    expect(resumen).not.toContain('LeetCode');
    expect(root.textContent).not.toContain('Reintentar vinculación');
  });

  it('says Codeforces is not linked when there is no handle', async () => {
    const { root } = await abrir(PERFIL);
    expect(texto(root)).toContain('Codeforces sin vincular');
  });

  it('shows the pending link with the backend notice and lets retry it', async () => {
    const { root, http, profiles, settle } = await abrir(PERFIL, 'nuevo_handle');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Codeforces no confirmó el identificador');
    expect(texto(root)).toContain('Codeforces: nuevo_handle · pendiente');
    const reintentar = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!;
    reintentar.click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body).toMatchObject({ codeforcesHandle: 'nuevo_handle', atcoderHandle: 'ana_ac', codigoEstudiante: 'U202412345' });
    req.flush({ message: 'Perfil actualizado correctamente', profile: { ...PERFIL, codeforcesHandle: 'nuevo_handle', codeforcesRating: 1500 } });
    await vi.waitFor(() => expect(profiles.pendingLink()).toBeNull());
    await settle();
    expect(texto(root)).toContain('Vinculación confirmada');
    expect(texto(root)).toContain('Codeforces: nuevo_handle · rating 1500');
    expect(root.textContent).not.toContain('Codeforces no confirmó el identificador');
  });

  it('keeps the link pending and says so when the retry is still not confirmed', async () => {
    const { root, http, settle } = await abrir(PERFIL, 'nuevo_handle');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!.click();
    await settle();
    http.expectOne(URL).flush({ message: PENDING_MESSAGE, profile: PERFIL });
    await vi.waitFor(() => expect(texto(root)).toContain('Seguimos sin poder confirmarlo'));
    expect(texto(root)).toContain('Reintentar vinculación');
  });

  it('shows the error and keeps the pending link when the retry request fails', async () => {
    const { root, http, profiles, settle } = await abrir(PERFIL, 'nuevo_handle');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!.click();
    await settle();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar con el servidor'));
    expect(profiles.pendingLink()).not.toBeNull();
  });
});
