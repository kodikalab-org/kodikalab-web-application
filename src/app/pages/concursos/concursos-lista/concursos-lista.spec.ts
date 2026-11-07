import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { ConcursosLista } from './concursos-lista';
import {
  DAY, HOUR, TEAMS, assignedItem, assignedRequest, competitionItem, competitionsRequest,
  configure, iso, teamRequest,
} from '../concursos-test-data';

describe('ConcursosLista', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = configure([provideRouter([])]);
  });

  async function open() {
    const fixture = TestBed.createComponent(ConcursosLista);
    fixture.detectChanges();
    teamRequest(http).flush(TEAMS);
    competitionsRequest(http, 1).flush({
      teamId: 1,
      total: 3,
      items: [
        competitionItem(12, 'Contest Viejo', 'FINALIZADA', iso(-9 * DAY), iso(-9 * DAY + 2 * HOUR)),
        competitionItem(11, 'Contest C', 'PROGRAMADA', iso(2 * DAY), iso(2 * DAY + 2 * HOUR)),
        competitionItem(10, 'Contest A', 'EN_CURSO', iso(-HOUR), iso(HOUR)),
      ],
    });
    competitionsRequest(http, 2).flush({
      teamId: 2,
      total: 2,
      items: [
        competitionItem(21, 'Contest Z', 'FINALIZADA', iso(-2 * DAY), iso(-2 * DAY + 2 * HOUR)),
        competitionItem(20, 'Contest B', 'PROGRAMADA', iso(DAY + HOUR), iso(DAY + 3 * HOUR), 5),
      ],
    });
    assignedRequest(http, 1).flush({
      teamId: 1,
      total: 3,
      items: [
        assignedItem(101, 10, 'A', 'RESUELTO'),
        assignedItem(102, 10, 'B', 'PENDIENTE'),
        assignedItem(103, 10, 'C', 'SIN_INTENTOS'),
      ],
    });
    assignedRequest(http, 2).flush({ teamId: 2, total: 0, items: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  const names = (root: HTMLElement, label: string) =>
    Array.from(root.querySelectorAll(`table[aria-label="${label}"] tbody tr`)).map((row) =>
      row.querySelector('a')?.textContent?.trim(),
    );

  it('queries only the teams where my membership is ACTIVO', async () => {
    await open();
    http.expectNone((r) => r.url === '/api/competitions' && r.params.get('teamId') === '3');
    http.expectNone((r) => r.url === '/api/problems/assigned' && r.params.get('teamId') === '3');
  });

  it('splits current/upcoming from past contests and orders both tables', async () => {
    const { root } = await open();
    expect(names(root, 'Concursos actuales y próximos')).toEqual(['Contest A', 'Contest B', 'Contest C']);
    expect(names(root, 'Concursos pasados')).toEqual(['Contest Z', 'Contest Viejo']);
  });

  it('shows the group, the status badge, the duration and a countdown for scheduled contests', async () => {
    const { root } = await open();
    const rows = root.querySelectorAll('table[aria-label="Concursos actuales y próximos"] tbody tr');
    expect(rows[0].textContent).toContain('Alfa ICPC');
    expect(rows[0].textContent).toContain('En curso');
    expect(rows[1].textContent).toContain('Beta Grafos');
    expect(rows[1].textContent).toContain('Empieza en 1 d 1 h');
    expect(rows[1].textContent).toContain('2 h');
  });

  it('computes my progress per contest from the assigned problem statuses', async () => {
    const { root } = await open();
    const rows = root.querySelectorAll('table[aria-label="Concursos actuales y próximos"] tbody tr');
    expect(rows[0].textContent).toContain('1/3');
    expect(rows[0].querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('1');
    expect(rows[1].textContent).toContain('0/5');
  });

  it('summarizes active contests, solved/assigned problems and pending verifications', async () => {
    const { root } = await open();
    const summary = root.querySelector('[aria-label="Resumen de progreso"]')!.textContent!;
    expect(summary).toMatch(/Concursos activos\s*1/);
    expect(summary).toMatch(/Problemas resueltos\s*1 \/ 3/);
    expect(summary).toMatch(/Pendientes de verificación\s*1/);
  });

  it('links each contest to its detail page', async () => {
    const { root } = await open();
    const link = root.querySelector<HTMLAnchorElement>(
      'table[aria-label="Concursos actuales y próximos"] tbody tr a',
    )!;
    expect(link.getAttribute('href')).toBe('/concursos/1/10');
    expect(root.textContent).toContain('Entrar');
  });

  it('filters by team without issuing new requests', async () => {
    const { fixture, root } = await open();
    const select = root.querySelector<HTMLSelectElement>('select[aria-label="Grupo"]')!;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Todos mis grupos',
      'Alfa ICPC',
      'Beta Grafos',
    ]);
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(names(root, 'Concursos actuales y próximos')).toEqual(['Contest B']);
    expect(names(root, 'Concursos pasados')).toEqual(['Contest Z']);
    http.expectNone('/api/teams/me');
  });

  it('shows the empty state when the groups have no contests', async () => {
    const fixture = TestBed.createComponent(ConcursosLista);
    fixture.detectChanges();
    teamRequest(http).flush([TEAMS[0]]);
    competitionsRequest(http, 1).flush({ teamId: 1, total: 0, items: [] });
    assignedRequest(http, 1).flush({ teamId: 1, total: 0, items: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu grupo todavía no tiene concursos',
    );
  });

  it('shows an error and retries the load', async () => {
    const fixture = TestBed.createComponent(ConcursosLista);
    fixture.detectChanges();
    teamRequest(http).flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    Array.from(root.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    teamRequest(http).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
