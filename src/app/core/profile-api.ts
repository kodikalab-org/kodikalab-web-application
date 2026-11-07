import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL, CoachRequest, PractitionerRequest, Profile, ProfileResponse } from './api';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  readonly profile = signal<Profile | null>(null);
  readonly message = signal('');
  // Drafts are kept only for this run of the wizard, not shared between accounts.
  academic = { codigo: '', carrera: '', ciclo: '', distrito: '' };
  competitive = { nivel: null as string | null };
  coach = { especialidad: '', organizacion: '', anios: null as number | null };

  load() {
    return this.http.get<ProfileResponse>(`${this.url}/users/me`, { timeout: 15000 }).pipe(
      tap((response) => this.profile.set(response.profile)),
    );
  }
  save(body: PractitionerRequest | CoachRequest) {
    return this.http.put<ProfileResponse>(`${this.url}/users/me`, body, { timeout: 15000 }).pipe(
      tap((response) => { this.profile.set(response.profile); this.message.set(response.message); }),
    );
  }
  reset(): void {
    this.profile.set(null);
    this.message.set('');
    this.academic = { codigo: '', carrera: '', ciclo: '', distrito: '' };
    this.competitive = { nivel: null };
    this.coach = { especialidad: '', organizacion: '', anios: null };
  }
}
