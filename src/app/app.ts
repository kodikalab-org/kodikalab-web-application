import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { HeaderNavigation } from './shared/header-navigation/header-navigation';
import { UserMenu } from './shared/user-menu/user-menu';
import { Session } from './core/session';

@Component({
  imports: [RouterOutlet, RouterLink, HeaderNavigation, UserMenu],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);
  constructor() {
    this.viewportScroller.setOffset([0, 96]);
    afterNextRender(() => this.session.restore());
  }
  protected readonly title = signal('kodikalab_application');
}
