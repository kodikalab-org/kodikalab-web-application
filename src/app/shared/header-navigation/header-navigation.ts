import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HEADER_LINK_COUNT, navigationFor } from '../../core/navigation';

/**
 * Main header links. From the `xl` breakpoint up they are an inline nav; below it they collapse into an
 * icon button that opens the same links in a menu, so laptops and phones still reach every section.
 */
@Component({
  selector: 'app-header-navigation',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatMenuModule, MatTooltipModule],
  templateUrl: './header-navigation.html',
  styleUrl: './header-navigation.css',
  host: { class: 'inline-flex shrink-0 items-center' },
})
export class HeaderNavigation {
  @Input() coach = false;
  protected get enlaces() { return navigationFor(this.coach).slice(0, HEADER_LINK_COUNT); }
}
