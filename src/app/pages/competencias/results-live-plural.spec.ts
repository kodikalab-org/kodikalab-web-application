import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ResultsLive } from './results-live';

describe('Official results wording', () => {
  it('writes a single solved problem in singular', () => {
    const params = convertToParamMap({ teamId: '1' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ResultsLive);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/competitions') && r.params.get('teamId') === '1')
      .flush({ teamId: 1, total: 0, items: [] });
    http
      .expectOne((r) => r.url.endsWith('/competitions/teams/1/official-results'))
      .flush([{ id: 1, competitionId: 1, teamId: 1, eventName: 'Final', competitionEndsAt: '2026-10-31T18:00:00Z', finalPosition: 1, solvedProblems: 1, status: 'CONFIRMADO', registeredAt: '', confirmedAt: null }]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('1 problema resuelto');
    expect(text).not.toContain('1 problemas');
  });
});
