import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../core/api';
import type { CatalogProblem } from '../../../core/problems-api';
import { AsignarProblema } from './asignar-problema';
import { AssignmentStore } from './assignment-store';

function problem(
  id: number,
  title: string,
  platform: CatalogProblem['sourcePlatform'],
  topic: string,
  difficulty: string | null,
): CatalogProblem {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    sourcePlatform: platform,
    sourceCode: `COD-${id}`,
    difficultyRating: difficulty,
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    topics: [{ id: id * 10, name: topic }],
  };
}

const PAGE = {
  items: [
    problem(1, 'Theatre Square', 'CODEFORCES', 'Matemática', '1000'),
    problem(2, 'Weird Algorithm', 'CSES', 'Implementación', null),
    problem(3, 'Coin Combinations', 'CSES', 'Programación dinámica', '1600'),
  ],
  page: 0,
  size: 10,
  totalItems: 25,
  totalPages: 3,
};

describe('AsignarProblema (catalog step)', () => {
  let http: HttpTestingController;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AsignarProblema],
      providers: [
        AssignmentStore,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AsignarProblema);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(AssignmentStore);
    const catalog = () => http.expectOne((r) => r.url === '/api/problems');
    const flush = async (body = PAGE) => {
      catalog().flush(body);
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const continuar = () =>
      Array.from(root.querySelectorAll('a')).find((a) => a.textContent?.includes('Continuar'))!;
    return { fixture, root, store, flush, catalog, continuar };
  }

  afterEach(() => http.verify());

  it('loads the catalog from GET /problems instead of showing fixed rows', async () => {
    const { root, flush } = await setup();
    await flush();
    expect(root.querySelector('h1')?.textContent).toContain('Asignar problemas');
    expect(root.querySelectorAll('tbody tr').length).toBe(3);
    expect(root.textContent).toContain('Theatre Square');
    expect(root.textContent).toContain('Programación dinámica');
    expect(root.querySelector('[aria-current="step"]')?.textContent).toContain('Seleccionar problemas');
  });

  it('asks the first page with the page size and no filters', async () => {
    const { catalog } = await setup();
    const request = catalog();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.has('q')).toBe(false);
    request.flush(PAGE);
  });

  it('builds the platform, topic and difficulty filters from the problems the backend returned', async () => {
    const { root, flush } = await setup();
    await flush();
    const options = (name: string) =>
      Array.from(root.querySelectorAll<HTMLOptionElement>(`select[formcontrolname="${name}"] option`)).map(
        (o) => o.textContent?.trim(),
      );
    expect(options('plataforma')).toEqual(['Todas', 'Codeforces', 'CSES']);
    expect(options('tema')).toEqual(['Todos', 'Matemática', 'Implementación', 'Programación dinámica']);
    expect(options('dificultad')).toEqual(['Todas', '1000', '1600']);
  });

  it('maps the filters to query parameters and goes back to the first page', async () => {
    const { fixture, root, flush, catalog } = await setup();
    await flush();
    const choose = (name: string, value: string) => {
      const select = root.querySelector<HTMLSelectElement>(`select[formcontrolname="${name}"]`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    choose('plataforma', 'CSES');
    const request = catalog();
    expect(request.request.params.get('platform')).toBe('CSES');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(PAGE);
    fixture.detectChanges();

    choose('tema', '30');
    const second = catalog();
    expect(second.request.params.get('topicId')).toBe('30');
    expect(second.request.params.get('platform')).toBe('CSES');
    second.flush(PAGE);
    fixture.detectChanges();

    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'theatre';
    search.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    const third = catalog();
    expect(third.request.params.get('q')).toBe('theatre');
    third.flush(PAGE);
  });

  it('shows an error if the search is longer than 100 characters and does not call the backend', async () => {
    const { fixture, root, flush } = await setup();
    await flush();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'a'.repeat(101);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.textContent).toContain('Usa como máximo 100 caracteres');
    http.expectNone((r) => r.url === '/api/problems');
  });

  it('keeps the selection in the shared store and enables Continuar only when something is selected', async () => {
    const { fixture, root, store, flush, continuar } = await setup();
    await flush();
    expect(continuar().getAttribute('aria-disabled')).toBe('true');
    const boxes = root.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]');
    boxes[0].click();
    boxes[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(store.selected().map((p) => p.id)).toEqual([1, 2]);
    expect(root.querySelector('aside')?.textContent).toContain('Theatre Square');
    expect(root.querySelector('aside')?.textContent).toContain('Weird Algorithm');
    expect(continuar().getAttribute('aria-disabled')).not.toBe('true');
    expect(continuar().getAttribute('href')).toBe('/coach/asignar-problema/configurar');
  });

  it('removes a selected problem from the summary and clears the whole selection', async () => {
    const { fixture, root, store, flush } = await setup();
    await flush();
    store.toggle(PAGE.items[0]);
    store.toggle(PAGE.items[1]);
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button[aria-label="Quitar Theatre Square"]')!.click();
    expect(store.selected().map((p) => p.id)).toEqual([2]);
    Array.from(root.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Limpiar'))!
      .click();
    expect(store.selected()).toEqual([]);
  });

  it('keeps the selection when the next catalog page is requested', async () => {
    const { fixture, root, store, flush, catalog } = await setup();
    await flush();
    store.toggle(PAGE.items[0]);
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button.mat-mdc-paginator-navigation-next')!.click();
    const request = catalog();
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ ...PAGE, page: 1, items: [problem(4, 'Missing Number', 'CSES', 'Ordenamiento', null)] });
    fixture.detectChanges();
    expect(store.selected().map((p) => p.id)).toEqual([1]);
    expect(root.textContent).toContain('Missing Number');
  });

  it('explains the failure and retries the same query', async () => {
    const { fixture, root, catalog } = await setup();
    catalog().flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar');
    Array.from(root.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    catalog().flush(PAGE);
    fixture.detectChanges();
    expect(root.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('says so when no problem matches', async () => {
    const { root, fixture, flush } = await setup();
    await flush({ items: [], page: 0, size: 10, totalItems: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(root.textContent).toContain('No encontramos problemas');
  });

  it('links to the assigned problems', async () => {
    const { root, flush } = await setup();
    await flush();
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/coach/problemas-asignados');
  });

  describe('quick add by Codeforces code', () => {
    const IMPORTED = problem(99, 'To My Critics', 'CODEFORCES', 'Matemática', '800');
    const addByCode = (fixture: { detectChanges(): void }, root: HTMLElement, code: string) => {
      const input = root.querySelector<HTMLInputElement>('input[aria-label="Código de Codeforces"]')!;
      input.value = code;
      input.dispatchEvent(new Event('input'));
      root.querySelector<HTMLButtonElement>('button[aria-label="Agregar por código"]')!.click();
      fixture.detectChanges();
    };

    it('imports the code and puts the problem into the shared selection', async () => {
      const { fixture, root, store, flush } = await setup();
      await flush();
      addByCode(fixture, root, '1850a');
      const request = http.expectOne('/api/problems/codeforces/import');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ code: '1850A' });
      request.flush({ created: true, problem: IMPORTED });
      fixture.detectChanges();
      expect(store.selected().map((p) => p.id)).toEqual([99]);
      expect(root.querySelector('aside')?.textContent).toContain('To My Critics');
    });

    it('keeps the catalog table and the rest of the selection when a problem is imported', async () => {
      const { fixture, root, store, flush } = await setup();
      await flush();
      store.toggle(PAGE.items[0]);
      addByCode(fixture, root, '1850A');
      http.expectOne('/api/problems/codeforces/import').flush({ created: false, problem: IMPORTED });
      fixture.detectChanges();
      expect(store.selected().map((p) => p.id)).toEqual([1, 99]);
      expect(root.querySelectorAll('tbody tr').length).toBe(3);
    });

    it('does not select the same imported problem twice and says so', async () => {
      const { fixture, root, store, flush } = await setup();
      await flush();
      store.toggle(IMPORTED);
      addByCode(fixture, root, '1850A');
      http.expectOne('/api/problems/codeforces/import').flush({ created: false, problem: IMPORTED });
      fixture.detectChanges();
      expect(store.selected().map((p) => p.id)).toEqual([99]);
      expect(root.textContent).toContain('ya está en tu selección');
    });

    it('shows the import error and selects nothing', async () => {
      const { fixture, root, store, flush } = await setup();
      await flush();
      addByCode(fixture, root, '9999Z');
      http
        .expectOne('/api/problems/codeforces/import')
        .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root.textContent).toContain('El problema no existe en Codeforces');
      expect(store.selected()).toEqual([]);
    });
  });
});
