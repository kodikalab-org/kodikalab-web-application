import { Component, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Session } from './core/session';
import { ProfileApi } from './core/profile-api';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly profiles = inject(ProfileApi);
  constructor() { afterNextRender(() => this.session.restore()); }
  protected get privatePage(): boolean {
    return /^\/(inicio|coach|perfil|onboarding|practicante)(\/|\?|$)/.test(this.router.url);
  }
  protected salir(): void {
    this.session.logout();
    this.profiles.reset();
    void this.router.navigateByUrl('/login');
  }
  protected readonly title = signal('kodikalab_application');
}
