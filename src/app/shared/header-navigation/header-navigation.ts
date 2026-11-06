import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HEADER_LINK_COUNT, navigationFor } from '../../core/navigation';

@Component({
  selector: 'app-header-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header-navigation.html',
  styleUrl: './header-navigation.css',
  host: { class: 'inline-flex shrink-0 items-center' },
})
export class HeaderNavigation {
  @Input() coach = false;
  protected get enlaces() { return navigationFor(this.coach).slice(0, HEADER_LINK_COUNT); }
}
