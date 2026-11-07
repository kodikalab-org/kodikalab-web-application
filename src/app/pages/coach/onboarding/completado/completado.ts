import { Component, inject } from '@angular/core';
import { Session } from '../../../../core/session';
import { ProfileApi } from '../../../../core/profile-api';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
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
  protected get resumen(): string[] {
    if (this.session.demo()) return this.resumenDemo;
    const p = this.profiles.profile();
    return p?.role === 'COACH' ? [p.especialidadPrincipal, p.organizacionClub ?? '', `${p.aniosExperiencia} años de experiencia`].filter(Boolean) : [];
  }
  private readonly resumenDemo = [
    'Grafos y Programación Dinámica',
    'Club de Programación Competitiva',
    '4 años de experiencia',
  ];
}
