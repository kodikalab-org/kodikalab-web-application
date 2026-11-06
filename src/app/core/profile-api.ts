import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, throwError } from 'rxjs';
import { API_URL, CoachRequest, PractitionerRequest, Profile, ProfileResponse } from './api';

export type PlatformKey = 'codeforces' | 'atcoder' | 'vjudge';
export type LinkState = 'VINCULADA' | 'PENDIENTE' | 'SIN_VINCULAR';

/** Codeforces handle the backend could not confirm; the account keeps its previous data. */
export interface PendingLink {
  readonly email: string;
  readonly handle: string;
  readonly notice: string;
}

export interface PlatformStatus {
  readonly key: PlatformKey;
  readonly name: string;
  /** Handle to show: the requested one while pending, the saved one otherwise. */
  readonly handle: string | null;
  /** Handle currently saved in the backend (it can differ from `handle` while pending). */
  readonly savedHandle: string | null;
  readonly state: LinkState;
  readonly notice: string;
  readonly rating: number | null;
}

export const LINK_STATE_LABEL: Record<LinkState, string> = {
  VINCULADA: 'Vinculada',
  PENDIENTE: 'Pendiente',
  SIN_VINCULAR: 'Sin vincular',
};

/** Only these platforms exist in the backend. */
export const SUPPORTED_PLATFORMS: readonly { key: PlatformKey; name: string }[] = [
  { key: 'codeforces', name: 'Codeforces' },
  { key: 'atcoder', name: 'AtCoder' },
  { key: 'vjudge', name: 'VJudge' },
];

const PENDING_NOTICE = 'La plataforma externa no confirmó el identificador; se conservaron los datos previos.';

const sameHandle = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  readonly profile = signal<Profile | null>(null);
  readonly message = signal('');
  /**
   * Pending Codeforces link. The backend has no "pending" state (it just keeps the previous
   * data), so this lives only in memory and is lost on reload; the profile then shows the
   * data the backend really stored.
   */
  readonly pendingLink = signal<PendingLink | null>(null);
  /** Link status per platform, derived from the saved profile and the pending link. */
  readonly platforms = computed<PlatformStatus[]>(() => {
    const p = this.profile();
    if (p?.role !== 'PRACTICANTE') return [];
    const pending = this.pendingLink();
    const saved: Record<PlatformKey, string | null> = {
      codeforces: p.codeforcesHandle, atcoder: p.atcoderHandle, vjudge: p.vjudgeHandle,
    };
    return SUPPORTED_PLATFORMS.map(({ key, name }) => {
      const isPending = key === 'codeforces' && pending?.email === p.email;
      const handle = isPending ? pending!.handle : saved[key];
      const state: LinkState = isPending ? 'PENDIENTE' : handle ? 'VINCULADA' : 'SIN_VINCULAR';
      return {
        key, name, handle, savedHandle: saved[key], state,
        notice: isPending ? pending!.notice : '',
        rating: key === 'codeforces' && state === 'VINCULADA' ? p.codeforcesRating : null,
      };
    });
  });
  /** Backend errors of the last failed wizard save, by backend field, for the step that owns them. */
  draftErrors: Record<string, string> = {};
  // Drafts are kept only for this run of the wizard, not shared between accounts.
  academic = { codigo: '', carrera: '', ciclo: '', distrito: '' };
  competitive = { nivel: null as string | null };
  coach = { especialidad: '', organizacion: '', anios: null as number | null };

  load() {
    return this.http.get<ProfileResponse>(`${this.url}/users/me`, { timeout: 15000 }).pipe(
      tap((response) => {
        this.profile.set(response.profile);
        const pending = this.pendingLink();
        if (pending && response.profile.role === 'PRACTICANTE' && sameHandle(pending.handle, response.profile.codeforcesHandle)) {
          this.pendingLink.set(null);
        }
      }),
    );
  }

  /**
   * Saves the profile. The stored profile is replaced only by a successful response, so a
   * failed request (400, 409, network) leaves the previous data untouched.
   */
  save(body: PractitionerRequest | CoachRequest) {
    return this.http.put<ProfileResponse>(`${this.url}/users/me`, body, { timeout: 15000 }).pipe(
      tap((response) => {
        this.profile.set(response.profile);
        this.message.set(response.message);
        this.reconcileLink(body, response);
      }),
    );
  }

  /** Sends the saved data again with the unconfirmed Codeforces handle. */
  retryPendingLink() {
    const p = this.profile();
    const pending = this.pendingLink();
    if (p?.role !== 'PRACTICANTE' || !pending) {
      return throwError(() => new Error('No hay una vinculación pendiente.'));
    }
    return this.save({
      codigoEstudiante: p.codigoEstudiante, carrera: p.carrera, cicloAcademico: p.cicloAcademico,
      nivelCompetitivo: p.nivelCompetitivo, codeforcesHandle: pending.handle,
      atcoderHandle: p.atcoderHandle, vjudgeHandle: p.vjudgeHandle,
    });
  }

  reset(): void {
    this.profile.set(null);
    this.message.set('');
    this.pendingLink.set(null);
    this.draftErrors = {};
    this.academic = { codigo: '', carrera: '', ciclo: '', distrito: '' };
    this.competitive = { nivel: null };
    this.coach = { especialidad: '', organizacion: '', anios: null };
  }

  /**
   * The backend answers 200 even when Codeforces does not confirm the handle, and then keeps
   * the previous one. A non-empty handle that does not come back means the link is pending.
   */
  private reconcileLink(body: PractitionerRequest | CoachRequest, response: ProfileResponse): void {
    const profile = response.profile;
    const requested = 'codeforcesHandle' in body ? body.codeforcesHandle?.trim() : '';
    if (profile.role !== 'PRACTICANTE' || !requested || sameHandle(requested, profile.codeforcesHandle)) {
      this.pendingLink.set(null);
      return;
    }
    this.pendingLink.set({
      email: profile.email, handle: requested, notice: response.message || PENDING_NOTICE,
    });
  }
}
