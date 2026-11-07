import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../../../../core/api';
import { ConcursoNuevo } from './concurso-nuevo';
import { buildCreateRequest, offsetIso } from '../concurso-form';
import type { CatalogProblem } from '../../../../core/problems-api';
import { PALETTE, type PickedProblem } from '../../../../shared/problem-picker/picked-problems';

const GROUPS = [
  { groupId: 7, name: 'Grupo Alfa', status: 'ACTIVO', activeMembers: 4, pendingRequests: 0 },
  { groupId: 8, name: 'Grupo Beta', status: 'BORRADOR', activeMembers: 0, pendingRequests: 0 },
];

describe('offsetIso', () => {
  it('formats a local date as ISO-8601 with its numeric offset', () => {
    const date = new Date(2026, 10, 20, 14, 5);
    const iso = offsetIso(date);
    expect(iso).toMatch(/^2026-11-20T14:05:00[+-]\d{2}:\d{2}$/);
    expect(new Date(iso).getTime()).toBe(date.getTime());
  });
});

describe('buildCreateRequest', () => {
  const base = {
    teamId: '7',
    eventName: '  Maratón interna ',
    description: '',
    accessType: 'PUBLICO_GRUPO' as const,
    accessKey: 'ignorada',
    penaltyRule: 'ICPC_20_MIN' as const,
    startDate: new Date(2026, 10, 20),
    startTime: '14:00',
    durationMinutes: 90,
    freezeMinutes: null,
  };

  it('trims text, nulls blanks and derives endsAt from the duration', () => {
    const request = buildCreateRequest(base);
    expect(request).toMatchObject({
      teamId: 7,
      eventName: 'Maratón interna',
      description: null,
      accessType: 'PUBLICO_GRUPO',
      accessKey: null,
      penaltyRule: 'ICPC_20_MIN',
      scoreboardFreezeMinutes: null,
    });
    const start = new Date(2026, 10, 20, 14, 0).getTime();
    expect(new Date(request.startsAt).getTime()).toBe(start);
    expect(new Date(request.endsAt).getTime()).toBe(start + 90 * 60000);
  });

  it('keeps the access key only for private contests', () => {
    expect(buildCreateRequest({ ...base, accessType: 'PRIVADO_PASS', accessKey: 'clave' })).toMatchObject({
      accessType: 'PRIVADO_PASS',
      accessKey: 'clave',
    });
  });
});

const CF_PROBLEM: CatalogProblem = {
  id: 11,
  title: 'To My Critics',
  url: 'https://codeforces.com/problemset/problem/1850/A',
  sourcePlatform: 'CODEFORCES',
  sourceCode: '1850A',
  difficultyRating: '800',
  timeLimitMs: null,
  memoryLimitMb: null,
  topics: [],
};
const PICKED: PickedProblem[] = [
  { problem: CF_PROBLEM, letter: 'A', score: 1, balloonColor: PALETTE[0] },
  { problem: { ...CF_PROBLEM, id: 12, title: 'Ten Words of Wisdom', sourceCode: '1850B' }, letter: 'B', score: 5, balloonColor: '#00ff00' },
];

describe('ConcursoNuevo', () => {
  let http: HttpTestingController;

  async function open(url = '/coach/concursos/nuevo?teamId=7') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'coach/concursos/nuevo',
            providers: [provideNativeDateAdapter()],
            component: ConcursoNuevo,
          },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create(url);
    http.expectOne('/api/teams/me').flush(GROUPS);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeDebugElement!.componentInstance as ConcursoNuevo;
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return { harness, page, settle, root: harness.routeNativeElement as HTMLElement };
  }

  const fill = (page: ConcursoNuevo, value: Record<string, unknown>) =>
    page.form.patchValue({
      eventName: 'Maratón interna',
      startDate: new Date(2026, 10, 20),
      startTime: '14:00',
      durationMinutes: 90,
      ...value,
    });
  const submit = (root: HTMLElement) =>
    (
      Array.from(root.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Crear concurso'),
      ) as HTMLButtonElement
    ).click();

  afterEach(() => http.verify());

  it('preselects the team from the query string and offers only published groups', async () => {
    const { page, root } = await open();
    expect(page.form.controls.teamId.value).toBe('7');
    const options = Array.from(root.querySelectorAll('select[aria-label="Grupo"] option')).map(
      (o) => o.textContent?.trim(),
    );
    expect(options).toEqual(['Selecciona un grupo', 'Grupo Alfa']);
  });

  it('maps the form to POST /competitions and goes back to the list on success', async () => {
    const { page, settle, root } = await open();
    fill(page, { description: 'Ronda de práctica', penaltyRule: 'IOI_POINTS', freezeMinutes: 30 });
    submit(root);
    const request = http.expectOne('/api/competitions');
    expect(request.request.method).toBe('POST');
    const body = request.request.body;
    expect(body).toMatchObject({
      teamId: 7,
      eventName: 'Maratón interna',
      description: 'Ronda de práctica',
      accessType: 'PUBLICO_GRUPO',
      accessKey: null,
      penaltyRule: 'IOI_POINTS',
      scoreboardFreezeMinutes: 30,
    });
    const start = new Date(2026, 10, 20, 14, 0).getTime();
    expect(body.startsAt).toMatch(/^2026-11-20T14:00:00[+-]\d{2}:\d{2}$/);
    expect(new Date(body.endsAt).getTime()).toBe(start + 90 * 60000);
    request.flush({ id: 12, teamId: 7, eventName: 'Maratón interna', status: 'PROGRAMADA' });
    await settle();
    expect(TestBed.inject(Router).url).toBe('/coach/concursos?teamId=7');
  });

  it('requires the access key for private contests and sends it', async () => {
    const { page, settle, root } = await open();
    fill(page, { accessType: 'PRIVADO_PASS' });
    await settle();
    submit(root);
    http.expectNone('/api/competitions');
    await settle();
    expect(root.textContent).toContain('La clave de acceso es obligatoria');
    fill(page, { accessKey: 'clave-secreta' });
    submit(root);
    const request = http.expectOne('/api/competitions');
    expect(request.request.body).toMatchObject({
      accessType: 'PRIVADO_PASS',
      accessKey: 'clave-secreta',
    });
    request.flush({ id: 1 });
    await settle();
  });

  it('validates client side like the backend and does not call the API', async () => {
    const { page, settle, root } = await open('/coach/concursos/nuevo');
    fill(page, {
      teamId: '',
      eventName: '   ',
      description: 'x'.repeat(501),
      durationMinutes: 0,
      freezeMinutes: 5,
    });
    submit(root);
    http.expectNone('/api/competitions');
    await settle();
    const text = root.textContent!;
    expect(text).toContain('Selecciona el grupo del concurso');
    expect(text).toContain('El nombre es obligatorio');
    expect(text).toContain('La descripción debe tener como máximo 500 caracteres');
    expect(text).toContain('La duración debe ser un entero de al menos 1 minuto');
  });

  it('rejects a scoreboard freeze longer than the duration', async () => {
    const { page, settle, root } = await open();
    fill(page, { freezeMinutes: 120 });
    submit(root);
    http.expectNone('/api/competitions');
    await settle();
    expect(root.textContent).toContain('entre 0 y la duración del concurso (90 minutos)');
  });

  it('shows the backend field errors and keeps every value the coach typed', async () => {
    const { page, settle, root } = await open();
    fill(page, { description: 'Mi descripción', accessType: 'PRIVADO_PASS', accessKey: 'clave' });
    await settle();
    submit(root);
    http.expectOne('/api/competitions').flush(
      {
        message: 'Los datos de la competencia deben corregirse',
        errors: {
          eventName: 'El nombre es obligatorio y debe tener como máximo 150 caracteres',
          endsAt: 'La fecha de fin debe ser al menos un minuto posterior a la de inicio',
          accessKey: 'La clave de acceso no puede superar 72 bytes',
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();
    const text = root.textContent!;
    expect(text).toContain('El nombre es obligatorio y debe tener como máximo 150 caracteres');
    expect(text).toContain('La fecha de fin debe ser al menos un minuto posterior');
    expect(text).toContain('La clave de acceso no puede superar 72 bytes');
    expect(page.form.controls.eventName.invalid).toBe(true);
    expect(page.form.controls.durationMinutes.invalid).toBe(true);
    expect(page.form.value).toMatchObject({
      eventName: 'Maratón interna',
      description: 'Mi descripción',
      accessType: 'PRIVADO_PASS',
      accessKey: 'clave',
      durationMinutes: 90,
      startTime: '14:00',
    });
    expect(TestBed.inject(Router).url).toContain('/coach/concursos/nuevo');
  });

  it('shows a conflict message and keeps the form editable', async () => {
    const { page, settle, root } = await open();
    fill(page, {});
    submit(root);
    http
      .expectOne('/api/competitions')
      .flush(
        { message: 'Ya existe una competencia con ese nombre e inicio en el equipo', errors: {} },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Ya existe una competencia');
    expect(page.form.controls.eventName.value).toBe('Maratón interna');
  });

  describe('problems', () => {
    it('offers the Problemas section with the picker and lets the contest be created without problems', async () => {
      const { page, settle, root } = await open();
      expect(root.querySelector('app-problem-picker')).not.toBeNull();
      expect(root.textContent).toContain('Problemas');
      fill(page, {});
      submit(root);
      http.expectOne('/api/competitions').flush({ id: 12, teamId: 7, eventName: 'Maratón interna' });
      http.expectNone('/api/problems/assign');
      await settle();
      expect(TestBed.inject(Router).url).toBe('/coach/concursos?teamId=7');
    });

    it('creates the contest and then assigns the picker rows to it', async () => {
      const { page, settle, root } = await open();
      fill(page, {});
      page.picked.set(PICKED);
      submit(root);
      http.expectOne('/api/competitions').flush({ id: 12, teamId: 7, eventName: 'Maratón interna' });
      const assign = http.expectOne('/api/problems/assign');
      expect(assign.request.method).toBe('POST');
      expect(assign.request.body).toEqual({
        competitionId: 12,
        problems: [
          { problemId: 11, letter: 'A', score: 1, balloonColor: PALETTE[0].toUpperCase() },
          { problemId: 12, letter: 'B', score: 5, balloonColor: '#00FF00' },
        ],
      });
      assign.flush({ competitionId: 12, teamId: 7, assigned: [] }, { status: 201, statusText: 'Created' });
      await settle();
      expect(TestBed.inject(Router).url).toBe('/coach/concursos?teamId=7');
    });

    it('does not lose the created contest when the assignment fails and links to assign them again', async () => {
      const { page, settle, root } = await open();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fill(page, {});
      page.picked.set(PICKED);
      submit(root);
      http.expectOne('/api/competitions').flush({ id: 12, teamId: 7, eventName: 'Maratón interna' });
      http
        .expectOne('/api/problems/assign')
        .flush({ message: 'Una de las letras ya existe en la competencia' }, { status: 409, statusText: 'Conflict' });
      await settle();
      expect(navigate).toHaveBeenCalledTimes(1);
      const [commands, extras] = navigate.mock.calls[0];
      expect(commands).toEqual(['/coach/concursos']);
      expect(extras?.queryParams).toEqual({ teamId: 7 });
      expect(extras?.state).toMatchObject({
        created: { id: 12, name: 'Maratón interna' },
        assignmentError: 'Una de las letras ya existe en la competencia',
      });
    });

    it('does not assign anything when creating the contest fails and keeps the picked problems', async () => {
      const { page, settle, root } = await open();
      fill(page, {});
      page.picked.set(PICKED);
      submit(root);
      http
        .expectOne('/api/competitions')
        .flush({ message: 'Ya existe una competencia', errors: {} }, { status: 409, statusText: 'Conflict' });
      http.expectNone('/api/problems/assign');
      await settle();
      expect(page.picked()).toEqual(PICKED);
    });

    it('uses 100 points as default for IOI contests when a problem is added from the picker', async () => {
      const { page, settle, root } = await open();
      fill(page, { penaltyRule: 'IOI_POINTS' });
      await settle();
      const input = root.querySelector<HTMLInputElement>('input[aria-label="Código de Codeforces"]')!;
      input.value = '1850A';
      input.dispatchEvent(new Event('input'));
      root.querySelector<HTMLButtonElement>('button[aria-label="Agregar por código"]')!.click();
      http.expectOne('/api/problems/codeforces/import').flush({ created: true, problem: CF_PROBLEM });
      await settle();
      expect(page.picked().map((row) => row.score)).toEqual([100]);
      submit(root);
      http.expectOne('/api/competitions').flush({ id: 3, teamId: 7, eventName: 'Maratón interna' });
      const assign = http.expectOne('/api/problems/assign');
      expect(assign.request.body.problems[0]).toMatchObject({ problemId: 11, letter: 'A', score: 100 });
      assign.flush({ competitionId: 3, teamId: 7, assigned: [] });
      await settle();
    });
  });
});
