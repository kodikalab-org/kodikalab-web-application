import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL, PractitionerProfile } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { PlataformasCompetitivas } from './plataformas-competitivas';

const URL = 'http://localhost:8080/api/users/me';
const PENDING_MESSAGE =
  'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';
const PERFIL: PractitionerProfile = {
  email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
  codeforcesHandle: 'ana_cf', codeforcesRating: 1432, atcoderHandle: 'ana_ac', vjudgeHandle: null,
};

describe('PlataformasCompetitivas (cuenta real)', () => {
  async function abrir(pendiente?: string) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'pantalla', component: PlataformasCompetitivas }]),
        provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(PERFIL);
    if (pendiente) profiles.pendingLink.set({ email: PERFIL.email, handle: pendiente, notice: PENDING_MESSAGE });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/pantalla', PlataformasCompetitivas);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => { harness.detectChanges(); await harness.fixture.whenStable(); };
    return { root, profiles, settle, http: TestBed.inject(HttpTestingController) };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';
  const reintentar = (root: HTMLElement) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'));

  it('lists the three supported platforms with their state and the saved data', async () => {
    const { root } = await abrir();
    const contenido = texto(root);
    expect(contenido).toContain('Codeforces');
    expect(contenido).toMatch(/Estado:\s*Vinculada/);
    expect(contenido).toContain('Estado: Sin vincular');
    expect(contenido).toContain('ana@example.com');
    expect(contenido).toContain('Ingeniería de Software · 5.º ciclo');
    expect(contenido.toLowerCase()).not.toContain('leetcode');
    expect(contenido).not.toContain('camila_rc');
    expect(reintentar(root)).toBeUndefined();
  });

  it('shows the pending state with the backend notice and retries the link', async () => {
    const { root, http, profiles, settle } = await abrir('ana_nuevo');
    expect(texto(root)).toContain('Estado: Pendiente');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Codeforces no confirmó el identificador informado');
    reintentar(root)!.click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.body).toMatchObject({ codeforcesHandle: 'ana_nuevo', atcoderHandle: 'ana_ac', cicloAcademico: 5 });
    req.flush({ message: 'Perfil actualizado correctamente', profile: { ...PERFIL, codeforcesHandle: 'ana_nuevo', codeforcesRating: 1700 } });
    await vi.waitFor(() => expect(profiles.pendingLink()).toBeNull());
    await settle();
    expect(texto(root)).toContain('Vinculación confirmada');
    expect(texto(root)).not.toContain('Estado: Pendiente');
    expect(reintentar(root)).toBeUndefined();
  });

  it('keeps the pending state when the retry request fails', async () => {
    const { root, http, profiles, settle } = await abrir('ana_nuevo');
    reintentar(root)!.click();
    await settle();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]')).not.toBeNull());
    expect(profiles.pendingLink()).not.toBeNull();
    expect(reintentar(root)!.disabled).toBe(false);
  });
});
