import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/api';
import type { AssignedProblemItem } from '../../../core/problems-api';
import { RegistroProblemasResueltos } from './registro-problemas-resueltos';

function assignment(): AssignedProblemItem {
  return {
    competitionProblemId: 51,
    letter: 'B',
    score: 100,
    balloonColor: '#22C55E',
    assignedAt: '2026-10-20T10:00:00Z',
    competition: {
      id: 30,
      name: 'Maratón interna UPC',
      status: 'EN_CURSO',
      startsAt: '2026-10-28T05:00:00Z',
      endsAt: '2026-11-03T04:59:00Z',
      durationMinutes: 1440,
      penaltyRule: 'ICPC_20_MIN',
      scoreboardFreezeMinutes: 0,
      accessType: 'PRIVADO',
    },
    problem: {
      id: 9,
      title: 'Theatre Square',
      url: 'https://codeforces.com/problemset/problem/1850/A',
      sourcePlatform: 'CODEFORCES',
      sourceCode: '1850A',
      difficultyRating: '1000',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      topics: ['Matemática'],
    },
    status: 'SIN_INTENTOS',
    attemptCount: 0,
    lastAttempt: null,
  };
}

const REGISTRATION = {
  resolution: { resolutionId: 1, verdict: 'ACCEPTED' },
  registrationMethod: 'MANUAL_PROVISIONAL',
  progress: { teamId: 12, membershipId: 1, userId: 1, acceptedProblems: 1 },
};

describe('RegistroProblemasResueltos', () => {
  let http: HttpTestingController;

  async function setup(teamId: number | null = 12, item = assignment()) {
    await TestBed.configureTestingModule({
      imports: [RegistroProblemasResueltos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RegistroProblemasResueltos);
    fixture.componentRef.setInput('teamId', teamId);
    fixture.componentRef.setInput('asignacion', item);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const type = (selector: string, value: string) => {
      const input = root.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
      input.dispatchEvent(new Event('blur'));
    };
    const registrar = () =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Registrar como resuelto'))!;
    return { fixture, root, settle, type, registrar };
  }

  afterEach(() => http.verify());

  it('never asks for the source code: only the language and the evidence link remain', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Registrar solución');
    expect(root.querySelector('textarea')).toBeNull();
    expect(root.querySelector('mat-button-toggle-group')).toBeNull();
    expect(root.textContent).not.toContain('Pegar código');
    expect(root.textContent).not.toContain('Subir archivo');
    expect(root.textContent).not.toContain('Código fuente');
    expect(root.querySelector('select[formcontrolname="lenguaje"]')).not.toBeNull();
    expect(root.querySelector('input[formcontrolname="evidencia"]')).not.toBeNull();
    expect(root.textContent).toContain('no guarda tu código');
  });

  it('offers a button that opens the submit page of the platform in a new tab', async () => {
    const { root } = await setup();
    const enlace = Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Enviar en Codeforces'))!;
    expect(enlace.getAttribute('href')).toBe('https://codeforces.com/contest/1850/submit/A');
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toContain('noopener');
  });

  it('shows which problem, competition and letter is being registered', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Theatre Square');
    expect(root.textContent).toContain('Maratón interna UPC');
  });

  it('posts the language and the evidence link to the resolutions of the team and emits registrado', async () => {
    const { fixture, settle, type, registrar } = await setup();
    let registrado = false;
    fixture.componentInstance.registrado.subscribe(() => (registrado = true));
    expect(registrar().disabled).toBe(true);
    type('select[formcontrolname="lenguaje"]', 'C++17');
    type('input[formcontrolname="evidencia"]', ' https://codeforces.com/contest/1850/submission/123 ');
    await settle();
    expect(registrar().disabled).toBe(false);
    registrar().click();
    const request = http.expectOne('/api/competitions/teams/12/problems/51/resolutions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      language: 'C++17',
      evidenceUrl: 'https://codeforces.com/contest/1850/submission/123',
    });
    request.flush(REGISTRATION, { status: 201, statusText: 'Created' });
    expect(registrado).toBe(true);
  });

  it('sends a null evidence when the link is left blank', async () => {
    const { settle, type, registrar } = await setup();
    type('select[formcontrolname="lenguaje"]', 'Python 3.11');
    await settle();
    registrar().click();
    const request = http.expectOne('/api/competitions/teams/12/problems/51/resolutions');
    expect(request.request.body).toEqual({ language: 'Python 3.11', evidenceUrl: null });
    request.flush(REGISTRATION, { status: 201, statusText: 'Created' });
  });

  it('blocks the registration and explains it when the link is not a URL', async () => {
    const { root, settle, type, registrar } = await setup();
    type('select[formcontrolname="lenguaje"]', 'Java 17');
    type('input[formcontrolname="evidencia"]', 'mi solución');
    await settle();
    expect(root.textContent).toContain('Ingresa una URL que empiece con http:// o https://');
    expect(registrar().disabled).toBe(true);
  });

  it('shows the backend validation errors under the field they belong to', async () => {
    const { root, settle, type, registrar } = await setup();
    type('select[formcontrolname="lenguaje"]', 'Kotlin');
    await settle();
    registrar().click();
    http.expectOne('/api/competitions/teams/12/problems/51/resolutions').flush(
      {
        message: 'La resolución debe corregirse',
        errors: { evidenceUrl: 'La evidencia debe ser una URL HTTP/HTTPS válida de hasta 500 caracteres' },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();
    expect(root.textContent).toContain('La evidencia debe ser una URL HTTP/HTTPS válida');
    expect(registrar().disabled).toBe(false);
  });

  it('says the problem was already registered on a 409', async () => {
    const { root, settle, type, registrar } = await setup();
    type('select[formcontrolname="lenguaje"]', 'Kotlin');
    await settle();
    registrar().click();
    http.expectOne('/api/competitions/teams/12/problems/51/resolutions').flush(
      { message: 'Ya existe una resolución ACCEPTED para esta membresía y problema de competencia', errors: {} },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Ya registraste este problema como resuelto');
  });

  it('says the problem is not assigned on a 404', async () => {
    const { root, settle, type, registrar } = await setup();
    type('select[formcontrolname="lenguaje"]', 'Kotlin');
    await settle();
    registrar().click();
    http.expectOne('/api/competitions/teams/12/problems/51/resolutions').flush(
      { message: 'El problema no está asignado a una competencia existente', errors: {} },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no está asignado');
  });

  it('cannot register without the team of the assignment', async () => {
    const { root, settle, type, registrar } = await setup(null);
    type('select[formcontrolname="lenguaje"]', 'Kotlin');
    await settle();
    expect(registrar().disabled).toBe(true);
    expect(root.textContent).toContain('Abre el problema desde tu lista');
  });

  it('emits cancelar from the Cancelar button', async () => {
    const { fixture, root } = await setup();
    let emitido = false;
    fixture.componentInstance.cancelar.subscribe(() => (emitido = true));
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar'))!.click();
    expect(emitido).toBe(true);
  });
});
