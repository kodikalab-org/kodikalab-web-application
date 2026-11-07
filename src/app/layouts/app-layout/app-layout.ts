import { Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { AppHeader } from '../../shared/app-header/app-header';
import { SiteFooter } from '../../shared/site-footer/site-footer';

/** Marco de las pantallas de problemas: misma cabecera y pie que el resto de la app autenticada. */
@Component({
  selector: 'app-app-layout',
  imports: [AppHeader, RouterOutlet, SiteFooter],
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
