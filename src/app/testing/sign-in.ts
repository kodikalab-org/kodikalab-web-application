import { TestBed } from '@angular/core/testing';
import { Profile, Role } from '../core/api';
import { ProfileApi } from '../core/profile-api';
import { Session } from '../core/session';

/**
 * Opens a signed-in session with the profile already loaded, so private routes can be entered
 * in tests without a network round trip.
 */
export function signIn(role: Role = 'PRACTICANTE', profile: Record<string, unknown> = {}): void {
  const email = 'usuario@example.com';
  const session = TestBed.inject(Session);
  session.restore();
  session.account.set({ token: 'test-token', email, role, expiresAt: Date.now() + 3_600_000 });
  TestBed.inject(ProfileApi).profile.set({ role, email, ...profile } as unknown as Profile);
}
