import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavLink, HEADER_LINK_COUNT, navigationFor, profileMenuFor } from '../../core/navigation';
import { ProfileApi } from '../../core/profile-api';
import { Session } from '../../core/session';

export interface UserMenuLink extends NavLink {
  queryParams?: Record<string, string>;
}

/**
 * Avatar button with the account dropdown. It replaces the old sidebar: below the `xl`
 * breakpoint it also lists the header links, and it always lists progress, ranking,
 * platforms and the profile pages.
 */
@Component({
  selector: 'app-user-menu',
  imports: [RouterLink, MatButtonModule, MatMenuModule, MatTooltipModule],
  templateUrl: './user-menu.html',
  host: { class: 'inline-flex shrink-0' },
})
export class UserMenu {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);

  @Input() coach = false;
  @Input() iniciales = '';
  @Input() nombre = '';
  /** Extra links shown only in the demo (for example the "with activity" toggle). */
  @Input() extras: UserMenuLink[] = [];

  // Material renders menus in the CDK overlay, outside this component's host.
  protected readonly clasesMenu =
    'bg-kl-surface text-kl-text rounded-2xl border border-solid border-kl-border-strong shadow-[0_16px_48px_#00000099] max-w-[calc(100vw-24px)] [--mat-menu-container-color:var(--kl-surface)] [--mat-menu-item-label-text-size:14px] [--mat-menu-item-label-text-weight:400] [--mat-menu-item-hover-state-layer-color:var(--kl-accent)] [--mat-menu-item-focus-state-layer-color:var(--kl-accent)] [&_.mat-mdc-menu-item]:min-h-11 [&_.mat-mdc-menu-item]:text-kl-text [&_.mat-mdc-menu-item:hover]:bg-kl-accent/15 [&_.mat-mdc-menu-item:focus-visible]:bg-kl-accent/20';

  protected get headerLinks(): NavLink[] { return navigationFor(this.coach).slice(0, HEADER_LINK_COUNT); }
  protected get accountLinks(): NavLink[] { return profileMenuFor(this.coach); }
  protected get settingsPath(): string { return this.coach ? '/coach/perfil' : '/perfil'; }
  protected get onboardingPath(): string {
    return this.coach ? '/onboarding/coach/experiencia' : '/onboarding/practicante/datos-academicos';
  }
  protected get displayName(): string {
    if (this.nombre) return this.nombre;
    if (this.session.demo()) return this.coach ? 'Marco' : 'Camila';
    return this.session.account()?.email ?? 'Usuario';
  }
  protected get displayInitials(): string {
    if (this.iniciales) return this.iniciales;
    if (this.session.demo()) return this.coach ? 'MP' : 'CR';
    return 'KL';
  }

  protected salir(): void {
    this.session.logout();
    this.profiles.reset();
    void this.router.navigateByUrl('/login');
  }
}
