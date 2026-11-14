import { Component, inject } from '@angular/core';
import { Session } from '../../core/session';
import { HeaderNavigation } from '../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../shared/user-menu/user-menu';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  selector: 'app-recursos-academicos',
  imports: [SiteFooter, HeaderNavigation, UserMenu, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './recursos-academicos.html',
  styleUrl: './recursos-academicos.css',
})
export class RecursosAcademicos {
  protected readonly session = inject(Session);
  protected get coach(): boolean { return this.session.account()?.role === 'COACH'; }
}
