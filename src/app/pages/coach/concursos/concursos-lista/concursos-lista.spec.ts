import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '../../../../core/api';
import { ConcursosLista } from './concursos-lista';

const GROUPS = [
  { groupId: 7, name: 'Grupo Alfa', status: 'ACTIVO', activeMembers: 4, pendingRequests: 0 },
  { groupId: 8, name: 'Grupo Beta', status: 'ACTIVO', activeMembers: 2, pendingRequests: 0 },
  { groupId: 9, name: 'Borrador', status: 'BORRADOR', activeMembers: 0, pendingRequests: 0 },
];

const item = (id: number, name: string, status: string, startsAt: string, endsAt: string) => ({
  id,
  eventName: name,
  description: null,
  status,
  startsAt,
  endsAt,
  problemsCount: id,
});

const COMPETITIONS = {
  teamId: 7,
  total: 4,
  items: [
    item(1, 'Pasado viejo', 'FINALIZADA', '2026-09-01T10:00:00Z', '2026-09-01T12:00:00Z'),
    item(2, 'Programado', 'PROGRAMADA', '2026-12-01T10:00:00Z', '2026-12-01T12:30:00Z'),
    item(3, 'En vivo', 'EN_CURSO', '2026-11-05T10:00:00Z', '2026-11-05T14:00:00Z'),
    item(4, 'Pasado reciente', 'FINALIZADA', '2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z'),
  ],
};

describe('ConcursosLista', () => {
  let http: HttpTestingController;

  async function open(url: string, state?: Record<string, unknown>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'coach/concursos', component: ConcursosLista },
          { path: '**', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigateByUrl(url, state ? { state } : undefined);
    harness.detectChanges();
    http.expectOne('/api/teams/me').flush(GROUPS);
    http.expectOne((r) => r.url === '/api/competitions').flush(COMPETITIONS);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, root: harness.routeNativeElement as HTMLElement };
  }

  const rows = (root: HTMLElement, table: string) =>
    Array.from(root.querySelectorAll(`table[aria-label="${table}"] tbody tr`)) as HTMLElement[];
  const button = (scope: ParentNode, label: string) =>
    Array.from(scope.querySelectorAll('button')).find((b) =>
      b.textContent?.trim().startsWith(label),
    ) as HTMLButtonElement | undefined;

  /** The dialog closes asynchronously, so the request shows up a few ticks after the click. */
  async function patchRequest(harness: RouterTestingHarness, url: string) {
    for (let attempt = 0; attempt < 50; attempt++) {
      harness.detectChanges();
      await harness.fixture.whenStable();
      const [request] = http.match(url);
      if (request) return request;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`No request to ${url}`);
  }

  afterEach(() => http.verify());

  it('lists only the published groups of the coach in the team selector', async () => {
    const { root } = await open('/coach/concursos?teamId=7');
    const options = Array.from(root.querySelectorAll('select[aria-label="Grupo"] option')).map(
      (o) => o.textContent?.trim(),
    );
    expect(options).toEqual(['Selecciona un grupo', 'Grupo Alfa', 'Grupo Beta']);
  });

  it('splits the contests into current/upcoming and past, ordered by status and start', async () => {
    const { root } = await open('/coach/concursos?teamId=7');
    const current = rows(root, 'Concursos actuales y próximos');
    const past = rows(root, 'Concursos pasados');
    expect(current.map((r) => r.querySelector('td')?.textContent?.trim())).toEqual([
      'En vivo',
      'Programado',
    ]);
    expect(past.map((r) => r.querySelector('td')?.textContent?.trim())).toEqual([
      'Pasado reciente',
      'Pasado viejo',
    ]);
    const live = current[0].textContent!;
    expect(live).toContain('En curso');
    expect(live).toContain('4 h');
    expect(current[1].textContent).toContain('2 h 30 min');
    expect(current[0].textContent).toContain('3');
  });

  it('offers Iniciar only on scheduled contests and Finalizar only on running ones', async () => {
    const { root } = await open('/coach/concursos?teamId=7');
    const [running, scheduled] = rows(root, 'Concursos actuales y próximos');
    expect(button(running, 'Iniciar')).toBeUndefined();
    expect(button(running, 'Finalizar')).toBeDefined();
    expect(button(scheduled, 'Iniciar')).toBeDefined();
    expect(button(scheduled, 'Finalizar')).toBeUndefined();
    for (const row of rows(root, 'Concursos pasados')) {
      expect(button(row, 'Iniciar')).toBeUndefined();
      expect(button(row, 'Finalizar')).toBeUndefined();
    }
  });

  it('links to the assign-problems flow and to the official result', async () => {
    const { root } = await open('/coach/concursos?teamId=7');
    const [running] = rows(root, 'Concursos actuales y próximos');
    const assign = Array.from(running.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Asignar problemas'),
    )!;
    expect(assign.getAttribute('href')).toBe('/coach/asignar-problema?competitionId=3&teamId=7');
    const result = Array.from(running.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Resultado oficial'),
    )!;
    expect(result.getAttribute('href')).toBe('/coach/competencias');
  });

  it('links the create button to the form keeping the selected team', async () => {
    const { root } = await open('/coach/concursos?teamId=7');
    const create = Array.from(root.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Crear concurso'),
    )!;
    expect(create.getAttribute('href')).toBe('/coach/concursos/nuevo?teamId=7');
  });

  it('asks for confirmation and sends PATCH status EN_CURSO when starting', async () => {
    const { harness, root } = await open('/coach/concursos?teamId=7');
    const [, scheduled] = rows(root, 'Concursos actuales y próximos');
    button(scheduled, 'Iniciar')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const dialog = document.querySelector('mat-dialog-container') as HTMLElement;
    expect(dialog.textContent).toContain('Programado');
    http.expectNone('/api/competitions/2/status');
    button(dialog, 'Confirmar')!.click();
    const patch = await patchRequest(harness, '/api/competitions/2/status');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'EN_CURSO' });
    patch.flush({ id: 2, status: 'EN_CURSO' });
    http
      .expectOne((r) => r.url === '/api/competitions')
      .flush({
        ...COMPETITIONS,
        items: COMPETITIONS.items.map((c) => (c.id === 2 ? { ...c, status: 'EN_CURSO' } : c)),
      });
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.textContent).toContain('Programado');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('en curso');
  });

  it('does not change the status when the confirmation is cancelled', async () => {
    const { harness, root } = await open('/coach/concursos?teamId=7');
    const [running] = rows(root, 'Concursos actuales y próximos');
    button(running, 'Finalizar')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const dialog = document.querySelector('mat-dialog-container') as HTMLElement;
    button(dialog, 'Cancelar')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    http.expectNone('/api/competitions/3/status');
  });

  it('sends PATCH status FINALIZADA when finishing a running contest', async () => {
    const { harness, root } = await open('/coach/concursos?teamId=7');
    const [running] = rows(root, 'Concursos actuales y próximos');
    button(running, 'Finalizar')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    button(document.querySelector('mat-dialog-container') as HTMLElement, 'Confirmar')!.click();
    const patch = await patchRequest(harness, '/api/competitions/3/status');
    expect(patch.request.body).toEqual({ status: 'FINALIZADA' });
    patch.flush(
      { message: 'No se puede pasar la competencia de FINALIZADA a FINALIZADA', errors: {} },
      { status: 409, statusText: 'Conflict' },
    );
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se puede pasar');
  });

  it('shows the creation message with a link to assign problems', async () => {
    const { root } = await open('/coach/concursos?teamId=7', {
      created: { id: 12, name: 'Maratón nueva' },
    });
    const status = root.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('Maratón nueva');
    const link = Array.from(status.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Asignar problemas ahora'),
    )!;
    expect(link.getAttribute('href')).toBe('/coach/asignar-problema?competitionId=12&teamId=7');
  });
});
