import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HEADER_LINK_COUNT, NavLink, navigationFor } from '../../core/navigation';

export type FooterAudience = 'public' | 'practicante' | 'coach';

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

/** Sections of the landing page, reachable from every footer. */
const ABOUT_LINKS: NavLink[] = [
  { label: 'Acerca de Kodikalab', path: '/', fragment: 'inicio' },
  { label: 'Características', path: '/', fragment: 'caracteristicas' },
  { label: 'Comunidad', path: '/', fragment: 'comunidad' },
  { label: 'Planes', path: '/', fragment: 'precios' },
];

/** The footer columns for each audience. Signed-in links come from the same list as the header and the user menu. */
export function footerColumns(audience: FooterAudience): FooterColumn[] {
  if (audience === 'public') {
    return [
      { title: 'Plataforma', links: ABOUT_LINKS },
      {
        title: 'Tu cuenta',
        links: [
          { label: 'Iniciar sesión', path: '/login' },
          { label: 'Crear cuenta', path: '/registro' },
          { label: 'Recuperar contraseña', path: '/recuperar-contrasena' },
        ],
      },
      {
        title: 'Pruébala',
        links: [
          { label: 'Demo para practicantes', path: '/demo/practicante' },
          { label: 'Demo para coaches', path: '/demo/coach' },
        ],
      },
    ];
  }
  const coach = audience === 'coach';
  const links = navigationFor(coach);
  return [
    { title: 'Plataforma', links: links.slice(0, HEADER_LINK_COUNT) },
    { title: coach ? 'Seguimiento' : 'Mi progreso', links: links.slice(HEADER_LINK_COUNT, -2) },
    { title: 'Tu cuenta', links: links.slice(-2) },
    { title: 'Sobre Kodikalab', links: ABOUT_LINKS },
  ];
}

/**
 * The one footer of the app. `full` is the page footer (brand, link columns and legal row) and `compact` is the
 * two-line legal footer for the sign-in, registration and onboarding cards, where a tall footer would not fit.
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  host: { class: 'block' },
})
export class SiteFooter {
  readonly variant = input<'full' | 'compact'>('full');
  readonly audience = input<FooterAudience>('public');

  protected readonly columns = computed(() => footerColumns(this.audience()));
  protected readonly home = computed(() => {
    const audience = this.audience();
    return audience === 'coach' ? '/coach/inicio' : audience === 'practicante' ? '/inicio' : '/';
  });
}
