import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { navigationFor } from './core/navigation';
import { Sidebar } from './core/sidebar';
import { HeaderNavigation } from './shared/header-navigation/header-navigation';
import { Session } from './core/session';
import { ProfileApi } from './core/profile-api';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatButtonModule, HeaderNavigation],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly profiles = inject(ProfileApi);
  protected readonly sidebar = inject(Sidebar);
  private readonly viewportScroller = inject(ViewportScroller);
  constructor() {
    this.viewportScroller.setOffset([0, 96]);
    afterNextRender(() => this.session.restore());
  }
  protected get coach(): boolean { return (this.session.demo() ?? this.session.account()?.role) === 'COACH'; }
  protected get enlaces() { return navigationFor(this.coach); }
  protected salir(): void {
    this.sidebar.opened.set(false);
    this.session.logout();
    this.profiles.reset();
    void this.router.navigateByUrl('/login');
  }
  protected readonly title = signal('kodikalab_application');
}
