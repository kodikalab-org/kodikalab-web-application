import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../core/api';
import type { CatalogProblem } from '../../core/problems-api';
import { ProblemPicker } from './problem-picker';
import { PALETTE, letterFor, moveRow, toAssignItems, type PickedProblem } from './picked-problems';

function problem(id: number, code: string, title: string): CatalogProblem {
  return {
    id,
    title,
    url: `https://codeforces.com/problemset/problem/${code.replace(/\D+$/, '')}/${code.replace(/^\d+/, '')}`,
    sourcePlatform: 'CODEFORCES',
    sourceCode: code,
    difficultyRating: '800',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    topics: [{ id: 1, name: 'math' }],
  };
}

const A = problem(11, '1850A', 'To My Critics');
const B = problem(12, '1850B', 'Ten Words of Wisdom');
const C = problem(13, '1850C', 'Word on the Paper');

describe('picked problems helpers', () => {
  it('names the letters A to Z and then AA, AB', () => {
    expect([0, 1, 25, 26, 27].map(letterFor)).toEqual(['A', 'B', 'Z', 'AA', 'AB']);
  });

  it('moves a row one position and keeps the letters in order', () => {
    const rows: PickedProblem[] = [A, B, C].map((p, i) => ({
      problem: p,
      letter: letterFor(i),
      score: 1,
      balloonColor: PALETTE[i],
    }));
    const moved = moveRow(rows, 2, -1);
    expect(moved.map((r) => [r.letter, r.problem.id])).toEqual([
      ['A', 11],
      ['B', 13],
      ['C', 12],
    ]);
    expect(moveRow(rows, 0, -1)).toBe(rows);
    expect(moveRow(rows, 2, 1)).toBe(rows);
  });

  it('builds the assignment items with upper case colors', () => {
    const items = toAssignItems([{ problem: A, letter: 'A', score: 100, balloonColor: '#ff0000' }]);
    expect(items).toEqual([{ problemId: 11, letter: 'A', score: 100, balloonColor: '#FF0000' }]);
  });
});

describe('ProblemPicker', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ProblemPicker],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProblemPicker);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const picker = fixture.componentInstance;
    const type = (label: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const click = (selector: string) => {
      root.querySelector<HTMLButtonElement>(selector)!.click();
      fixture.detectChanges();
    };
    const importRequest = () => http.expectOne('/api/problems/codeforces/import');
    const addByCode = (code: string) => {
      type('Código de Codeforces', code);
      click('button[aria-label="Agregar por código"]');
    };
    const letters = () => picker.rows().map((r) => r.letter + ':' + r.problem.id);
    const text = () => root.textContent ?? '';
    return { fixture, root, picker, type, click, importRequest, addByCode, letters, text };
  }

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('adds a problem by its Codeforces code with letter A, default score and the first palette color', () => {
    const { picker, addByCode, importRequest, fixture, text } = setup();
    addByCode(' 1850a ');
    const request = importRequest();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: '1850A' });
    request.flush({ created: true, problem: A });
    fixture.detectChanges();
    expect(picker.rows()).toEqual([
      { problem: A, letter: 'A', score: 1, balloonColor: PALETTE[0] },
    ]);
    expect(text()).toContain('To My Critics');
  });

  it('accepts a Codeforces problem URL and sends the normalized code', () => {
    const { addByCode, importRequest } = setup();
    addByCode('https://codeforces.com/contest/1850/problem/B');
    expect(importRequest().request.body).toEqual({ code: '1850B' });
  });

  it('does not call the backend for text that is not a code', () => {
    const { addByCode, fixture, text } = setup();
    addByCode('hola');
    http.expectNone('/api/problems/codeforces/import');
    fixture.detectChanges();
    expect(text()).toContain('código válido');
  });

  it('rejects a duplicate problem with a message and keeps one row', () => {
    const { picker, addByCode, importRequest, fixture, text } = setup();
    addByCode('1850A');
    importRequest().flush({ created: true, problem: A });
    addByCode('1850A');
    importRequest().flush({ created: false, problem: A });
    fixture.detectChanges();
    expect(picker.rows().length).toBe(1);
    expect(text()).toContain('Ese problema ya está en la lista');
  });

  it('uses the default score of the input for new rows', () => {
    const { picker, addByCode, importRequest, fixture } = setup();
    fixture.componentRef.setInput('defaultScore', 100);
    fixture.detectChanges();
    addByCode('1850A');
    importRequest().flush({ created: true, problem: A });
    expect(picker.rows()[0].score).toBe(100);
  });

  it('recomputes the letters when a row moves up or down or is removed', () => {
    const { picker, click, addByCode, importRequest, fixture, letters } = setup();
    for (const [code, p] of [
      ['1850A', A],
      ['1850B', B],
      ['1850C', C],
    ] as const) {
      addByCode(code);
      importRequest().flush({ created: true, problem: p });
    }
    fixture.detectChanges();
    expect(letters()).toEqual(['A:11', 'B:12', 'C:13']);
    click('button[aria-label="Subir Word on the Paper"]');
    expect(letters()).toEqual(['A:11', 'B:13', 'C:12']);
    click('button[aria-label="Bajar To My Critics"]');
    expect(letters()).toEqual(['A:13', 'B:11', 'C:12']);
    click('button[aria-label="Quitar Word on the Paper"]');
    fixture.detectChanges();
    expect(letters()).toEqual(['A:11', 'B:12']);
    expect(picker.rows().map((r) => r.balloonColor)).toEqual([PALETTE[0], PALETTE[1]]);
  });

  it('edits the score and the balloon color of a row', () => {
    const { picker, root, addByCode, importRequest, fixture } = setup();
    addByCode('1850A');
    importRequest().flush({ created: true, problem: A });
    fixture.detectChanges();
    const score = root.querySelector<HTMLInputElement>(
      'input[aria-label="Puntos de To My Critics"]',
    )!;
    score.value = '250';
    score.dispatchEvent(new Event('input'));
    const color = root.querySelector<HTMLInputElement>(
      'input[aria-label="Color del globo de To My Critics"]',
    )!;
    color.value = '#00ff00';
    color.dispatchEvent(new Event('input'));
    expect(picker.rows()[0]).toMatchObject({ score: 250, balloonColor: '#00ff00' });
  });

  it('shows the 404, 503 and 400 messages of the import and keeps the typed code', () => {
    const { addByCode, importRequest, fixture, text, root } = setup();
    addByCode('9999Z');
    importRequest().flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(text()).toContain('El problema no existe en Codeforces');
    expect(
      root.querySelector<HTMLInputElement>('input[aria-label="Código de Codeforces"]')!.value,
    ).toBe('9999Z');
    addByCode('9999Z');
    importRequest().flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(text()).toContain('Codeforces no está disponible');
    addByCode('9999Z');
    importRequest().flush(
      { message: 'datos', errors: { code: 'El código del problema no es válido' } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(text()).toContain('El código del problema no es válido');
  });

  it('stops at 26 problems', () => {
    const { picker, addByCode, importRequest, fixture, text } = setup();
    picker.rows.set(
      Array.from({ length: 26 }, (_, i) => ({
        problem: problem(100 + i, `1${i}A`, `P${i}`),
        letter: letterFor(i),
        score: 1,
        balloonColor: PALETTE[i],
      })),
    );
    fixture.detectChanges();
    addByCode('1850A');
    importRequest().flush({ created: true, problem: A });
    fixture.detectChanges();
    expect(picker.rows().length).toBe(26);
    expect(text()).toContain('Máximo 26 problemas');
  });

  describe('Codeforces search', () => {
    const HITS = [
      {
        code: '20C',
        title: 'Dijkstra?',
        difficultyRating: 1900,
        topics: ['graphs'],
        url: 'https://codeforces.com/problemset/problem/20/C',
        problemId: null,
      },
      {
        code: '1850A',
        title: 'To My Critics',
        difficultyRating: 800,
        topics: ['math'],
        url: 'https://codeforces.com/problemset/problem/1850/A',
        problemId: 11,
      },
    ];
    const searchRequest = () => http.expectOne((r) => r.url === '/api/problems/codeforces/search');

    it('waits 300 ms and 2 characters before searching and sends the latest text only', () => {
      vi.useFakeTimers();
      const { type } = setup();
      type('Buscar en Codeforces', 'd');
      vi.advanceTimersByTime(500);
      http.expectNone((r) => r.url === '/api/problems/codeforces/search');
      type('Buscar en Codeforces', 'di');
      vi.advanceTimersByTime(299);
      http.expectNone((r) => r.url === '/api/problems/codeforces/search');
      type('Buscar en Codeforces', 'dij');
      vi.advanceTimersByTime(299);
      http.expectNone((r) => r.url === '/api/problems/codeforces/search');
      vi.advanceTimersByTime(1);
      const request = searchRequest();
      expect(request.request.params.get('q')).toBe('dij');
      expect(request.request.params.get('limit')).toBe('20');
      request.flush([]);
    });

    it('lists the results and imports the ones that are not in the catalog yet', () => {
      vi.useFakeTimers();
      const { type, click, picker, fixture, root, importRequest } = setup();
      type('Buscar en Codeforces', 'dijkstra');
      vi.advanceTimersByTime(300);
      searchRequest().flush(HITS);
      fixture.detectChanges();
      const items = root.querySelectorAll('[aria-label="Resultados de la búsqueda"] li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('20C');
      expect(items[0].textContent).toContain('Dijkstra?');
      click('button[aria-label="Agregar 20C"]');
      const request = importRequest();
      expect(request.request.body).toEqual({ code: '20C' });
      request.flush({ created: true, problem: problem(21, '20C', 'Dijkstra?') });
      fixture.detectChanges();
      expect(picker.rows().map((r) => r.problem.id)).toEqual([21]);
    });

    it('adds a result that already has a problem id without importing it again', () => {
      vi.useFakeTimers();
      const { type, click, picker, fixture } = setup();
      type('Buscar en Codeforces', 'critics');
      vi.advanceTimersByTime(300);
      searchRequest().flush(HITS);
      fixture.detectChanges();
      click('button[aria-label="Agregar 1850A"]');
      http.expectNone('/api/problems/codeforces/import');
      expect(picker.rows().map((r) => [r.letter, r.problem.id, r.problem.sourceCode])).toEqual([
        ['A', 11, '1850A'],
      ]);
    });

    it('explains when Codeforces cannot be searched', () => {
      vi.useFakeTimers();
      const { type, fixture, text } = setup();
      type('Buscar en Codeforces', 'dijkstra');
      vi.advanceTimersByTime(300);
      searchRequest().flush({}, { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      expect(text()).toContain('Codeforces no está disponible');
    });
  });

  describe('KodikaLab catalog', () => {
    it('searches the existing catalog and adds from it', () => {
      vi.useFakeTimers();
      const { click, type, picker, fixture, root } = setup();
      click('button[role="tab"][data-source="catalogo"]');
      type('Buscar en el catálogo', 'critics');
      vi.advanceTimersByTime(300);
      const request = http.expectOne((r) => r.url === '/api/problems');
      expect(request.request.params.get('q')).toBe('critics');
      expect(request.request.params.get('size')).toBe('20');
      request.flush({ items: [A], page: 0, size: 20, totalItems: 1, totalPages: 1 });
      fixture.detectChanges();
      expect(root.querySelectorAll('[aria-label="Resultados de la búsqueda"] li').length).toBe(1);
      click('button[aria-label="Agregar 1850A"]');
      http.expectNone('/api/problems/codeforces/import');
      expect(picker.rows().map((r) => r.problem.id)).toEqual([11]);
    });
  });
});
