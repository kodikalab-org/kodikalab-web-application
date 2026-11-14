import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Session, homeFor } from '../../core/session';
import { HeaderNavigation } from '../header-navigation/header-navigation';
import { UserMenu } from '../user-menu/user-menu';

/** The one site header: logo, navigation and user menu. The role comes from the session. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, MatToolbarModule, HeaderNavigation, UserMenu],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader {
  private readonly session = inject(Session);
  protected readonly coach = computed(() => this.session.account()?.role === 'COACH');
  protected readonly home = computed(() => homeFor(this.coach() ? 'COACH' : 'PRACTICANTE'));
}
