import { Component, inject } from '@angular/core';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { profileIdentity } from '../../../../core/profile-identity';
import { plural } from '../../../../shared/plural';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-onboarding-coach-completado',
  imports: [SiteFooter, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './completado.html',
  styleUrl: './completado.css',
})
export class OnboardingCoachCompletado {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  /** Header identity: the saved profile name when there is one, otherwise the account email. */
  protected get cuenta() {
    if (this.session.demo()) return { name: 'Marco Paredes', initials: 'MP' };
    const email = this.session.account()?.email ?? '';
    return profileIdentity(this.profiles.profile()?.fullName, email, email);
  }
  protected get resumen(): string[] {
    if (this.session.demo()) return this.resumenDemo;
    const p = this.profiles.profile();
    return p?.role === 'COACH' ? [p.especialidadPrincipal, p.organizacionClub ?? '', `${plural(p.aniosExperiencia, 'año')} de experiencia`].filter(Boolean) : [];
  }
  private readonly resumenDemo = [
    'Grafos y Programación Dinámica',
    'Club de Programación Competitiva',
    '4 años de experiencia',
  ];
}
