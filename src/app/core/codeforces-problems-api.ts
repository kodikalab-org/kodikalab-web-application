import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL, fieldErrors, isConnectionError } from './api';
import { CatalogProblem } from './problems-api';

/** Import and search of Codeforces problems: only the backend contacts Codeforces. */

/** `POST /problems/codeforces/import`: the problem now lives in the catalog (`created` is false when it already did). */
export interface CodeforcesImportResponse {
  created: boolean;
  problem: CatalogProblem;
}

/** One hit of `GET /problems/codeforces/search`; `problemId` is null until the problem is imported. */
export interface CodeforcesSearchResult {
  code: string;
  title: string;
  difficultyRating: number | null;
  topics: string[];
  url: string;
  problemId: number | null;
}

export const SEARCH_LIMIT = 20;

const CODEFORCES_URL =
  /codeforces\.com\/(?:contest|gym|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Za-z][A-Za-z0-9]*)/i;
const CODEFORCES_CODE = /^(\d+)\s*([A-Za-z][A-Za-z0-9]*)$/;

/** `1850A` from a code ("1850a", "1850 A") or from a problem URL; null when the text is neither. */
export function codeforcesCodeFrom(text: string): string | null {
  const value = (text ?? '').trim();
  const match = CODEFORCES_URL.exec(value) ?? CODEFORCES_CODE.exec(value);
  return match ? `${match[1]}${match[2].toUpperCase()}` : null;
}

/** Error text of the import: the backend's `code` error on 400, fixed messages for 404 and 503. */
export function codeforcesImportError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 404) return 'El problema no existe en Codeforces';
    if (error.status === 503)
      return 'Codeforces no está disponible por ahora. Inténtalo de nuevo en unos minutos.';
    if (error.status === 400)
      return fieldErrors(error)['code'] ?? 'El código no es válido. Usa un formato como 1850A.';
    if (isConnectionError(error)) return 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class CodeforcesProblemsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  /** Brings a Codeforces problem into the catalog by its code (for example `1850A`). */
  importByCode(code: string) {
    return this.http.post<CodeforcesImportResponse>(
      `${this.url}/problems/codeforces/import`,
      { code },
      { timeout: 30000 },
    );
  }

  /** Searches the Codeforces problemset by title or code. */
  search(query: string, limit = SEARCH_LIMIT) {
    const params = new HttpParams().set('q', query.trim()).set('limit', limit);
    return this.http
      .get<CodeforcesSearchResult[] | { items: CodeforcesSearchResult[] }>(
        `${this.url}/problems/codeforces/search`,
        { params, timeout: 30000 },
      )
      .pipe(map((result) => (Array.isArray(result) ? result : (result.items ?? []))));
  }
}
