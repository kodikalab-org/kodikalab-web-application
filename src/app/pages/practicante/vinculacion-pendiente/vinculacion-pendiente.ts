import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../../core/api';
import { ProfileApi } from '../../../core/profile-api';

/**
 * Notice for a Codeforces link the backend could not confirm, with the button to retry it.
 * The retry sends the saved profile again; the pending state lives in ProfileApi (memory only).
 */
@Component({
  selector: 'app-vinculacion-pendiente',
  imports: [MatButtonModule],
  templateUrl: './vinculacion-pendiente.html',
  styleUrl: './vinculacion-pendiente.css',
})
export class VinculacionPendiente {
  private readonly profiles = inject(ProfileApi);
  protected readonly pendiente = computed(() =>
    this.profiles.platforms().find((platform) => platform.state === 'PENDIENTE') ?? null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Handle confirmed by the last successful retry, shown until the page changes. */
  protected readonly confirmada = signal<string | null>(null);
  /** True after a retry that the platform still did not confirm. */
  protected readonly sigue = signal(false);

  protected async reintentar(): Promise<void> {
    const pendiente = this.pendiente();
    if (this.busy() || !pendiente) return;
    this.busy.set(true);
    this.error.set('');
    this.confirmada.set(null);
    this.sigue.set(false);
    try {
      await firstValueFrom(this.profiles.retryPendingLink());
      if (this.pendiente()) this.sigue.set(true);
      else this.confirmada.set(pendiente.handle);
    } catch (error) {
      this.error.set(apiError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
