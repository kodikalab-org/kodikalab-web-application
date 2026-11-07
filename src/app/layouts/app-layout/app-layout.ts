import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { HeaderNavigation } from '../../shared/header-navigation/header-navigation';
import { SiteFooter } from '../../shared/site-footer/site-footer';
import { UserMenu } from '../../shared/user-menu/user-menu';

/** Marco de las pantallas de problemas: misma cabecera y pie que el resto de la app autenticada. */
@Component({
  selector: 'app-app-layout',
  imports: [HeaderNavigation, MatToolbarModule, RouterLink, RouterOutlet, SiteFooter, UserMenu],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
  host: { class: 'block' },
})
export class AppLayout {
  protected readonly coach: boolean;
  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
  }
}
