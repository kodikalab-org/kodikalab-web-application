import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Sidebar } from '../../core/sidebar';
import { navigationFor } from '../../core/navigation';

@Component({
  selector: 'app-header-navigation',
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  templateUrl: './header-navigation.html',
  styleUrl: './header-navigation.css',
  host: { class: 'inline-flex shrink-0 items-center' },
})
export class HeaderNavigation {
  @Input() coach = false;
  protected readonly sidebar = inject(Sidebar);
  protected get enlaces() { return navigationFor(this.coach).slice(0, 5); }
  abrirSidebar(): void { this.sidebar.opened.set(true); }
}
