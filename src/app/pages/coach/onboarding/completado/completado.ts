import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-onboarding-coach-completado',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './completado.html',
  styleUrl: './completado.css',
})
export class OnboardingCoachCompletado {
  protected readonly resumen = [
    'Grafos y Programación Dinámica',
    'Club de Programación Competitiva',
    '4 años de experiencia',
  ];
}
