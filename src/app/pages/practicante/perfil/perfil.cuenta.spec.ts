import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_URL, PractitionerProfile } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';
import { Perfil } from './perfil';

const URL = 'http://localhost:8080/api/users/me';
const PENDING_MESSAGE =
  'Perfil actualizado correctamente, pero Codeforces no confirmó el identificador informado; se conservaron los datos previos de Codeforces';
const PERFIL: PractitionerProfile = {
  email: 'ana@example.com', role: 'PRACTICANTE', codigoEstudiante: 'U202412345',
  carrera: 'Ingeniería de Software', cicloAcademico: 5, nivelCompetitivo: 'INTERMEDIO',
  codeforcesHandle: 'ana_cf', codeforcesRating: 1432, atcoderHandle: null, vjudgeHandle: null,
};

describe('Perfil del practicante (cuenta real)', () => {
  async function setup(perfil: PractitionerProfile = PERFIL, pendiente?: string, params: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
      ],
    }).compileComponents();
    const profiles = TestBed.inject(ProfileApi);
    profiles.profile.set(perfil);
    if (pendiente) {
      profiles.message.set(PENDING_MESSAGE);
      profiles.pendingLink.set({ email: perfil.email, handle: pendiente, notice: PENDING_MESSAGE });
    }
    const fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    return { root, profiles, settle, http: TestBed.inject(HttpTestingController) };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const texto = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';
  const plataformas = (root: HTMLElement) =>
    [...root.querySelectorAll('li')].filter((li) => li.querySelector('a[href="/perfil/editar#plataformas"]'));

  it('shows each supported platform with its link state and never offers LeetCode', async () => {
    const { root } = await setup({ ...PERFIL, vjudgeHandle: 'ana_vj' });
    const filas = plataformas(root).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(filas).toHaveLength(3);
    expect(filas[0]).toContain('Codeforces');
    expect(filas[0]).toContain('ana_cf');
    expect(filas[0]).toContain('Vinculada');
    expect(filas[1]).toContain('AtCoder');
    expect(filas[1]).toContain('Sin vincular');
    expect(filas[2]).toContain('VJudge');
    expect(filas[2]).toContain('ana_vj');
    expect(texto(root).toLowerCase()).not.toContain('leetcode');
    expect(root.textContent).not.toContain('Reintentar vinculación');
  });

  it('keeps the empty state when no platform is linked', async () => {
    const { root } = await setup({ ...PERFIL, codeforcesHandle: null, codeforcesRating: null });
    expect(texto(root)).toContain('Aún no vinculas plataformas');
    expect(plataformas(root)).toHaveLength(0);
  });

  it('shows the pending Codeforces link with the backend notice and the retry button', async () => {
    const { root } = await setup(PERFIL, 'ana_nuevo', { estado: 'actualizado' });
    const codeforces = plataformas(root)[0].textContent!.replace(/\s+/g, ' ');
    expect(codeforces).toContain('ana_nuevo');
    expect(codeforces).toContain('Pendiente');
    expect(codeforces).not.toContain('Vinculada');
    expect(texto(root)).toContain('Codeforces no confirmó el identificador informado');
    expect([...root.querySelectorAll('button')].some((b) => b.textContent?.includes('Reintentar vinculación'))).toBe(true);
  });

  it('retries the link and shows it as linked when Codeforces confirms it', async () => {
    const { root, http, profiles, settle } = await setup(PERFIL, 'ana_nuevo');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!.click();
    await settle();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.codeforcesHandle).toBe('ana_nuevo');
    req.flush({ message: 'Perfil actualizado correctamente', profile: { ...PERFIL, codeforcesHandle: 'ana_nuevo', codeforcesRating: 1600 } });
    await vi.waitFor(() => expect(profiles.pendingLink()).toBeNull());
    await settle();
    const codeforces = plataformas(root)[0].textContent!.replace(/\s+/g, ' ');
    expect(codeforces).toContain('ana_nuevo');
    expect(codeforces).toContain('Vinculada');
    expect(texto(root)).toContain('Vinculación confirmada');
  });

  it('does not send a second retry while one is in flight', async () => {
    const { root, http, settle } = await setup(PERFIL, 'ana_nuevo');
    const boton = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar vinculación'))!;
    boton.click();
    await settle();
    expect(boton.disabled).toBe(true);
    boton.click();
    http.expectOne(URL).flush({ message: PENDING_MESSAGE, profile: PERFIL });
  });
});
