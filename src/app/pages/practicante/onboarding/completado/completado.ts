import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';

@Component({
  selector: 'app-onboarding-completado',
  imports: [AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './completado.html',
  styleUrl: './completado.css',
})
export class OnboardingCompletado {
  protected readonly resumen = [
    'Código 20240001',
    'Ingeniería de Software',
    '5.º ciclo',
    'Nivel Intermedio',
    'Codeforces: camila_cf · rating 1432',
    'AtCoder: camila_r',
    'VJudge: camila_vj',
  ];
  protected readonly resumenAviso = [
    'Código 20240001',
    'Ingeniería de Software',
    '5.º ciclo',
    'Nivel Intermedio',
    'Codeforces sin vincular',
    'AtCoder: camila_r',
    'VJudge: camila_vj',
  ];
  /** Estado de maqueta (`?estado=aviso-codeforces`): Codeforces no confirmó el identificador. */
  protected readonly estado$ = inject(ActivatedRoute).queryParamMap.pipe(
    map((params) => params.get('estado')),
  );
}
