import { Component, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Theme } from './core/theme';
import { Session } from './core/session';
import { ProfileApi } from './core/profile-api';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly profiles = inject(ProfileApi);
  protected readonly theme = inject(Theme);
  constructor() { afterNextRender(() => { this.session.restore(); this.theme.init(); }); }
  protected get privatePage(): boolean {
    return /^\/(inicio|coach|perfil|onboarding|practicante|ranking|progreso|grupos)(\/|\?|$)/.test(this.router.url);
  }
  protected salir(): void {
    this.session.logout();
    this.profiles.reset();
    void this.router.navigateByUrl('/login');
  }
  protected readonly title = signal('kodikalab_application');
}
