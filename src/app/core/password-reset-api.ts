import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './api';

export interface PasswordResetMessage {
  message: string;
}

/**
 * The three public steps of the password reset (`/auth/password-reset/*`): ask for a code by email, check it,
 * and set the new password. None of them needs a token and none of them returns the code.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  request(email: string) {
    return this.post('request', { email });
  }

  verify(email: string, code: string) {
    return this.post('verify', { email, code });
  }

  confirm(email: string, code: string, newPassword: string) {
    return this.post('confirm', { email, code, newPassword });
  }

  private post(step: 'request' | 'verify' | 'confirm', body: Record<string, string>) {
    return this.http.post<PasswordResetMessage>(`${this.url}/auth/password-reset/${step}`, body, { timeout: 15000 });
  }
}
