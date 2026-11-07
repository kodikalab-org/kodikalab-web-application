import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SiteFooter } from '../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-grupos-marco',
  imports: [SiteFooter, HeaderNavigation, UserMenu, RouterLink, RouterOutlet, MatToolbarModule],
  templateUrl: './grupos-marco.html',
  styleUrl: './grupos-marco.css',
})
export class GruposMarco {
  protected readonly coach: boolean;
  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
  }
}
