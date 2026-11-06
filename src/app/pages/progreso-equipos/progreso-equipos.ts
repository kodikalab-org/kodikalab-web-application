import { inject as injectSession } from '@angular/core';
import { Session } from '../../core/session';
import { ProgressLive } from './progress-live';
import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';

@Component({
  selector: 'app-progreso-equipos',
  imports: [ProgressLive,AsyncPipe, RouterLink, MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './progreso-equipos.html',
  styleUrl: './progreso-equipos.css',
})
export class ProgresoEquipos {
  readonly session = injectSession(Session);
  protected readonly estado$;
  // Solo alterna dos frames de demostración: no consulta ni calcula progreso real.
  protected readonly contexto$;
  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(map((params) => params.get('estado') ?? ''));
    this.contexto$ = route.queryParamMap.pipe(
      map((params) => (params.get('equipo') === 'grafos-dp' ? this.grafos : this.alfa)),
    );
  }
  private readonly alfa = {
    nombre: 'Equipo Alfa',
    destino: 'grafos-dp',
    otro: 'Grafos y DP',
    indicadores: [
      { etiqueta: 'Problemas asignados', valor: '14', ayuda: 'en Equipo Alfa' },
      { etiqueta: 'Resueltos', valor: '7', ayuda: 'resoluciones independientes' },
      { etiqueta: 'Cobertura', valor: '50%', ayuda: 'de este equipo' },
      { etiqueta: 'Pendientes', valor: '7', ayuda: 'sin transferir otros avances' },
    ],
    actividad: [
      { problema: 'Theatre Square · CF-1A', plataforma: 'Codeforces', estado: 'Resuelto' },
      { problema: 'Camino mínimo en grilla', plataforma: 'AtCoder', estado: 'Sin iniciar' },
      { problema: 'Mochila con repeticiones', plataforma: 'CSES', estado: 'Sin iniciar' },
    ],
  };
  private readonly grafos = {
    nombre: 'Grafos y DP',
    destino: 'alfa',
    otro: 'Equipo Alfa',
    indicadores: [
      { etiqueta: 'Problemas asignados', valor: '10', ayuda: 'en Grafos y DP' },
      { etiqueta: 'Resueltos', valor: '3', ayuda: 'resoluciones independientes' },
      { etiqueta: 'Cobertura', valor: '30%', ayuda: 'de este equipo' },
      { etiqueta: 'Pendientes', valor: '7', ayuda: 'sin transferir otros avances' },
    ],
    actividad: [
      { problema: 'Theatre Square · CF-1A', plataforma: 'Codeforces', estado: 'Sin resolver' },
      { problema: 'Camino mínimo en grilla', plataforma: 'AtCoder', estado: 'Resuelto' },
      { problema: 'Mochila con repeticiones', plataforma: 'CSES', estado: 'Sin iniciar' },
    ],
  };
}
