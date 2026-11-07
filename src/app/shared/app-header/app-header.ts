import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { HeaderNavigation } from '../header-navigation/header-navigation';
import { UserMenu } from '../user-menu/user-menu';

/** Site header shared by the pages that use the top navigation. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, MatToolbarModule, HeaderNavigation, UserMenu],
  templateUrl: './app-header.html',
})
export class AppHeader {
  @Input() coach = false;
}
