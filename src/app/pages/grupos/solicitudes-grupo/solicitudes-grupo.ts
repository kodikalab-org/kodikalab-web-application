import { AsyncPipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { map } from 'rxjs';
import { InicioDashboard } from '../../inicio-dashboard/inicio-dashboard';

@Component({
  selector: 'app-solicitudes-grupo',
  imports: [AsyncPipe, A11yModule, RouterLink, MatButtonModule, InicioDashboard],
  templateUrl: './solicitudes-grupo.html',
  styleUrl: './solicitudes-grupo.css',
})
export class SolicitudesGrupo {
  protected readonly aceptada$;
  constructor(route: ActivatedRoute) {
    this.aceptada$ = route.queryParamMap.pipe(map((params) => params.get('vista') === 'aceptada'));
  }
}
